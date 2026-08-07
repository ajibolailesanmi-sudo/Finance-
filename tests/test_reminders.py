"""F9 — reminder cadence."""
from conftest import NOW, make_application, seed_app

from jobagent.tracking.reminders import compute_reminders, DEFAULT_CADENCE


def test_followup_fires_after_cadence(conn):
    # app submitted on 2026-08-01 (seed_app timestamps start there), no later activity
    seed_app(conn, 1, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED", "DRAFTED",
                                    "APPROVED", "PREFILLED", "SUBMITTED"], method="scripted")
    # 6 days later -> below the 7-day followup cadence: no follow-up yet
    early = compute_reminders(conn, "2026-08-13T00:00:00Z")   # SUBMITTED at 2026-08-07
    assert not [r for r in early if r.kind == "follow_up"]
    # 8 days later -> fires
    late = compute_reminders(conn, "2026-08-15T00:00:00Z")
    fu = [r for r in late if r.kind == "follow_up"]
    assert len(fu) == 1 and fu[0].age_days >= DEFAULT_CADENCE["followup_days"]


def test_gate2_and_submit_reminders(conn):
    seed_app(conn, 2, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED", "DRAFTED"])   # DRAFTED at 2026-08-04
    seed_app(conn, 3, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED", "DRAFTED",
                                    "APPROVED", "PREFILLED"])                            # PREFILLED at 2026-08-06
    rem = compute_reminders(conn, "2026-08-20T00:00:00Z")
    kinds = {r.kind for r in rem}
    assert "gate2" in kinds and "submit" in kinds


def test_interview_prep_reminder(conn):
    seed_app(conn, 4, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED", "DRAFTED", "APPROVED",
                                    "PREFILLED", "SUBMITTED", "ACKNOWLEDGED", "SCREENING", "INTERVIEWING"])
    rem = compute_reminders(conn, "2026-08-20T00:00:00Z")
    assert any(r.kind == "interview_prep" for r in rem)


def test_overdue_next_action(conn):
    app = make_application(conn, state="SCREENING", company="C", title="T")
    conn.execute("UPDATE applications SET next_action='call recruiter', next_action_date=? WHERE id=?",
                 ("2026-08-05T00:00:00Z", app))
    conn.commit()
    rem = compute_reminders(conn, "2026-08-10T00:00:00Z")
    na = [r for r in rem if r.kind == "next_action"]
    assert len(na) == 1 and "call recruiter" in na[0].message
