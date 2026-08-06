"""F3 — Gate 1 review queue (v1 surface = ranked spreadsheet/CLI).

Shows only SCORED items (nothing that hasn't cleared scoring, and nothing past
the gate), ranked APPLY_NOW > CONSIDER > SKIP then by fit_score desc, so a timed
session can clear it top-down. Decisions are applied through transitions.py,
which stamps g1_* and enforces the CANDIDATE-ONLY rule.

Proof: tests/test_queue.py.
"""
from __future__ import annotations

import csv
import io
import json
import sqlite3

from ..gates import transitions

_TIER_RANK = {"APPLY_NOW": 0, "CONSIDER": 1, "SKIP": 2}

QUEUE_COLUMNS = [
    "app_id", "tier", "fit_score", "company", "title", "location",
    "work_arrangement", "apply_url", "rationale",
    "matched_qualifications", "missing_qualifications",
]


def build_gate1_queue(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT app.id AS app_id, a.tier, a.fit_score, p.company, p.title,
               p.location, p.work_arrangement, p.apply_url, a.rationale,
               a.matched_qualifications, a.missing_qualifications
        FROM applications app
        JOIN postings p ON p.id = app.posting_id
        JOIN assessments a ON a.posting_id = p.id
        WHERE app.state = 'SCORED'
        """
    ).fetchall()
    out = [dict(r) for r in rows]
    out.sort(key=lambda r: (_TIER_RANK.get(r["tier"], 9), -int(r["fit_score"])))
    return out


def to_csv(rows: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=QUEUE_COLUMNS + ["decision", "note"])
    w.writeheader()
    for r in rows:
        row = {k: r.get(k, "") for k in QUEUE_COLUMNS}
        for jcol in ("matched_qualifications", "missing_qualifications"):
            val = row.get(jcol)
            if isinstance(val, str) and val.startswith("["):
                try:
                    row[jcol] = "; ".join(json.loads(val))
                except Exception:
                    pass
        row["decision"] = ""   # candidate fills: SHORTLISTED / DECLINED
        row["note"] = ""
        w.writerow(row)
    return buf.getvalue()


def apply_decision(
    conn: sqlite3.Connection,
    app_id: int,
    decision: str,
    now: str,
    *,
    note: str | None = None,
) -> None:
    """Apply a human Gate-1 decision. decision in {SHORTLISTED, DECLINED}."""
    decision = decision.strip().upper()
    if decision not in ("SHORTLISTED", "DECLINED"):
        raise ValueError(f"invalid Gate-1 decision {decision!r}")
    transitions.transition(
        conn, app_id, decision, actor=transitions.CANDIDATE, now=now, note=note
    )


def apply_decisions_csv(conn: sqlite3.Connection, csv_text: str, now: str) -> dict:
    """Import a filled decision CSV. Blank decisions are left queued."""
    reader = csv.DictReader(io.StringIO(csv_text))
    summary = {"shortlisted": 0, "declined": 0, "skipped": 0}
    for row in reader:
        decision = (row.get("decision") or "").strip().upper()
        if not decision:
            summary["skipped"] += 1
            continue
        apply_decision(conn, int(row["app_id"]), decision, now, note=row.get("note") or None)
        summary["shortlisted" if decision == "SHORTLISTED" else "declined"] += 1
    return summary
