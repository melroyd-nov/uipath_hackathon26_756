from call_analytics.analysis import enrichment as E


def test_categorize_sentiment_thresholds():
    assert E.categorize_sentiment(0.5) == 1
    assert E.categorize_sentiment(-0.5) == -1
    assert E.categorize_sentiment(0.1) == 0
    assert E.categorize_sentiment(-0.1) == 0
    assert E.categorize_sentiment(None) is None


def test_derive_escalation():
    assert E.derive_escalation("unresolved", []) is True
    assert E.derive_escalation("resolved", ["recording_disclosure"]) is True
    assert E.derive_escalation("resolved", []) is False
    assert E.derive_escalation("follow_up_needed", []) is False


def test_friction_score_bounds_and_weights():
    assert E.friction_score(is_negative=True, is_escalated=True, is_repeat=True) == 100.0
    assert E.friction_score(is_negative=False, is_escalated=False, is_repeat=False) == 0.0
    assert E.friction_score(is_negative=True, is_escalated=False, is_repeat=False) == 40.0
    assert E.friction_score(is_negative=False, is_escalated=True, is_repeat=False) == 35.0
    assert E.friction_score(is_negative=False, is_escalated=False, is_repeat=True) == 25.0


def test_assign_specialist_covers_all_intents():
    assert E.assign_specialist("Claims Status") == "Sam"
    assert E.assign_specialist("Grievances") == "Sam"
    assert E.assign_specialist("Billing") == "Mary"
    assert E.assign_specialist("New Business") == "Mike"
    assert E.assign_specialist("Cancellations") == "Mike"
    assert E.assign_specialist("unknown-intent") == "John"   # default
    assert E.assign_specialist(None) == "John"


def test_marketing_opportunity():
    assert E.marketing_opportunity("New Business") == "Upsell"
    assert E.marketing_opportunity("Cancellations") == "Retention"
    assert E.marketing_opportunity("Grievances") == "Retention"
    assert E.marketing_opportunity("Billing") == "Cross-sell"
    assert E.marketing_opportunity("Claims Status") == "None"
    assert E.marketing_opportunity(None) == "None"


def test_followup_priority_levels():
    high = E.followup_priority(escalation_flag=True, fraud_risk="low",
                               compliance_violations=[], resolution="resolved",
                               customer_sentiment_cat=0)
    assert high == "high"
    med = E.followup_priority(escalation_flag=False, fraud_risk="low",
                              compliance_violations=[], resolution="follow_up_needed",
                              customer_sentiment_cat=0)
    assert med == "medium"
    low = E.followup_priority(escalation_flag=False, fraud_risk="low",
                              compliance_violations=[], resolution="resolved",
                              customer_sentiment_cat=1)
    assert low == "low"
