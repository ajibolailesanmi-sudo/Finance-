"""F5 — Gate 2 materials review & approval surface.

Reads DRAFTED bundles, applies human decisions through transitions.py:
  * approve_bundle -> locks approved_version_ids, freezes those versions (I4),
    transitions DRAFTED -> APPROVED (candidate-only)
  * rework -> DRAFTED -> REWORK with notes, which F4 consumes on regeneration

Nothing downstream (F6) can read a draft version: the pre-fill queue selects on
approved_version_ids, and only approve_bundle sets them. Proof: tests/test_gate2.py.
"""
from __future__ import annotations

import json
import sqlite3

from ..gates import transitions
from ..tailoring import materials_store as store


def build_gate2_queue(conn: sqlite3.Connection) -> list[dict]:
    """DRAFTED apps with their current draft versions per kind (for review)."""
    apps = conn.execute(
        """SELECT app.id AS app_id, p.company, p.title
           FROM applications app JOIN postings p ON p.id = app.posting_id
           WHERE app.state = 'DRAFTED'"""
    ).fetchall()
    out = []
    for a in apps:
        drafts = store.latest_drafts(conn, a["app_id"])
        out.append({
            "app_id": a["app_id"], "company": a["company"], "title": a["title"],
            "versions": {k: {"version_id": v["id"], "version_n": v["version_n"],
                             "content_path": v["content_path"],
                             "citations": json.loads(v["claim_citations"] or "[]"),
                             "human_edited": bool(v["human_edited"])}
                         for k, v in drafts.items()},
        })
    return out


def approve_bundle(
    conn: sqlite3.Connection,
    app_id: int,
    version_ids_by_kind: dict[str, int],
    now: str,
    *,
    note: str | None = None,
) -> None:
    """Approve the named versions and advance the app to APPROVED (Gate 2)."""
    if not version_ids_by_kind:
        raise ValueError("approve_bundle requires at least one kind->version")
    for _kind, vid in version_ids_by_kind.items():
        store.approve_version(conn, vid, now)   # freezes the row (immutable after)
    transitions.transition(
        conn, app_id, "APPROVED", actor=transitions.CANDIDATE, now=now,
        approved_version_ids=version_ids_by_kind, note=note,
    )


def rework(conn: sqlite3.Connection, app_id: int, notes: str, now: str) -> None:
    """Bounce a draft bundle back to F4 with notes (Gate 2)."""
    transitions.transition(
        conn, app_id, "REWORK", actor=transitions.CANDIDATE, now=now,
        note=notes, fields={"notes": notes},
    )
