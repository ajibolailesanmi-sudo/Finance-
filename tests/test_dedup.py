"""Dedup determinism: the same crawl twice inserts zero new rows."""
from conftest import FIXTURES, NOW

from jobagent.common.alerts import AlertCollector
from jobagent.discovery.run import discover

SOURCES = [{
    "id": "gh", "type": "board_api", "name": "GH", "enabled": 1, "denylisted": 0,
    "config": '{"platform": "greenhouse", "company": "Example CGT Co"}',
    "pacing": '{"min_interval": 0}', "alert_threshold": 3,
}]


def _fetch(_src):
    return (FIXTURES / "greenhouse_sample.json").read_text()


def test_same_crawl_twice_is_idempotent(conn):
    first = discover(conn, SOURCES, _fetch, NOW, AlertCollector())
    assert first["new_postings"] == 2 and first["duplicates"] == 0

    second = discover(conn, SOURCES, _fetch, NOW, AlertCollector())
    assert second["new_postings"] == 0
    assert second["duplicates"] == 2

    assert conn.execute("SELECT COUNT(*) FROM postings").fetchone()[0] == 2
    assert conn.execute("SELECT COUNT(*) FROM applications").fetchone()[0] == 2
    # One application stub per posting, all DISCOVERED.
    assert conn.execute("SELECT COUNT(*) FROM applications WHERE state='DISCOVERED'").fetchone()[0] == 2


def test_provenance_merged_not_duplicated(conn):
    discover(conn, SOURCES, _fetch, NOW, AlertCollector())
    discover(conn, SOURCES, _fetch, NOW, AlertCollector())
    # Same source seen twice -> provenance row deduped by PK.
    assert conn.execute("SELECT COUNT(*) FROM posting_sources").fetchone()[0] == 2
