"""F11 — calibration analysis: turn real G1 decisions into tuning signal.

Prepares the numbers the Candidate uses to adjust criteria.md / search_profile /
prompt version. Changes are versioned (assessments carry criteria_version), so a
criteria change never rescores history silently — each version keeps its own
precision, and the before/after view falls straight out of the log.

Proof: tests/test_calibration.py.
"""
from __future__ import annotations

import sqlite3

from . import metrics


def precision_misses(conn: sqlite3.Connection) -> list[dict]:
    """APPLY_NOW roles the Candidate DECLINED at G1 (the scorer was over-confident)."""
    return _decided_with_tier(conn, tier="APPLY_NOW", decision="DECLINED")


def upgrades(conn: sqlite3.Connection) -> list[dict]:
    """CONSIDER roles the Candidate SHORTLISTED (the scorer was under-confident)."""
    return _decided_with_tier(conn, tier="CONSIDER", decision="SHORTLISTED")


def _decided_with_tier(conn, *, tier: str, decision: str) -> list[dict]:
    rows = conn.execute(
        f"""
        SELECT app.id AS app_id, p.company, p.title, a.fit_score, a.criteria_version
        FROM applications app
        {metrics._latest_assessment_join()}
        JOIN postings p ON p.id = app.posting_id
        WHERE a.tier = ?
          AND EXISTS(SELECT 1 FROM state_history h
                     WHERE h.application_id = app.id AND h.to_state = ?)
        """,
        (tier, decision),
    ).fetchall()
    return [dict(r) for r in rows]


def build_calibration(conn: sqlite3.Connection) -> dict:
    """The digest's §calibration payload."""
    misses = precision_misses(conn)
    ups = upgrades(conn)
    return {
        "criteria_versions_in_log": sorted(
            {r[0] for r in conn.execute("SELECT DISTINCT criteria_version FROM assessments")}
        ),
        "precision_by_criteria_version": metrics.precision_by_criteria_version(conn),
        "precision_misses": misses,              # APPLY_NOW -> DECLINED
        "precision_miss_count": len(misses),
        "upgrades": ups,                         # CONSIDER -> SHORTLISTED
        "upgrade_count": len(ups),
        "response_rate_by_tier": metrics.response_rate_by_tier(conn),
        "response_rate_by_source": metrics.response_rate_by_source(conn),
    }
