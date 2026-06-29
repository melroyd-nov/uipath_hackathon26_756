"""Session + per-step transport around the call-analytics pipeline.

The cloud LangGraph wants one trace span per pipeline step (transcribe, diarize,
…), with that step's output captured as JSON. But the heavy intermediate state —
the decoded ``audio`` waveform, ``words``, ``attributed_turns`` — must NOT cross
the ngrok tunnel on every step. So we keep that state here, in a per-job
**session** keyed by ``session_id``: the cloud graph drives the pipeline one step
at a time by reference, and each call returns only a compact JSON *projection* of
what the step produced (which is what lands in the trace).

This is a thin transport: the actual work is the existing ``n_*`` node functions
from :mod:`call_analytics.graph`, reused verbatim. No pipeline logic is duplicated.

Concurrency: the GPU is single. ``_gpu_sem`` serializes the heavy work so that at
most ``api_max_concurrency`` steps run at once, *globally*, regardless of how many
sessions are open. A session parked between steps holds only CPU RAM (its state
dict), not the GPU — so many BPMN instances can be in flight and interleave, and
VRAM stays bounded (the fix for the 8-instance OOM).
"""
from __future__ import annotations

import asyncio
import os
import shutil
import time
import uuid
from typing import Any, Callable

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool

from ..settings import get_settings
from .. import graph as G
from ..schemas import CallReport
from ..outputs import build_report, write_artifacts

# --- single-GPU concurrency gate (shared with /analyze in api.main) -------------
_cfg = get_settings()
_MAX_CONCURRENCY = max(1, _cfg.api_max_concurrency)
# api_max_queue < 0  -> unbounded: never reject. Every request waits its turn on
#                       the semaphore and eventually completes (200).
# api_max_queue >= 0 -> cap concurrent open sessions at _MAX_INFLIGHT; overflow 503.
_MAX_INFLIGHT = None if _cfg.api_max_queue < 0 else _MAX_CONCURRENCY + _cfg.api_max_queue
_gpu_sem = asyncio.Semaphore(_MAX_CONCURRENCY)
_inflight = 0                       # open sessions (admitted, not yet finalized/deleted)
_inflight_lock = asyncio.Lock()


def inflight() -> int:
    """Current count of open sessions (read without the lock; fine for liveness)."""
    return _inflight


async def _admit() -> None:
    """Admit a new session. Bounded mode 503s on overflow; unbounded always admits."""
    global _inflight
    async with _inflight_lock:
        if _MAX_INFLIGHT is not None and _inflight >= _MAX_INFLIGHT:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GPU busy: session queue full, retry shortly",
                headers={"Retry-After": "30"},
            )
        _inflight += 1


async def _release() -> None:
    global _inflight
    async with _inflight_lock:
        _inflight = max(0, _inflight - 1)


# --- step registry: name -> (node fn, projection fn) ----------------------------
# Projections return ONLY the trace-visible JSON for a step. Heavy/mutating keys
# (audio, words, attributed_turns) stay in the session and never cross the tunnel.

def _avg_by_role(turns: list[dict]) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for role in ("AGENT", "CUSTOMER"):
        vals = [a["sentiment"] for a in turns
                if a.get("role") == role and a.get("sentiment") is not None]
        out[role] = round(sum(vals) / len(vals), 2) if vals else None
    return out


# proj(partial, state) -> dict   (state is the merged session state after the step)
_Proj = Callable[[dict, dict], dict]

_PROJECTIONS: dict[str, _Proj] = {
    "load_audio": lambda p, s: {
        "sr": p.get("sr"),
        "duration_sec": p.get("duration_sec"),
        "samples": int(getattr(p.get("audio"), "shape", [0])[0]) if p.get("audio") is not None else 0,
    },
    "transcribe": lambda p, s: {
        "text": p.get("segments_text", ""),
        "n_words": len(p.get("words", []) or []),
        "duration_sec": p.get("duration_sec"),
    },
    "diarize": lambda p, s: {
        "speakers": p.get("speakers", []),
        "n_turns": len(p.get("diar_turns", []) or []),
        "diar_turns": p.get("diar_turns", []),
    },
    "align": lambda p, s: {"n_attributed_turns": len(p.get("attributed_turns", []) or [])},
    "roles": lambda p, s: {"roles": p.get("roles", {})},
    "sentiment": lambda p, s: {
        "scored": sum(1 for a in s.get("attributed_turns", []) if a.get("sentiment") is not None),
        "avg_by_role": _avg_by_role(s.get("attributed_turns", [])),
    },
    "emotion": lambda p, s: {
        "speaker_emotion": p.get("speaker_emotion", []),
        "talk_time": p.get("talk_time", {}),
    },
    "compliance": lambda p, s: {"compliance": p.get("compliance", []), "pii_flag": p.get("pii_flag")},
    "followup": lambda p, s: {"followup": p.get("followup", {})},
    "rollup": lambda p, s: {"rollup": p.get("rollup", {})},
    "followup_actions": lambda p, s: {"followup_actions": p.get("followup_actions", [])},
    "identity": lambda p, s: {"caller_identity": p.get("caller_identity", {})},
}

# Node functions reused verbatim from the local graph. ``persist`` is handled by
# the finalize endpoint, not here.
_NODES: dict[str, Callable[[dict], dict]] = {
    "load_audio": G.n_load_audio,
    "transcribe": G.n_transcribe,
    "diarize": G.n_diarize,
    "align": G.n_align,
    "roles": G.n_roles,
    "sentiment": G.n_sentiment,
    "emotion": G.n_emotion,
    "compliance": G.n_compliance,
    "followup": G.n_followup,
    "rollup": G.n_rollup,
    "followup_actions": G.n_followup_actions,
    "identity": G.n_identity,
}

# Canonical execution order — the same order build_graph() wires locally.
STEP_ORDER: list[str] = [
    "load_audio", "transcribe", "diarize", "align", "roles", "sentiment",
    "emotion", "compliance", "followup", "rollup", "followup_actions", "identity",
]


class _Session:
    __slots__ = ("id", "state", "workdir", "lock", "created", "touched")

    def __init__(self, sid: str, audio_path: str, workdir: str):
        self.id = sid
        self.state: dict[str, Any] = {"audio_path": audio_path}
        self.workdir = workdir
        self.lock = asyncio.Lock()          # serialize steps within one session
        self.created = self.touched = time.monotonic()


class SessionStore:
    """In-memory session registry with idle TTL cleanup."""

    def __init__(self) -> None:
        self._sessions: dict[str, _Session] = {}
        self._lock = asyncio.Lock()

    async def create(self, audio_path: str, workdir: str) -> str:
        await self._sweep()
        await _admit()
        sid = uuid.uuid4().hex
        async with self._lock:
            self._sessions[sid] = _Session(sid, audio_path, workdir)
        return sid

    async def _get(self, sid: str) -> _Session:
        async with self._lock:
            sess = self._sessions.get(sid)
        if sess is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"unknown session {sid}")
        sess.touched = time.monotonic()
        return sess

    async def run_step(self, sid: str, step: str) -> dict:
        if step not in _NODES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"unknown step {step}")
        sess = await self._get(sid)
        node, proj = _NODES[step], _PROJECTIONS[step]
        # Per-session lock prevents concurrent steps on shared state; the GPU sem
        # serializes heavy work across all sessions.
        async with sess.lock:
            async with _gpu_sem:
                partial = await run_in_threadpool(node, sess.state)
            sess.state.update(partial)
            sess.touched = time.monotonic()
            return proj(partial, sess.state)

    async def finalize(self, sid: str) -> CallReport:
        sess = await self._get(sid)
        async with sess.lock:
            # persist == build the report + write local artifacts (heatmap/csv/json).
            report = await run_in_threadpool(self._persist, sess.state)
        await self.delete(sid)
        return report

    @staticmethod
    def _persist(state: dict) -> CallReport:
        report = build_report(state)
        return write_artifacts(state, report)

    async def delete(self, sid: str) -> None:
        async with self._lock:
            sess = self._sessions.pop(sid, None)
        if sess is None:
            return
        shutil.rmtree(sess.workdir, ignore_errors=True)
        await _release()

    async def _sweep(self) -> None:
        ttl = get_settings().session_ttl_sec
        now = time.monotonic()
        async with self._lock:
            stale = [sid for sid, s in self._sessions.items() if now - s.touched > ttl]
            dead = [self._sessions.pop(sid) for sid in stale]
        for sess in dead:
            shutil.rmtree(sess.workdir, ignore_errors=True)
            await _release()


STORE = SessionStore()
