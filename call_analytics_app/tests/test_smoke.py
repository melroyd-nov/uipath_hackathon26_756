"""End-to-end smoke test — requires a CUDA GPU, Ollama, and the gated pyannote models.

Run explicitly:  pytest -m gpu
"""
import os

import pytest

from call_analytics.settings import get_settings

AUDIO = get_settings().data_dir / "audio_samples" / "call_01.mp3"


@pytest.mark.gpu
@pytest.mark.skipif(not AUDIO.exists(), reason="sample audio not present")
def test_analyze_call_end_to_end():
    from call_analytics import analyze_call
    report = analyze_call(str(AUDIO))
    assert report.recording == "call_01.mp3"
    assert report.duration_sec and report.duration_sec > 0
    assert set(report.talk_ratio_pct) <= {"AGENT", "CUSTOMER"}
    assert len(report.compliance) == 8
    assert os.path.exists(report.artifacts.get("report_json", ""))
