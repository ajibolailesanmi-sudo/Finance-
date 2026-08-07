"""F2: schema rejection of malformed output; dealbreaker forces SKIP; DISCOVERED->SCORED."""
import pytest

from conftest import NOW, make_application

from jobagent.common.alerts import AlertCollector
from jobagent.common.llmclient import MockLLMClient
from jobagent.scoring.score import score_posting, score_pending, build_prompt


def test_malformed_output_rejected():
    bad = MockLLMClient(lambda _p: {"fit_score": 150, "tier": "MAYBE"})  # out of range + bad enum
    with pytest.raises(ValueError, match="schema"):
        score_posting(bad, {"title": "x"}, "resume", "criteria", max_retries=1)


def test_dealbreaker_forces_skip():
    llm = MockLLMClient(lambda _p: {
        "fit_score": 88, "tier": "APPLY_NOW", "rationale": "strong",
        "matched_qualifications": ["CMC"], "missing_qualifications": [],
        "dealbreaker_hits": ["below Director level"],
    })
    out = score_posting(llm, {"title": "x"}, "r", "c")
    assert out["tier"] == "SKIP"  # authority overrides the model's APPLY_NOW


def test_prompt_whitelists_fields():
    posting = {"company": "Acme", "title": "Dir", "description_text": "d",
               "location": "Remote", "work_arrangement": "remote",
               "secret_internal_id": "SHOULD-NOT-LEAK"}
    prompt = build_prompt(posting, "resume", "criteria")
    assert "SHOULD-NOT-LEAK" not in prompt  # I7


def test_score_pending_transitions_and_quarantines(conn):
    good_app = make_application(conn, state="DISCOVERED", company="Good", title="Dir CMC")
    bad_app = make_application(conn, state="DISCOVERED", company="Bad", title="Dir QA")

    def responder(prompt):
        if "Bad" in prompt:
            return {"tier": "nonsense"}            # malformed -> quarantine
        return {"fit_score": 80, "tier": "APPLY_NOW", "rationale": "ok",
                "matched_qualifications": [], "missing_qualifications": [],
                "dealbreaker_hits": []}

    alerts = AlertCollector()
    summary = score_pending(conn, MockLLMClient(responder), "resume", "criteria", NOW, alerts=alerts)
    assert summary["scored"] == 1 and summary["quarantined"] == 1

    def state(a): return conn.execute("SELECT state FROM applications WHERE id=?", (a,)).fetchone()[0]
    assert state(good_app) == "SCORED"
    assert state(bad_app) == "DISCOVERED"          # quarantined, never partial-written
    assert conn.execute("SELECT COUNT(*) FROM assessments").fetchone()[0] == 1
    assert alerts.alerts  # quarantine surfaced
