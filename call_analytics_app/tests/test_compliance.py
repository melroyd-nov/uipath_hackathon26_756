import re

from call_analytics.rubrics import RULE_IDS, PII_DIGIT_PATTERN
from call_analytics.settings import get_settings


def test_pii_pattern_matches_spoken_numbers():
    assert re.findall(PII_DIGIT_PATTERN, "the numbers are 1109-185-859 okay")
    assert re.findall(PII_DIGIT_PATTERN, "1 0 3 7 4 9 8 4 0 0")


def test_pii_pattern_ignores_short_digits():
    assert not re.findall(PII_DIGIT_PATTERN, "press 1 then 2 please")


def test_rule_ids_unique_and_nonempty():
    assert RULE_IDS and len(RULE_IDS) == len(set(RULE_IDS))


def test_financial_rubric_builds_from_env():
    # Rule texts now live in .env; the rubric is assembled by settings.
    rubric = get_settings().financial_rubric
    assert [r["id"] for r in rubric] == RULE_IDS
    assert all(r["rule"] for r in rubric)
