"""F9 — reminders on a per-state cadence + interview-prep tasks.

Reminders are suggestions only; acting on them is a human action (F8/F10). They
are derived from the log: how long an application has sat in its current state,
and overdue next_action_date values.

Proof: tests/test_reminders.py.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date

DEFAULT_CADENCE = {
    "followup_days": 7,   # SUBMITTED / ACKNOWLEDGED / SCREENING silence -> follow up
    "gate2_days": 3,      # DRAFTED awaiting Gate 2
    "submit_days": 3,     # PREFILLED awaiting the Candidate's submit
}

_FOLLOWUP_STATES = ("SUBMITTED", "ACKNOWLEDGED", "SCREENING")


@dataclass
class Reminder:
    app_id: int
    kind: str        # 'follow_up' | 'gate2' | 'submit' | 'next_action' | 'interview_prep'
    message: str
    age_days: int


def _days(a: str, b: str) -> int:
    return (date.fromisoformat(a[:10]) - date.fromisoformat(b[:10])).days


def _last_change(conn: sqlite3.Connection) -> dict[int, str]:
    rows = conn.execute(
        "SELECT application_id, MAX(at) FROM state_history GROUP BY application_id"
    ).fetchall()
    return {r[0]: r[1] for r in rows}


def compute_reminders(conn: sqlite3.Connection, today: str, cadence: dict | None = None) -> list[Reminder]:
    cad = {**DEFAULT_CADENCE, **(cadence or {})}
    last = _last_change(conn)
    out: list[Reminder] = []

    rows = conn.execute(
        """SELECT app.id AS id, app.state AS state, app.next_action,
                  app.next_action_date, p.company, p.title
           FROM applications app JOIN postings p ON p.id = app.posting_id"""
    ).fetchall()
    for r in rows:
        aid, state = r["id"], r["state"]
        age = _days(today, last[aid]) if aid in last else 0
        label = f"{r['company']} — {r['title']}"

        if state in _FOLLOWUP_STATES and age >= cad["followup_days"]:
            out.append(Reminder(aid, "follow_up",
                                f"{label}: {age}d silent in {state} — consider a follow-up", age))
        elif state == "DRAFTED" and age >= cad["gate2_days"]:
            out.append(Reminder(aid, "gate2",
                                f"{label}: draft waiting {age}d for Gate 2 review", age))
        elif state == "PREFILLED" and age >= cad["submit_days"]:
            out.append(Reminder(aid, "submit",
                                f"{label}: pre-filled {age}d ago, awaiting your submit (F7)", age))
        elif state == "INTERVIEWING":
            out.append(Reminder(aid, "interview_prep",
                                f"{label}: interviewing — prepare (F9 interview-prep task)", age))

        # Overdue explicit next_action (independent of state).
        if r["next_action_date"] and r["next_action_date"][:10] < today[:10] and state not in ("ARCHIVED",):
            out.append(Reminder(aid, "next_action",
                                f"{label}: next action overdue — {r['next_action'] or 'see notes'}",
                                _days(today, r["next_action_date"])))
    return out
