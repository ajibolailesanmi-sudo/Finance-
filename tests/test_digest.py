"""F9 — weekly digest correctness against the seeded log + renderer safety."""
from conftest import seed_scenario

from jobagent.tracking import digest as D


def test_digest_metrics_match_known_answers(conn):
    seed_scenario(conn)
    d = D.build_digest(conn, "2026-08-31T00:00:00Z", window_days=7)
    m = d["metrics"]
    assert m["submissions"] == 3
    assert m["response_rate"] == round(2 / 3, 4)
    assert m["shortlist_precision"]["precision"] == 0.8
    assert m["prefill_success_rate"]["rate"] == 0.75
    # calibration section
    assert d["calibration"]["precision_miss_count"] == 1
    assert d["calibration"]["upgrade_count"] == 1


def test_digest_activity_window(conn):
    seed_scenario(conn)
    # All seeded history is in early August; a window ending 2026-08-31 (7d) sees
    # no submissions in-window, but a wide window does.
    narrow = D.build_digest(conn, "2026-08-31T00:00:00Z", window_days=7)
    assert narrow["activity"]["submissions"] == 0
    wide = D.build_digest(conn, "2026-08-31T00:00:00Z", window_days=60)
    assert wide["activity"]["submissions"] == 3


def test_render_text_runs_and_contains_sections(conn):
    seed_scenario(conn)
    d = D.build_digest(conn, "2026-08-31T00:00:00Z", window_days=30)
    text = D.render_text(d)
    for header in ("WEEKLY DIGEST", "ACTIVITY", "OUTCOMES", "SOURCE HEALTH",
                   "CALIBRATION", "REMINDERS"):
        assert header in text
    assert "shortlist precision: 80%" in text


def test_digest_on_empty_log_is_safe(conn):
    d = D.build_digest(conn, "2026-08-31T00:00:00Z")
    assert d["metrics"]["submissions"] == 0
    D.render_text(d)   # must not raise
