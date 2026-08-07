"""§11 metrics — all computable from the applications log alone.

Success is outcome quality, not volume (raw application count is explicitly
rejected). Every function here reads only applications / state_history /
assessments / sources, so the weekly digest can be reproduced from the log
(proof: tests/test_metrics.py, tests/test_digest.py).
"""
from __future__ import annotations

import sqlite3

RESPONDED = ("ACKNOWLEDGED", "SCREENING", "INTERVIEWING", "OFFER")
INTERVIEWED = ("INTERVIEWING", "OFFER")


def _reached_count(conn: sqlite3.Connection, states: tuple[str, ...]) -> int:
    q = ("SELECT COUNT(DISTINCT application_id) FROM state_history "
         f"WHERE to_state IN ({','.join('?' * len(states))})")
    return conn.execute(q, states).fetchone()[0]


def _ratio(n: int, d: int) -> float | None:
    return round(n / d, 4) if d else None


def submissions(conn) -> int:
    return _reached_count(conn, ("SUBMITTED",))


def response_rate(conn) -> float | None:
    return _ratio(_reached_count(conn, RESPONDED), submissions(conn))


def interview_conversion(conn) -> float | None:
    return _ratio(_reached_count(conn, INTERVIEWED), submissions(conn))


def _latest_assessment_join() -> str:
    """SQL fragment: join each application to its most recent assessment."""
    return (
        "JOIN assessments a ON a.id = ("
        "  SELECT id FROM assessments a2 WHERE a2.posting_id = app.posting_id "
        "  ORDER BY scored_at DESC, id DESC LIMIT 1)"
    )


def shortlist_precision(conn) -> dict:
    """APPLY_NOW items shortlisted ÷ APPLY_NOW items the Candidate decided at G1."""
    rows = conn.execute(
        f"""
        SELECT a.tier AS tier,
          EXISTS(SELECT 1 FROM state_history h WHERE h.application_id=app.id
                 AND h.to_state='SHORTLISTED') AS shortlisted,
          EXISTS(SELECT 1 FROM state_history h WHERE h.application_id=app.id
                 AND h.to_state IN ('SHORTLISTED','DECLINED')) AS decided
        FROM applications app {_latest_assessment_join()}
        """
    ).fetchall()
    reviewed = sum(1 for r in rows if r["tier"] == "APPLY_NOW" and r["decided"])
    shortlisted = sum(1 for r in rows if r["tier"] == "APPLY_NOW" and r["shortlisted"])
    return {"apply_now_reviewed": reviewed, "apply_now_shortlisted": shortlisted,
            "precision": _ratio(shortlisted, reviewed)}


def precision_by_criteria_version(conn) -> dict[str, dict]:
    """Shortlist precision grouped by the criteria_version that produced the score.

    This is the before/after view F11 uses: a criteria change never rescores
    history, so each version keeps its own precision (proof of calibration effect).
    """
    rows = conn.execute(
        f"""
        SELECT a.criteria_version AS cv, a.tier AS tier,
          EXISTS(SELECT 1 FROM state_history h WHERE h.application_id=app.id
                 AND h.to_state='SHORTLISTED') AS shortlisted,
          EXISTS(SELECT 1 FROM state_history h WHERE h.application_id=app.id
                 AND h.to_state IN ('SHORTLISTED','DECLINED')) AS decided
        FROM applications app {_latest_assessment_join()}
        """
    ).fetchall()
    out: dict[str, dict] = {}
    for r in rows:
        if r["tier"] != "APPLY_NOW" or not r["decided"]:
            continue
        b = out.setdefault(r["cv"], {"reviewed": 0, "shortlisted": 0})
        b["reviewed"] += 1
        b["shortlisted"] += int(bool(r["shortlisted"]))
    for cv, b in out.items():
        b["precision"] = _ratio(b["shortlisted"], b["reviewed"])
    return out


def response_rate_by_tier(conn) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for tier in ("APPLY_NOW", "CONSIDER", "SKIP"):
        rows = conn.execute(
            f"""SELECT app.id AS id FROM applications app {_latest_assessment_join()}
                WHERE a.tier = ?""", (tier,)).fetchall()
        ids = [r["id"] for r in rows]
        if not ids:
            out[tier] = None
            continue
        sub = _count_in(conn, ids, ("SUBMITTED",))
        resp = _count_in(conn, ids, RESPONDED)
        out[tier] = _ratio(resp, sub)
    return out


def response_rate_by_source(conn) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for (sid,) in conn.execute("SELECT DISTINCT source_id FROM posting_sources").fetchall():
        rows = conn.execute(
            """SELECT DISTINCT app.id AS id FROM applications app
               JOIN posting_sources ps ON ps.posting_id = app.posting_id
               WHERE ps.source_id = ?""", (sid,)).fetchall()
        ids = [r["id"] for r in rows]
        out[sid] = _ratio(_count_in(conn, ids, RESPONDED), _count_in(conn, ids, ("SUBMITTED",)))
    return out


def prefill_success_rate(conn) -> dict:
    reached = _reached_count(conn, ("PREFILLED", "PREFILL_FAILED"))
    prefilled = _reached_count(conn, ("PREFILLED",))
    by_method = {m: c for m, c in conn.execute(
        "SELECT prefill_method, COUNT(*) FROM applications "
        "WHERE prefill_method IS NOT NULL GROUP BY prefill_method").fetchall()}
    return {"attempted": reached, "prefilled": prefilled,
            "rate": _ratio(prefilled, reached), "by_method": by_method}


def stale_rate(conn) -> float | None:
    stale = conn.execute("SELECT COUNT(*) FROM applications WHERE state='STALE'").fetchone()[0]
    return _ratio(stale, submissions(conn))


def _count_in(conn, ids: list[int], states: tuple[str, ...]) -> int:
    if not ids:
        return 0
    q = (f"SELECT COUNT(DISTINCT application_id) FROM state_history "
         f"WHERE application_id IN ({','.join('?' * len(ids))}) "
         f"AND to_state IN ({','.join('?' * len(states))})")
    return conn.execute(q, (*ids, *states)).fetchone()[0]


def summary(conn) -> dict:
    """All headline §11 metrics in one dict."""
    return {
        "submissions": submissions(conn),
        "response_rate": response_rate(conn),
        "interview_conversion": interview_conversion(conn),
        "shortlist_precision": shortlist_precision(conn),
        "response_rate_by_tier": response_rate_by_tier(conn),
        "response_rate_by_source": response_rate_by_source(conn),
        "prefill_success_rate": prefill_success_rate(conn),
        "stale_rate": stale_rate(conn),
        # Not instrumented in v1 (needs a review-session timer, §11 D-item):
        "candidate_time_per_application_min": None,
    }
