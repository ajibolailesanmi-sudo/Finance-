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


def add_assessment(conn, posting_id, *, tier="APPLY_NOW", fit=90, criteria_version="c1"):
    conn.execute(
        """INSERT INTO assessments (posting_id, scored_at, model_id, prompt_version,
           criteria_version, fit_score, tier, rationale, matched_qualifications,
           missing_qualifications, dealbreaker_hits)
           VALUES (?, ?, 'mock', 'v1', ?, ?, ?, 'r', '[]', '[]', '[]')""",
        (posting_id, NOW, criteria_version, fit, tier),
    )
    conn.commit()


def seed_app(conn, idx, tier, history, *, criteria_version="criteria-v1", method=None, fit=80):
    """Insert one application with a known assessment tier + state-history journey."""
    from datetime import date, timedelta
    pid = make_posting(conn, company=f"Co{idx}", title=f"Role{idx}")
    add_assessment(conn, pid, tier=tier, fit=fit, criteria_version=criteria_version)
    cur = conn.execute(
        "INSERT INTO applications (posting_id, state, prefill_method) VALUES (?, ?, ?)",
        (pid, history[-1], method))
    aid = cur.lastrowid
    base = date(2026, 8, 1)
    for i, st in enumerate(history):
        at = (base + timedelta(days=i)).isoformat() + "T00:00:00Z"
        conn.execute(
            "INSERT INTO state_history (application_id, from_state, to_state, actor, at) "
            "VALUES (?, ?, ?, 'system', ?)",
            (aid, history[i - 1] if i else None, st, at))
    conn.commit()
    return aid


# A deterministic 8-application scenario with hand-computable metrics (see tests).
_SUBMIT_PATH = ["DISCOVERED", "SCORED", "SHORTLISTED", "DRAFTED", "APPROVED", "PREFILLED", "SUBMITTED"]


def seed_scenario(conn):
    seed_app(conn, 1, "APPLY_NOW", _SUBMIT_PATH + ["ACKNOWLEDGED", "SCREENING", "INTERVIEWING"], method="scripted")
    seed_app(conn, 2, "APPLY_NOW", _SUBMIT_PATH + ["ACKNOWLEDGED"], method="scripted")
    seed_app(conn, 3, "APPLY_NOW", _SUBMIT_PATH, method="scripted")
    seed_app(conn, 4, "APPLY_NOW", ["DISCOVERED", "SCORED", "DECLINED"])              # precision miss
    seed_app(conn, 5, "CONSIDER", ["DISCOVERED", "SCORED", "SHORTLISTED"])            # upgrade
    seed_app(conn, 6, "CONSIDER", ["DISCOVERED", "SCORED", "DECLINED"])
    seed_app(conn, 7, "SKIP", ["DISCOVERED", "SCORED", "DECLINED"])
    seed_app(conn, 8, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED", "DRAFTED", "APPROVED", "PREFILL_FAILED"],
             method="computer_use")
