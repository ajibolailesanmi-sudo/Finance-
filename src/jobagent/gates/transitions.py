"""I2 — the gate guard. The ONLY module that writes applications.state.

Every state change goes through ``transition()``, which checks, in order:
  (a) transition legality (the edge exists in the state machine, §4);
  (b) required approval timestamps / version ids are present for the target;
  (c) actor authorization — system code can NEVER execute a CANDIDATE-ONLY edge.

CANDIDATE-ONLY edges are reachable only when a review surface (F3/F5/F7/F8 CLI)
calls with actor="candidate" on explicit human input. Any system caller passing
actor="system" onto such an edge is refused (proof: tests/test_transitions.py).
"""
from __future__ import annotations

import json
import sqlite3
from typing import Iterable

# --- Actors -----------------------------------------------------------------
SYSTEM = "system"
CANDIDATE = "candidate"

# --- State machine (PROJECT_BIBLE.md §4) ------------------------------------
LEGAL_TRANSITIONS: dict[str, set[str]] = {
    "DISCOVERED": {"SCORED"},
    "SCORED": {"SHORTLISTED", "DECLINED"},
    "SHORTLISTED": {"DRAFTED"},
    "DECLINED": {"ARCHIVED"},
    "DRAFTED": {"APPROVED", "REWORK"},
    "REWORK": {"DRAFTED"},
    "APPROVED": {"PREFILLED", "PREFILL_FAILED", "SUBMITTED"},
    "PREFILL_FAILED": {"PREFILLED", "ARCHIVED"},
    "PREFILLED": {"SUBMITTED", "WITHDRAWN"},
    "SUBMITTED": {"ACKNOWLEDGED", "REJECTED", "WITHDRAWN", "STALE"},
    "ACKNOWLEDGED": {"SCREENING", "REJECTED", "WITHDRAWN", "STALE"},
    "SCREENING": {"INTERVIEWING", "REJECTED", "WITHDRAWN", "STALE"},
    "INTERVIEWING": {"OFFER", "REJECTED", "WITHDRAWN", "STALE"},
    "OFFER": {"WITHDRAWN", "REJECTED", "ARCHIVED"},
    "REJECTED": {"ARCHIVED"},
    "WITHDRAWN": {"ARCHIVED"},
    "STALE": {"ARCHIVED"},
    "ARCHIVED": set(),
}

# Edges only a human may command (Gates 1–3). All other legal edges are system.
CANDIDATE_ONLY: set[tuple[str, str]] = {
    ("SCORED", "SHORTLISTED"),   # G1
    ("SCORED", "DECLINED"),      # G1
    ("DRAFTED", "APPROVED"),     # G2
    ("DRAFTED", "REWORK"),       # G2
    ("PREFILLED", "SUBMITTED"),  # G3 — physical human click
    ("APPROVED", "SUBMITTED"),   # G3 — manual apply (e.g. LinkedIn-hosted)
}

# Post-submission status upkeep (F8) is also human-owned.
CANDIDATE_ONLY |= {
    (s, t)
    for s in ("SUBMITTED", "ACKNOWLEDGED", "SCREENING", "INTERVIEWING", "OFFER")
    for t in LEGAL_TRANSITIONS.get(s, set())
}


class TransitionError(Exception):
    """Raised when a state change is illegal, unauthorized, or unsupported."""


def is_legal(from_state: str, to_state: str) -> bool:
    return to_state in LEGAL_TRANSITIONS.get(from_state, set())


def _current_state(conn: sqlite3.Connection, application_id: int) -> str:
    row = conn.execute(
        "SELECT state FROM applications WHERE id = ?", (application_id,)
    ).fetchone()
    if row is None:
        raise TransitionError(f"application {application_id} does not exist")
    return row[0]


def transition(
    conn: sqlite3.Connection,
    application_id: int,
    to_state: str,
    *,
    actor: str,
    now: str,
    note: str | None = None,
    tier_at_g1: str | None = None,
    approved_version_ids: dict | None = None,
    fields: dict | None = None,
) -> None:
    """Advance one application to ``to_state``. The only sanctioned state write.

    Enforces legality (a), required approval data (b), and actor authority (c).
    Writes the new state and appends a state_history row atomically.
    """
    if actor not in (SYSTEM, CANDIDATE):
        raise TransitionError(f"unknown actor {actor!r}")
    if to_state not in LEGAL_TRANSITIONS:
        raise TransitionError(f"unknown target state {to_state!r}")

    from_state = _current_state(conn, application_id)

    # (a) legality
    if not is_legal(from_state, to_state):
        raise TransitionError(f"illegal transition {from_state} -> {to_state}")

    # (c) actor authorization
    edge = (from_state, to_state)
    if edge in CANDIDATE_ONLY and actor != CANDIDATE:
        raise TransitionError(
            f"{from_state} -> {to_state} is CANDIDATE-ONLY; system caller refused (I2)"
        )

    # (b) required approval data for specific targets
    updates: dict[str, object] = {"state": to_state}
    if to_state in ("SHORTLISTED", "DECLINED"):
        # G1 records who/when and the tier at decision time (for precision metric).
        updates["g1_approved_at"] = now
        updates["g1_decided_by"] = actor
        if to_state == "SHORTLISTED":
            if not tier_at_g1:
                # default to the assessment tier if not supplied
                tier_at_g1 = _assessment_tier(conn, application_id)
            updates["tier_at_g1"] = tier_at_g1
    if to_state == "APPROVED":
        # G2: approval locks the exact versions that represent the Candidate (I4).
        ids = approved_version_ids or _approved_version_ids(conn, application_id)
        if not ids:
            raise TransitionError("APPROVED requires approved_version_ids (I4)")
        updates["approved_version_ids"] = json.dumps(ids, sort_keys=True)
        updates["g2_approved_at"] = now
    if to_state in ("PREFILLED", "SUBMITTED"):
        # I4: cannot advance to/through prefill or submit without locked versions.
        ids = approved_version_ids or _approved_version_ids(conn, application_id)
        if not ids:
            raise TransitionError(
                f"{to_state} requires approved_version_ids (I4)"
            )
        updates["approved_version_ids"] = json.dumps(ids, sort_keys=True)
    if to_state == "SUBMITTED":
        updates["submitted_at"] = now
        updates["submitted_confirmed_by_human"] = 1  # true by construction (G3)

    if fields:
        # Allow gate surfaces to set adjacent columns (notes, outcome, etc.),
        # but never let a caller sneak in a different 'state'.
        for k, v in fields.items():
            if k == "state":
                raise TransitionError("state may not be set via fields")
            updates[k] = v

    _apply(conn, application_id, updates, from_state, to_state, actor, now, note)


def _assessment_tier(conn: sqlite3.Connection, application_id: int) -> str | None:
    row = conn.execute(
        """
        SELECT a.tier FROM assessments a
        JOIN applications app ON app.posting_id = a.posting_id
        WHERE app.id = ? ORDER BY a.scored_at DESC LIMIT 1
        """,
        (application_id,),
    ).fetchone()
    return row[0] if row else None


def _approved_version_ids(conn: sqlite3.Connection, application_id: int) -> dict:
    row = conn.execute(
        "SELECT approved_version_ids FROM applications WHERE id = ?",
        (application_id,),
    ).fetchone()
    if row and row[0]:
        return json.loads(row[0])
    return {}


def _apply(
    conn: sqlite3.Connection,
    application_id: int,
    updates: dict,
    from_state: str,
    to_state: str,
    actor: str,
    now: str,
    note: str | None,
) -> None:
    cols = ", ".join(f"{k} = ?" for k in updates)
    params: Iterable = list(updates.values()) + [application_id]
    conn.execute(f"UPDATE applications SET {cols} WHERE id = ?", params)
    conn.execute(
        "INSERT INTO state_history (application_id, from_state, to_state, actor, at, note)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (application_id, from_state, to_state, actor, now, note),
    )
    conn.commit()
