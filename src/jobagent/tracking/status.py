"""F8 — pipeline status upkeep (post-submit) + STALE suggestion.

One-touch status updates along the post-submit states (§4). Corrections add a
new history row; history is never rewritten. STALE is only *suggested* by the
system after N silent days — applying it is a human action.

Proof: tests/test_status.py.
"""
from __future__ import annotations

import sqlite3
from datetime import date

from ..gates import transitions

POST_SUBMIT_STATES = {
    "ACKNOWLEDGED", "SCREENING", "INTERVIEWING", "OFFER",
    "REJECTED", "WITHDRAWN", "STALE",
}


def update_status(
    conn: sqlite3.Connection,
    app_id: int,
    to_state: str,
    now: str,
    *,
    note: str | None = None,
    outcome: str | None = None,
) -> None:
    """Advance a submitted application's status (candidate action)."""
    to_state = to_state.strip().upper()
    fields = {}
    if outcome is not None:
        fields["outcome"] = outcome
        fields["outcome_at"] = now
    transitions.transition(
        conn, app_id, to_state, actor=transitions.CANDIDATE, now=now,
        note=note, fields=fields or None,
    )


def suggest_stale(conn: sqlite3.Connection, today: str, silent_days: int) -> list[int]:
    """Return app_ids in SUBMITTED/ACKNOWLEDGED/SCREENING silent >= N days.

    Suggestion only — the caller (human) decides whether to apply STALE.
    """
    today_d = date.fromisoformat(today[:10])
    rows = conn.execute(
        """
        SELECT app.id AS app_id, MAX(h.at) AS last_at
        FROM applications app
        JOIN state_history h ON h.application_id = app.id
        WHERE app.state IN ('SUBMITTED','ACKNOWLEDGED','SCREENING')
        GROUP BY app.id
        """
    ).fetchall()
    out: list[int] = []
    for r in rows:
        last = r["last_at"]
        if not last:
            continue
        gap = (today_d - date.fromisoformat(last[:10])).days
        if gap >= silent_days:
            out.append(r["app_id"])
    return out


def history(conn: sqlite3.Connection, app_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT from_state, to_state, actor, at, note FROM state_history "
        "WHERE application_id = ? ORDER BY id",
        (app_id,),
    ).fetchall()
    return [dict(r) for r in rows]
