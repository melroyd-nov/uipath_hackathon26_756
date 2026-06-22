"""Lazy, process-wide singletons for the heavy audio models.

Loaded once (e.g. at FastAPI startup) instead of per request. Centralizes the env quirks
solved during notebook development: the Windows cuDNN DLL path, pyannote's `token=` + the
pyannote-4.x `.speaker_diarization` accessor, and the wav2vec2 device.
"""
from __future__ import annotations

import os
from functools import lru_cache

from .settings import get_settings

_DLL_ADDED = False


def _ensure_dlls() -> None:
    """faster-whisper / ctranslate2 need cuDNN/cuBLAS DLLs; reuse the ones bundled with torch."""
    global _DLL_ADDED
    if _DLL_ADDED:
        return
    import torch
    lib = os.path.join(os.path.dirname(torch.__file__), "lib")
    if os.path.isdir(lib) and hasattr(os, "add_dll_directory"):
        os.add_dll_directory(lib)
    _DLL_ADDED = True


@lru_cache(maxsize=1)
def get_asr():
    _ensure_dlls()
    from faster_whisper import WhisperModel
    s = get_settings()
    compute = s.compute_type if s.device == "cuda" else "int8"
    return WhisperModel(s.asr_model, device=s.device, compute_type=compute)


@lru_cache(maxsize=1)
def get_diarizer():
    _ensure_dlls()
    import torch
    from pyannote.audio import Pipeline
    s = get_settings()
    pipe = Pipeline.from_pretrained(s.diar_model, token=s.hf_token)
    pipe.to(torch.device(s.device))
    return pipe


@lru_cache(maxsize=1)
def get_ser():
    _ensure_dlls()
    from transformers import pipeline as hf_pipeline
    s = get_settings()
    return hf_pipeline("audio-classification", model=s.ser_model,
                       device=0 if s.device == "cuda" else -1)


def warmup() -> None:
    """Eagerly load all models (call at server startup)."""
    get_asr(); get_diarizer(); get_ser()
