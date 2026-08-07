"""Review-surface service layer — offline (no Streamlit). Proves the dashboard's
data + actions go through the same guarded modules as the CLI."""
from pathlib import Path

import pytest

from conftest import NOW, make_application, seed_scenario

import service as svc
from jobagent.gates import materials
from jobagent.gates import transitions
from jobagent.tailoring.generate import GenContext, MockTailor, generate_bundle
from jobagent.tailoring.library_loader import load_library

LIB = Path(__file__).parent / "fixtures" / "library_demo" / "accomplishments.yaml"


def test_counts_and_overview(conn):
    seed_scenario(conn)
    c = svc.counts(conn)
    assert set(c) == {"g1", "g2", "g3", "g4"}
    ov = svc.overview(conn, "2026-09-01T00:00:00Z")
    assert "counts" in ov and "reminders" in ov and "health" in ov


def test_gate1_decision_is_candidate_action(conn):
    app = make_application(conn, state="SCORED", company="CGT", title="Dir CMC")
    pid = conn.execute("SELECT posting_id FROM applications WHERE id=?", (app,)).fetchone()[0]
    conn.execute("""INSERT INTO assessments (posting_id,scored_at,model_id,prompt_version,
        criteria_version,fit_score,tier,rationale,matched_qualifications,missing_qualifications,dealbreaker_hits)
        VALUES (?,?,'m','v','c1',90,'APPLY_NOW','r','[]','[]','[]')""", (pid, NOW))
    conn.commit()
    assert svc.gate1_queue(conn)[0]["app_id"] == app
    svc.decide_gate1(conn, app, "SHORTLISTED", NOW)
    row = conn.execute("SELECT state, g1_decided_by FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "SHORTLISTED" and row[1] == "candidate"


def _drafted(conn, tmp_path):
    lib = load_library(LIB)
    app = make_application(conn, state="SHORTLISTED", company="CGT", title="Sr Dir RA CMC")
    ctx = GenContext(posting={"company": "CGT", "title": "Sr Dir RA CMC",
                              "description_text": "gene therapy CMC"}, library=lib)
    generate_bundle(conn, app, ctx, MockTailor(), materials_root=tmp_path, now=NOW)
    return app


def test_gate2_approve_locks_versions(conn, tmp_path):
    app = _drafted(conn, tmp_path)
    q = svc.gate2_queue(conn)
    assert q and "content" in next(iter(q[0]["versions"].values()))
    svc.approve_gate2(conn, app, NOW)
    row = conn.execute("SELECT state, approved_version_ids FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "APPROVED" and row[1]   # versions locked (I4)


def test_gate2_rework(conn, tmp_path):
    app = _drafted(conn, tmp_path)
    svc.rework_gate2(conn, app, "tighten the letter", NOW)
    row = conn.execute("SELECT state, notes FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "REWORK" and "tighten" in row[1]


def test_gate3_records_submission(conn):
    import json
    app = make_application(conn, state="APPROVED")
    conn.execute("UPDATE applications SET approved_version_ids=? WHERE id=?",
                 (json.dumps({"resume_emphasis": 1}), app))
    transitions.transition(conn, app, "PREFILLED", actor=transitions.SYSTEM, now=NOW,
                           fields={"prefill_method": "scripted", "screenshot_path": "shot.txt"})
    assert svc.gate3_queue(conn)[0]["app_id"] == app
    svc.record_submission(conn, app, NOW, confirmation_ref="ACME-9")
    row = conn.execute("SELECT state, submitted_confirmed_by_human FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "SUBMITTED" and row[1] == 1


def test_gate4_mark_sent(conn, tmp_path):
    from jobagent.tailoring import outreach
    from jobagent.tailoring.library_loader import load_library as _ll
    app = make_application(conn, state="SHORTLISTED")
    did = outreach.draft_outreach(conn, application_id=app, purpose="referral", library=_ll(LIB),
                                  posting={"company": "CGT", "title": "Dir", "description_text": "x"},
                                  contact_ref="Jane", materials_root=tmp_path, now=NOW)
    assert svc.gate4_queue(conn)[0]["id"] == did
    svc.mark_sent(conn, did, NOW)
    assert conn.execute("SELECT status FROM outreach_drafts WHERE id=?", (did,)).fetchone()[0] == "sent_by_human"
    assert svc.gate4_queue(conn) == []


def test_digest_and_pipeline(conn):
    seed_scenario(conn)
    d = svc.digest(conn, "2026-09-01T00:00:00Z", window_days=60)
    assert d["metrics"]["submissions"] == 3
    assert len(svc.pipeline(conn)) == 8
