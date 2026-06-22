import re

from call_analytics.rubrics import FINANCIAL_RUBRIC, PII_DIGIT_PATTERN


def test_pii_pattern_matches_spoken_numbers():
    assert re.findall(PII_DIGIT_PATTERN, "the numbers are 1109-185-859 okay")
    assert re.findall(PII_DIGIT_PATTERN, "1 0 3 7 4 9 8 4 0 0")


def test_pii_pattern_ignores_short_digits():
    assert not re.findall(PII_DIGIT_PATTERN, "press 1 then 2 please")


def test_rubric_ids_unique_and_nonempty():
    ids = [r["id"] for r in FINANCIAL_RUBRIC]
    assert ids and len(ids) == len(set(ids))
    assert all(r["rule"] for r in FINANCIAL_RUBRIC)
