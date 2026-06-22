"""ASR via faster-whisper — returns the transcript plus word-level timestamps."""
from __future__ import annotations

from ..models_runtime import get_asr
from ..settings import get_settings


def transcribe(audio) -> dict:
    """Transcribe an in-memory 16 kHz waveform.

    Returns {"text", "words": [{start,end,text}], "duration", "language"}.
    """
    s = get_settings()
    asr = get_asr()
    segments, info = asr.transcribe(
        audio, beam_size=s.beam_size, vad_filter=True, word_timestamps=True
    )
    segments = list(segments)
    words = [
        {"start": w.start, "end": w.end, "text": w.word}
        for seg in segments for w in (seg.words or [])
    ]
    text = " ".join(seg.text.strip() for seg in segments)
    return {"text": text, "words": words,
            "duration": float(info.duration), "language": info.language}
