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

_CHUNK = 1024 * 1024  # 1 MiB streaming chunk


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
    return {"status": "ok"}


@app.post("/analyze", response_model=CallReport, dependencies=[Depends(require_api_key)])
async def analyze_upload(file: UploadFile = File(...)) -> CallReport:
    s = get_settings()
    max_bytes = s.max_upload_mb * 1024 * 1024
    workdir = tempfile.mkdtemp(prefix="call_")
    # basename() strips any path components in the client-supplied filename (traversal guard).
    path = os.path.join(workdir, os.path.basename(file.filename or "audio.wav"))
    try:
        written = 0
        with open(path, "wb") as f:
            while chunk := await file.read(_CHUNK):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"upload exceeds {s.max_upload_mb} MB limit",
                    )
                f.write(chunk)
        return await run_in_threadpool(analyze_call, path)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
