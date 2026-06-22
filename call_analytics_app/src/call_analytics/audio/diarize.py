"""Speaker diarization via pyannote (in-memory waveform → speaker turns)."""
from __future__ import annotations

from ..models_runtime import get_diarizer


def diarize(audio, sr: int):
    """Return (turns: [{speaker,start,end}], speakers: [str]).

    Feeds an in-memory waveform dict to avoid pyannote's (broken-on-Windows) torchcodec
    decode path. pyannote 4.x returns a DiarizeOutput; the Annotation is at .speaker_diarization.
    """
    import torch
    dia = get_diarizer()
    out = dia({"waveform": torch.from_numpy(audio).unsqueeze(0), "sample_rate": sr})
    annotation = out.speaker_diarization
    turns = [{"speaker": spk, "start": seg.start, "end": seg.end}
             for seg, _, spk in annotation.itertracks(yield_label=True)]
    speakers = sorted({t["speaker"] for t in turns})
    return turns, speakers
