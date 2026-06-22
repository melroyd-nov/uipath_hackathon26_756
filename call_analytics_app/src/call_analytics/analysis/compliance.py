"""Compliance audit: one LLM-judge call PER rule (parallel) + a deterministic PII backstop.

Per-rule (not all-at-once) because small models drop rules / mislabel ids when asked to judge
the whole rubric in a single call — a finding from notebook testing.
"""
from __future__ import annotations

import re

from ..llm import structured
from ..schemas import ComplianceVerdict
from ..rubrics import PII_DIGIT_PATTERN, CALL_LEVEL_RULES
from ..settings import get_settings


_NOT_EVALUABLE_REASON = (
    "Not evaluable: this rule applies to the call opening, which is not present in this "
    "segment (or speaker roles could not be established)."
)


def run_compliance(transcript_roles: str, rubric: list[dict] | None = None,
                   opening_present: bool = True):
    """Return (results: [ComplianceItem dict], pii_flag: bool, pii_examples: [str]).

    Call-level rules (self-identification, recording disclosure, identity verification) are
    only sent to the judge when ``opening_present`` is True. On a mid-call fragment — or when
    diarization collapsed and roles are unknown — they are returned NA-by-design instead of
    letting the model guess a FAIL it has no evidence for.
    """
    s = get_settings()
    if rubric is None:
        rubric = s.financial_rubric
    transcript = transcript_roles[: s.max_transcript_chars]
    judge_prompt = s.prompt("judge_prompt")

    # Only judge rules that are in scope for this segment.
    evaluable = [r for r in rubric
                 if opening_present or r["id"] not in CALL_LEVEL_RULES]
    prompts = [judge_prompt.format(rule=r["rule"], transcript=transcript) for r in evaluable]

    chain = structured(ComplianceVerdict, judge=True)
    verdicts = chain.batch(prompts, config={"max_concurrency": s.max_workers}) if prompts else []
    judged = {r["id"]: v for r, v in zip(evaluable, verdicts)}

    results = []
    for r in rubric:
        v = judged.get(r["id"])
        if v is None:  # out-of-scope call-level rule
            results.append({"id": r["id"], "rule": r["rule"], "status": "NA",
                            "evidence": "", "reason": _NOT_EVALUABLE_REASON})
        else:
            results.append({"id": r["id"], "rule": r["rule"], "status": v.status,
                            "evidence": v.evidence, "reason": v.reason})

    pii = re.findall(PII_DIGIT_PATTERN, transcript_roles)
    return results, bool(pii), pii[:5]
