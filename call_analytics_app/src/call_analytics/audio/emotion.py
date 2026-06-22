"""Speech-emotion recognition (wav2vec2) per diarization turn, aggregated by speaker."""
from __future__ import annotations

from collections import Counter, defaultdict

from ..models_runtime import get_ser
from ..settings import get_settings

# SUPERB/IEMOCAP labels → our vocabulary
SER_MAP = {"neu": "neutral", "hap": "joy", "ang": "anger", "sad": "sadness"}


def speaker_emotion(audio, sr: int, turns: list[dict], speakers: list[str],
                    roles: dict[str, str]):
    """Return (per_speaker: [SpeakerEmotion dict], talk_time: {speaker: sec})."""
    s = get_settings()
    ser = get_ser()
    per = defaultdict(Counter)
    talk = defaultdict(float)

    for t in turns:
        talk[t["speaker"]] += t["end"] - t["start"]
        clip = audio[int(t["start"] * sr): int(t["end"] * sr)]
        if len(clip) < int(s.min_ser_sec * sr):
            continue
        label = ser(clip, top_k=1)[0]["label"]
        per[t["speaker"]][SER_MAP.get(label, label)] += 1

    result = []
    for spk in speakers:
        c = per[spk]
        result.append({
            "speaker": spk,
            "role": roles.get(spk, spk),
            "talk_sec": round(talk[spk], 1),
            "turns": sum(c.values()),
            "dominant": c.most_common(1)[0][0] if c else "n/a",
            "distribution": dict(c),
        })
    return result, dict(talk)
