"""F8 — status upkeep appends history; STALE is suggested, not auto-applied."""
from conftest import make_application

from jobagent.tracking import status as S
from jobagent.tracking.status import suggest_stale, history


def test_status_update_appends_history(conn):
    app = make_application(conn, state="SUBMITTED")
    S.update_status(conn, app, "ACKNOWLEDGED", "2026-08-10T00:00:00Z")
    S.update_status(conn, app, "SCREENING", "2026-08-12T00:00:00Z")
    S.update_status(conn, app, "REJECTED", "2026-08-20T00:00:00Z", outcome="not selected")
    hist = history(conn, app)
    # initial SUBMITTED + 3 updates = 4 rows, never rewritten.
    assert [h["to_state"] for h in hist] == ["SUBMITTED", "ACKNOWLEDGED", "SCREENING", "REJECTED"]
    row = conn.execute("SELECT state, outcome FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "REJECTED" and row[1] == "not selected"


def test_suggest_stale_after_silence(conn):
    old = make_application(conn, state="SUBMITTED", company="Old", title="A")
    # last history entry for `old` is at NOW (2026-08-06); check 30 days later.
    fresh = make_application(conn, state="SUBMITTED", company="New", title="B")
    S.update_status(conn, fresh, "ACKNOWLEDGED", "2026-08-30T00:00:00Z")

    suggestions = suggest_stale(conn, "2026-09-05T00:00:00Z", silent_days=21)
    assert old in suggestions       # silent ~30 days
    assert fresh not in suggestions  # active 6 days ago
