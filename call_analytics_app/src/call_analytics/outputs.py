"""Assemble the CallReport from graph state and persist artifacts (JSON, master CSV, heatmap PNG)."""
from __future__ import annotations

import csv
import json
import os
from collections import defaultdict

from .schemas import CallReport, ComplianceItem
from .settings import get_settings
from .analysis.heatmap import build_heatmap, detect_triggers
from .analysis.roles import detect_call_opening
from .analysis import enrichment as E


def _role_sentiment(turns: list[dict], role: str):
    vals = [a["sentiment"] for a in turns
            if a.get("role") == role and a.get("sentiment") is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


def _build_transcript(turns: list[dict]) -> list[dict]:
    """Role-labeled transcript for audit/debug — chronological, with timing and sentiment."""
    return [
        {
            "start": round(a.get("start", 0.0), 2),
            "end": round(a.get("end", 0.0), 2),
            "role": a.get("role", a.get("speaker")),
            "speaker": a.get("speaker"),
            "sentiment": a.get("sentiment"),
            "text": a.get("text", ""),
        }
        for a in sorted(turns, key=lambda a: a.get("start", 0.0))
    ]


def _assess_quality(turns: list[dict], roles: dict) -> dict:
    """Self-assessment so a reviewer can distinguish a clean call from a degraded analysis."""
    num_speakers = len({a["speaker"] for a in turns})
    roles_ok = "AGENT" in roles.values() and "CUSTOMER" in roles.values()
    diarization_ok = num_speakers >= 2 and roles_ok
    opening_present = roles_ok and detect_call_opening(turns)

    warnings: list[str] = []
    if num_speakers < 2:
        warnings.append("Diarization found a single speaker; per-role metrics are unavailable.")
    elif not roles_ok:
        warnings.append("Could not resolve both AGENT and CUSTOMER roles.")
    if not opening_present:
        warnings.append("Call opening not detected in this segment; call-level compliance "
                        "rules were marked NA-by-design.")
    return {
        "diarization_ok": diarization_ok,
        "num_speakers": num_speakers,
        "roles_resolved": roles_ok,
        "opening_present": opening_present,
        "warnings": warnings,
    }


def build_report(state: dict) -> CallReport:
    rec = os.path.basename(state["audio_path"])
    at = state.get("attributed_turns", [])
    roles = state.get("roles", {})
    talk = state.get("talk_time", {})
    rollup = state.get("rollup", {})
    followup = state.get("followup", {})
    compliance = state.get("compliance", [])
    identity = state.get("caller_identity", {})

    talk_by_role = defaultdict(float)
    for spk, sec in talk.items():
        talk_by_role[roles.get(spk, spk)] += sec
    total = sum(talk_by_role.values()) or 1.0
    audio_emotion = {e["role"]: e["dominant"] for e in state.get("speaker_emotion", [])}
    dur = state.get("duration_sec")

    intent = rollup.get("intent")
    resolution = rollup.get("resolution")
    fraud_risk = rollup.get("fraud_risk")
    is_followup = followup.get("is_followup")
    violations = [c["id"] for c in compliance if c["status"] == "FAIL"]

    agent_sent = _role_sentiment(at, "AGENT")
    cust_sent = _role_sentiment(at, "CUSTOMER")
    # Overall decimal sentiment = mean of whichever role scores exist.
    present = [v for v in (agent_sent, cust_sent) if v is not None]
    overall_sent = sum(present) / len(present) if present else None

    # --- Derived dashboard fields ---
    agent_cat = E.categorize_sentiment(agent_sent)
    cust_cat = E.categorize_sentiment(cust_sent)
    overall_cat = E.categorize_sentiment(overall_sent)
    escalation_flag = E.derive_escalation(resolution, violations)
    friction = E.friction_score(
        is_negative=(overall_cat == -1),
        is_escalated=escalation_flag,
        is_repeat=bool(is_followup),
    )
    priority = E.followup_priority(
        escalation_flag=escalation_flag, fraud_risk=fraud_risk,
        compliance_violations=violations, resolution=resolution,
        customer_sentiment_cat=cust_cat,
    )

    return CallReport(
        recording=rec,
        duration_sec=round(dur, 1) if dur else None,
        summary=rollup.get("summary"),
        intent=intent,
        resolution=resolution,
        fraud_risk=fraud_risk,
        fraud_reason=rollup.get("fraud_reason"),
        is_followup=is_followup,
        followup_evidence=followup.get("evidence"),
        sentiment_avg={"agent": agent_sent, "customer": cust_sent},
        talk_ratio_pct={r: round(100 * sec / total, 1) for r, sec in talk_by_role.items()},
        audio_emotion=audio_emotion,
        compliance=[ComplianceItem(**c) for c in compliance],
        compliance_violations=violations,
        pii_digits_detected=state.get("pii_flag"),
        triggers=detect_triggers(at),
        quality=_assess_quality(at, roles),
        transcript=_build_transcript(at),
        sentiment_category=overall_cat,
        sentiment_category_by_role={"agent": agent_cat, "customer": cust_cat},
        escalation_flag=escalation_flag,
        friction_score=friction,
        marketing_opportunity=E.marketing_opportunity(intent),
        followup_items=state.get("followup_actions", []),
        followup_priority=priority,
        followup_assigned_to=E.assign_specialist(intent),
        # Masked caller identity ("NA" when the node didn't run or nothing was stated).
        caller_nric=identity.get("caller_nric", "NA"),
        caller_dob=identity.get("caller_dob", "NA"),
        policy_number=identity.get("policy_number", "NA"),
    )


def write_artifacts(state: dict, report: CallReport) -> CallReport:
    s = get_settings()
    os.makedirs(s.output_dir, exist_ok=True)
    stem = report.recording.rsplit(".", 1)[0]

    # 1) heatmap PNG
    png = os.path.join(s.output_dir, f"heatmap_{stem}.png")
    try:
        build_heatmap(state.get("attributed_turns", []), report.duration_sec or 0.0, png)
        report.artifacts["heatmap"] = png
    except Exception as e:  # heatmap is best-effort, never fail the run on it
        report.artifacts["heatmap_error"] = str(e)

    # 2) master CSV (one flat row per recording; replace existing row for this file)
    master = os.path.join(s.output_dir, "call_master.csv")
    row = {
        "recording": report.recording, "duration_sec": report.duration_sec,
        "intent": report.intent, "resolution": report.resolution,
        "fraud_risk": report.fraud_risk, "is_followup": report.is_followup,
        "agent_sentiment": report.sentiment_avg.get("agent"),
        "customer_sentiment": report.sentiment_avg.get("customer"),
        "n_violations": len(report.compliance_violations),
        "violations": ";".join(report.compliance_violations) or "none",
        "pii_digits": report.pii_digits_detected,
    }
    rows = []
    if os.path.exists(master):
        with open(master, newline="", encoding="utf-8") as f:
            rows = [r for r in csv.DictReader(f) if r["recording"] != report.recording]
    rows.append(row)
    with open(master, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(row.keys()))
        w.writeheader(); w.writerows(rows)
    report.artifacts["master_csv"] = master

    # 3) per-call JSON (written last so it includes all artifact paths)
    js = os.path.join(s.output_dir, f"call_{stem}.json")
    with open(js, "w", encoding="utf-8") as f:
        json.dump(report.model_dump(), f, indent=2, ensure_ascii=False)
    report.artifacts["report_json"] = js
    return report
