"""F7 — Gate 3: submission is human-only; system callers refused (I1/I2)."""
import json

import pytest

from conftest import NOW, make_application

from jobagent.gates import submission, transitions


def _prefilled_app(conn):
    """An app at PREFILLED with locked approved versions (as after F5+F6)."""
    app = make_application(conn, state="APPROVED")
    conn.execute("UPDATE applications SET approved_version_ids=? WHERE id=?",
                 (json.dumps({"resume_emphasis": 1}), app))
    transitions.transition(conn, app, "PREFILLED", actor=transitions.SYSTEM, now=NOW,
                           fields={"prefill_method": "scripted", "screenshot_path": "shot.txt"})
    return app


def test_system_cannot_submit(conn):
    app = _prefilled_app(conn)
    with pytest.raises(transitions.TransitionError, match="CANDIDATE-ONLY"):
        transitions.transition(conn, app, "SUBMITTED", actor=transitions.SYSTEM, now=NOW)


def test_candidate_confirms_submission_with_audit_trail(conn):
    app = _prefilled_app(conn)
    submission.confirm_submitted(conn, app, "2026-08-08T00:00:00Z", confirmation_ref="ACME-12345")
    row = conn.execute(
        "SELECT state, submitted_at, submitted_confirmed_by_human, approved_version_ids, notes "
        "FROM applications WHERE id=?", (app,)).fetchone()
    assert row["state"] == "SUBMITTED"
    assert row["submitted_at"] == "2026-08-08T00:00:00Z"
    assert row["submitted_confirmed_by_human"] == 1          # true by construction
    assert json.loads(row["approved_version_ids"]) == {"resume_emphasis": 1}  # I4 audit trail
    assert "ACME-12345" in row["notes"]


def test_decline_hold_keeps_prefilled(conn):
    app = _prefilled_app(conn)
    submission.decline_submission(conn, app, NOW, note="wants to revise phone number")
    row = conn.execute("SELECT state, notes FROM applications WHERE id=?", (app,)).fetchone()
    assert row["state"] == "PREFILLED" and "revise phone" in row["notes"]


def test_withdraw(conn):
    app = _prefilled_app(conn)
    submission.decline_submission(conn, app, NOW, note="role filled", withdraw=True)
    assert conn.execute("SELECT state FROM applications WHERE id=?", (app,)).fetchone()[0] == "WITHDRAWN"
