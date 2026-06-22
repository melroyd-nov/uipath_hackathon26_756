"""Decode an audio file to a 16 kHz mono waveform (Whisper's rate)."""
from __future__ import annotations


def load_audio(path: str, sr: int = 16000):
    """Return (audio: np.ndarray float32, sr: int, duration_sec: float)."""
    import librosa
    audio, sr = librosa.load(path, sr=sr)
    return audio, sr, len(audio) / sr
