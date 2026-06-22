from call_analytics.audio.align import attribute


def test_collapses_consecutive_same_speaker():
    turns = [{"speaker": "S0", "start": 0, "end": 1}, {"speaker": "S1", "start": 1, "end": 2}]
    words = [
        {"start": 0.1, "end": 0.4, "text": " Hello"},
        {"start": 0.5, "end": 0.9, "text": " there"},
        {"start": 1.1, "end": 1.4, "text": " Hi"},
    ]
    out = attribute(words, turns)
    assert len(out) == 2
    assert out[0]["speaker"] == "S0" and out[0]["text"] == "Hello there"
    assert out[1]["speaker"] == "S1" and out[1]["text"] == "Hi"


def test_nearest_turn_fallback_for_gap_word():
    turns = [{"speaker": "S0", "start": 0, "end": 1}]
    out = attribute([{"start": 5, "end": 5.2, "text": " Late"}], turns)
    assert out[0]["speaker"] == "S0"


def test_empty_turns_uses_single_anonymous_speaker():
    out = attribute([{"start": 0, "end": 0.2, "text": " Hi"}], [])
    assert out and out[0]["speaker"] == "SPEAKER_00"
