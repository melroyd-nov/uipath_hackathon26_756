from call_analytics.schemas import CallReport, ComplianceItem


def test_callreport_minimal_serializes():
    r = CallReport(recording="call_00.mp3")
    d = r.model_dump()
    assert d["recording"] == "call_00.mp3"
    assert d["compliance"] == [] and d["triggers"] == []


def test_compliance_item_roundtrip():
    c = ComplianceItem(id="no_remote_access", rule="...", status="FAIL", evidence="AnyDesk")
    assert c.status == "FAIL"
    assert ComplianceItem(**c.model_dump()).id == "no_remote_access"
