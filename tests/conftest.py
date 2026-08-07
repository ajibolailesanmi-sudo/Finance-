"""Shared test fixtures: an in-memory migrated DB + row helpers."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from jobagent.common import db as dbm

FIXTURES = Path(__file__).parent / "fixtures"
NOW = "2026-08-06T00:00:00Z"


@pytest.fixture
def conn():
    c = dbm.connect(":memory:")
    dbm.migrate(c, NOW)
    yield c
    c.close()


def make_posting(conn, *, company="Acme", title="Director", url=None, dedup_key=None,
                 ats="greenhouse") -> int:
    from jobagent.discovery.normalize import dedup_key as mk_key
    url = url or f"https://ex.com/{title.replace(' ', '-').lower()}"
    key = dedup_key or mk_key(company, title, url)
    cur = conn.execute(
        "INSERT INTO postings (dedup_key, company, title, apply_url, ats_platform, first_seen_at)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (key, company, title, url, ats, NOW),
    )
    return cur.lastrowid


def make_application(conn, posting_id=None, *, state="DISCOVERED", **posting_kw) -> int:
    if posting_id is None:
        posting_id = make_posting(conn, **posting_kw)
    cur = conn.execute(
        "INSERT INTO applications (posting_id, state) VALUES (?, ?)",
        (posting_id, state),
    )
    app_id = cur.lastrowid
    conn.execute(
        "INSERT INTO state_history (application_id, from_state, to_state, actor, at)"
        " VALUES (?, NULL, ?, 'system', ?)",
        (app_id, state, NOW),
    )
    conn.commit()
    return app_id


def add_assessment(conn, posting_id, *, tier="APPLY_NOW", fit=90):
    conn.execute(
        """INSERT INTO assessments (posting_id, scored_at, model_id, prompt_version,
           criteria_version, fit_score, tier, rationale, matched_qualifications,
           missing_qualifications, dealbreaker_hits)
           VALUES (?, ?, 'mock', 'v1', 'c1', ?, ?, 'r', '[]', '[]', '[]')""",
        (posting_id, NOW, fit, tier),
    )
    conn.commit()
