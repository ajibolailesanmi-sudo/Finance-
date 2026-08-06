"""I2 — gate ordering + CANDIDATE-ONLY authorization (the illegal-transition matrix)."""
import pytest

from jobagent.gates import transitions as T
from conftest import NOW, make_application, add_assessment


def test_legal_system_transition(conn):
    app = make_application(conn, state="DISCOVERED")
    T.transition(conn, app, "SCORED", actor=T.SYSTEM, now=NOW)
    assert conn.execute("SELECT state FROM applications WHERE id=?", (app,)).fetchone()[0] == "SCORED"


def test_illegal_transition_refused(conn):
    app = make_application(conn, state="DISCOVERED")
    with pytest.raises(T.TransitionError, match="illegal"):
        T.transition(conn, app, "SUBMITTED", actor=T.SYSTEM, now=NOW)


def test_candidate_only_edge_refuses_system(conn):
    """A system caller cannot cross Gate 1 (SCORED->SHORTLISTED)."""
    pid = None
    app = make_application(conn, state="SCORED")
    with pytest.raises(T.TransitionError, match="CANDIDATE-ONLY"):
        T.transition(conn, app, "SHORTLISTED", actor=T.SYSTEM, now=NOW)


def test_candidate_can_cross_gate1(conn):
    app = make_application(conn, state="SCORED", company="C", title="Dir")
    # assessment so tier_at_g1 can default
    pid = conn.execute("SELECT posting_id FROM applications WHERE id=?", (app,)).fetchone()[0]
    add_assessment(conn, pid, tier="APPLY_NOW")
    T.transition(conn, app, "SHORTLISTED", actor=T.CANDIDATE, now=NOW)
    row = conn.execute("SELECT state, g1_approved_at, g1_decided_by, tier_at_g1 FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "SHORTLISTED"
    assert row[1] == NOW and row[2] == "candidate" and row[3] == "APPLY_NOW"


def test_submitted_requires_approved_versions(conn):
    """I4: cannot reach SUBMITTED without locked approved_version_ids."""
    app = make_application(conn, state="APPROVED")
    with pytest.raises(T.TransitionError, match="approved_version_ids"):
        T.transition(conn, app, "SUBMITTED", actor=T.CANDIDATE, now=NOW)
    # With versions supplied it succeeds and is human-confirmed by construction.
    T.transition(conn, app, "SUBMITTED", actor=T.CANDIDATE, now=NOW,
                 approved_version_ids={"resume_emphasis": 1})
    row = conn.execute("SELECT state, submitted_confirmed_by_human FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "SUBMITTED" and row[1] == 1


def test_state_not_settable_via_fields(conn):
    app = make_application(conn, state="SUBMITTED")
    with pytest.raises(T.TransitionError, match="state may not be set"):
        T.transition(conn, app, "ACKNOWLEDGED", actor=T.CANDIDATE, now=NOW,
                     fields={"state": "OFFER"})


def test_full_legal_matrix_consistency():
    """Every CANDIDATE-ONLY edge is itself a legal edge."""
    for frm, to in T.CANDIDATE_ONLY:
        assert to in T.LEGAL_TRANSITIONS.get(frm, set()), f"{frm}->{to} not legal"
