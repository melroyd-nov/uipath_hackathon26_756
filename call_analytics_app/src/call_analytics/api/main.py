"""FastAPI service.

    uvicorn call_analytics.api.main:app --host 127.0.0.1 --port 8000

Bind to 127.0.0.1 (not 0.0.0.0): the ngrok agent runs locally and reaches
localhost, so the tunnel still works while the server is NOT exposed on the LAN.

Endpoints:
    GET  /health   -> {"status": "ok"}                    (open, no auth — liveness only)
    POST /analyze  -> multipart file upload -> CallReport  (requires X-API-Key header)

Security:
    * X-API-Key shared-secret auth on /analyze (fails closed if API_KEY unset).
    * Swagger/OpenAPI docs disabled so the CallReport schema isn't public.
    * Upload size capped (MAX_UPLOAD_MB) and streamed to disk, not buffered in RAM.
    * Upload filename is basename-sanitized to block path traversal.
    * /analyze-path removed — it allowed arbitrary server-side file access.
"""
from __future__ import annotations

import os
import secrets
import shutil
import tempfile
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from ..pipeline import analyze_call
from ..schemas import CallReport
from ..settings import get_settings
from . import sessions as S
# Shared single-GPU concurrency gate lives in `sessions` so both the legacy
# /analyze path and the per-step session path serialize on the same semaphore
# (only `api_max_concurrency` GPU steps run at once; overflow handling per
# api_max_queue, < 0 = unbounded/never reject). See sessions.py for the rationale.
from .sessions import STORE, STEP_ORDER, _admit, _release, _gpu_sem, _MAX_INFLIGHT, _MAX_CONCURRENCY, inflight

_CHUNK = 1024 * 1024  # 1 MiB streaming chunk


async def _stream_upload(file: UploadFile, dest_path: str, max_bytes: int, max_mb: int) -> None:
    """Stream an upload to disk with a size cap (413 on overflow). Shared by /analyze and /sessions."""
    written = 0
    with open(dest_path, "wb") as f:
        while chunk := await file.read(_CHUNK):
            written += len(chunk)
            if written > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"upload exceeds {max_mb} MB limit",
                )
            f.write(chunk)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the heavy audio models once at startup (best-effort).
    try:
        from ..models_runtime import warmup
        await run_in_threadpool(warmup)
    except Exception as e:  # don't block startup if GPU/models unavailable
        print(f"[warmup] skipped: {e}")
    yield


# Docs endpoints disabled so the API schema (CallReport shape) isn't publicly browsable.
app = FastAPI(
    title="Call Analytics",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Reject requests lacking the shared secret. Fails closed if no key is configured."""
    expected = get_settings().api_key
    if not expected:
        # Refuse to serve rather than run wide-open if the operator forgot to set a key.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="server missing API_KEY configuration",
        )
    if not x_api_key or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or missing X-API-Key",
        )


@app.get("/health")
def health() -> dict:
    # in-flight count is read without the lock — a momentarily stale int is fine for liveness.
    return {
        "status": "ok",
        "gpu_inflight": inflight(),
        "max_concurrency": _MAX_CONCURRENCY,
        "max_inflight": _MAX_INFLIGHT if _MAX_INFLIGHT is not None else "unbounded",
    }


@app.post("/analyze", response_model=CallReport, dependencies=[Depends(require_api_key)])
async def analyze_upload(file: UploadFile = File(...)) -> CallReport:
    """Legacy one-shot: run the whole pipeline behind one opaque call. Kept for local
    CLI/testing and the currently-deployed agent. The per-step session API below gives
    granular trace spans; this path does not."""
    s = get_settings()
    max_bytes = s.max_upload_mb * 1024 * 1024
    # Admission control first: reject excess before doing any upload work.
    await _admit()
    workdir = tempfile.mkdtemp(prefix="call_")
    # basename() strips any path components in the client-supplied filename (traversal guard).
    path = os.path.join(workdir, os.path.basename(file.filename or "audio.wav"))
    try:
        await _stream_upload(file, path, max_bytes, s.max_upload_mb)
        # Serialize the GPU-bound work on the shared semaphore.
        async with _gpu_sem:
            return await run_in_threadpool(analyze_call, path)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
        await _release()


# ---------------------------------------------------------------------------------
# Per-step session API — the cloud LangGraph drives the pipeline one step at a time
# so each step is its own Orchestrator trace span. Heavy state stays here in the
# session; only each step's compact JSON projection crosses the tunnel.
# ---------------------------------------------------------------------------------

@app.post("/sessions", dependencies=[Depends(require_api_key)])
async def create_session(file: UploadFile = File(...)) -> dict:
    """Upload the audio once and open a session. No compute yet — `load_audio` is its
    own step/span. Returns the session id and the canonical step order to walk."""
    s = get_settings()
    max_bytes = s.max_upload_mb * 1024 * 1024
    workdir = tempfile.mkdtemp(prefix="callsess_")
    path = os.path.join(workdir, os.path.basename(file.filename or "audio.wav"))
    try:
        await _stream_upload(file, path, max_bytes, s.max_upload_mb)
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise
    sid = await STORE.create(path, workdir)
    return {"session_id": sid, "steps": STEP_ORDER}


@app.post("/sessions/{session_id}/steps/{step}", dependencies=[Depends(require_api_key)])
async def run_step(session_id: str, step: str) -> dict:
    """Run one pipeline step against the session and return its JSON projection."""
    return await STORE.run_step(session_id, step)


@app.post("/sessions/{session_id}/finalize", response_model=CallReport,
          dependencies=[Depends(require_api_key)])
async def finalize_session(session_id: str) -> CallReport:
    """Build the CallReport from accumulated session state, write local artifacts,
    and drop the session."""
    return await STORE.finalize(session_id)


@app.delete("/sessions/{session_id}", dependencies=[Depends(require_api_key)])
async def delete_session(session_id: str) -> dict:
    """Best-effort cleanup (failure path / abandoned runs)."""
    await STORE.delete(session_id)
    return {"deleted": session_id}
