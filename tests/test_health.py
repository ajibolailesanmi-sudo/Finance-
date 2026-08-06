"""F12 — a seeded dead source alerts within one cycle; the run continues."""
from conftest import FIXTURES, NOW

from jobagent.common.alerts import AlertCollector
from jobagent.common.sources_sync import sync_sources
from jobagent.discovery.run import discover
from jobagent.health import monitor

GOOD = {"id": "gh", "type": "board_api", "name": "GH", "config": '{"platform":"greenhouse","company":"Acme"}',
        "enabled": 1, "denylisted": 0, "pacing": '{"min_interval":0}', "alert_threshold": 3}
DEAD = {"id": "dead", "type": "board_api", "name": "Dead Source", "config": '{"platform":"greenhouse","company":"X"}',
        "enabled": 1, "denylisted": 0, "pacing": '{"min_interval":0}', "alert_threshold": 2}


def _fetch(src):
    if src["id"] == "dead":
        raise ConnectionError("endpoint 500")
    return (FIXTURES / "greenhouse_sample.json").read_text()


def test_dead_source_alerts_but_run_continues(conn):
    sync_sources(conn, [GOOD, DEAD])
    alerts = AlertCollector()
    summary = discover(conn, [GOOD, DEAD], _fetch, NOW, alerts)

    # The good source still produced postings — one failure didn't kill the run.
    assert summary["new_postings"] == 2
    assert summary["sources_ok"] == 1 and summary["sources_failed"] == 1
    # An alert was raised for the dead source within this cycle.
    assert any("dead" in a.key for a in alerts.alerts)
    line = monitor.run_summary_line(summary, alerts)
    assert "1 failing" in line


def test_auto_disable_at_threshold(conn):
    sync_sources(conn, [DEAD])
    alerts = AlertCollector()
    discover(conn, [DEAD], _fetch, NOW, alerts)   # failure 1 (threshold 2)
    row = conn.execute("SELECT enabled, consecutive_failures FROM sources WHERE id='dead'").fetchone()
    assert row["enabled"] == 1 and row["consecutive_failures"] == 1

    # Reload enabled sources and fail again -> reaches threshold -> auto-disabled.
    discover(conn, [dict(conn.execute("SELECT * FROM sources WHERE id='dead'").fetchone())],
             _fetch, NOW, alerts)
    row = conn.execute("SELECT enabled, consecutive_failures FROM sources WHERE id='dead'").fetchone()
    assert row["enabled"] == 0 and row["consecutive_failures"] == 2
    assert any(a.severity == "error" for a in alerts.alerts)
