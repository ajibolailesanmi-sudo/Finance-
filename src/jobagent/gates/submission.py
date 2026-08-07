"""F7 — Gate 3: final review & manual submission (human, absolute).

This lives in gates/ (the review surface), NOT in prefill/ — the pre-fill package
has no submit capability at all (I1). The Candidate physically clicks submit in
the browser, then confirms here; PREFILLED -> SUBMITTED is CANDIDATE-ONLY and is
recorded with the approved-version audit trail (I4). Declining keeps the app at
PREFILLED (with a note) or withdraws it.

Proof: tests/test_submission.py.
"""
from __future__ import annotations

import sqlite3

from . import transitions


def confirm_submitted(
    conn: sqlite3.Connection,
    app_id: int,
    now: str,
    *,
    confirmation_ref: str | None = None,
) -> None:
    """Record that the Candidate personally submitted this application (Gate 3)."""
    fields = {}
    if confirmation_ref:
        fields["notes"] = f"employer confirmation: {confirmation_ref}"
    transitions.transition(
        conn, app_id, "SUBMITTED", actor=transitions.CANDIDATE, now=now,
        note="submitted by candidate", fields=fields or None,
    )


def decline_submission(
    conn: sqlite3.Connection,
    app_id: int,
    now: str,
    *,
    note: str,
    withdraw: bool = False,
) -> None:
    """Candidate declined to submit: withdraw, or leave PREFILLED with a note."""
    if withdraw:
        transitions.transition(conn, app_id, "WITHDRAWN", actor=transitions.CANDIDATE,
                               now=now, note=note, fields={"notes": note})
    else:
        # Stay PREFILLED; just annotate (no state change, so not via the guard).
        conn.execute("UPDATE applications SET notes = ? WHERE id = ? AND state = 'PREFILLED'",
                     (note, app_id))
        conn.commit()
