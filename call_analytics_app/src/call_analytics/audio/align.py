"""Speaker attribution — merge transcript words with diarization turns (PURE logic, no models)."""
from __future__ import annotations


def _speaker_at(t: float, turns: list[dict]) -> str:
    """Diarization speaker whose turn contains time t (else the nearest turn)."""
    for tr in turns:
        if tr["start"] <= t <= tr["end"]:
            return tr["speaker"]
    return min(turns, key=lambda tr: min(abs(t - tr["start"]), abs(t - tr["end"])))["speaker"]


def attribute(words: list[dict], turns: list[dict]) -> list[dict]:
    """Drop each word onto its diarization speaker, then collapse consecutive same-speaker
    words into attributed turns: [{speaker,start,end,text}]."""
    if not turns:
        # No diarization → single anonymous speaker spanning everything.
        turns = [{"speaker": "SPEAKER_00", "start": 0.0, "end": float("inf")}]

    out: list[dict] = []
    for w in words:
        spk = _speaker_at((w["start"] + w["end"]) / 2, turns)
        if out and out[-1]["speaker"] == spk:
            out[-1]["end"] = w["end"]
            out[-1]["text"] += w["text"]
        else:
            out.append({"speaker": spk, "start": w["start"], "end": w["end"], "text": w["text"]})
    for a in out:
        a["text"] = a["text"].strip()
    return out
