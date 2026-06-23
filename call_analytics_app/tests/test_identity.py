"""Unit tests for caller-identity masking (no LLM / GPU required)."""
from call_analytics.analysis.identity import _is_blank, _mask_tail, _year_only, _NA


def test_is_blank_treats_na_variants_as_blank():
    for v in ["", "  ", "NA", "n/a", "None", "unknown", "Not stated", None]:
        assert _is_blank(v)
    assert not _is_blank("S1234567A")


def test_mask_tail_keeps_first_and_last_four():
    # S1234567A -> S + 4 bullets + last 4 (567A)
    assert _mask_tail("S1234567A", visible=4) == "S••••567A"


def test_mask_tail_ignores_separators_in_count():
    # Policy "POL-2024-0098" -> first P, last 4 (0098), middle bulleted
    masked = _mask_tail("POL-2024-0098", visible=4)
    assert masked.startswith("P") and masked.endswith("0098") and "•" in masked


def test_mask_tail_returns_na_when_too_short_to_mask():
    assert _mask_tail("12", visible=4) == _NA
    assert _mask_tail("ABCDE", visible=4) == _NA  # 5 alnum <= visible+1


def test_year_only_extracts_four_digit_year():
    assert _year_only("12 March 1985") == "1985"
    assert _year_only("1985-03-12") == "1985"
    assert _year_only("born 03/12/2001") == "2001"


def test_year_only_na_when_no_year():
    assert _year_only("sometime in spring") == _NA
