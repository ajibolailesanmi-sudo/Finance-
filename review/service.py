"""Review-surface service layer (no Streamlit import — offline-testable).

The Streamlit dashboard (review/dashboard.py) is a thin view over this module,
which itself is a thin adapter over the already-tested tracking/gates/health
modules. All state changes go through the same transitions.py guard, so every
invariant holds regardless of surface:

  * Gate 1/2/3/4 decisions are CANDIDATE-ONLY (I2) — the dashboard can only
    invoke them as the human acting on explicit input.
  * Gate 3 here RECORDS the Candidate's own submission (F7); there is no
    employer-submit code path on this surface (I1).
  * Approval locks exact versions (I4); claim validation already gated drafts (I3).

Proof: tests/test_review_service.py.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from jobagent.common import db as dbm
from jobagent.gates import materials as g2
from jobagent.gates import submission as g3
from jobagent.health import monitor
from jobagent.tailoring import outreach
from jobagent.tracking import digest as dg
from jobagent.tracking import queue as g1q
from jobagent.tracking import reminders as rem

GATES = ("g1", "g2", "g3", "g4")


def connect(db_path: str | Path) -> sqlite3.Connection:
    return dbm.connect(db_path)


# --- Overview ---------------------------------------------------------------
def counts(conn: sqlite3.Connection) -> dict:
    g1 = len(g1q.build_gate1_queue(conn))
    g2n = len(g2.build_gate2_queue(conn))
    g3n = conn.execute("SELECT COUNT(*) FROM applications WHERE state='PREFILLED'").fetchone()[0]
    g4n = conn.execute("SELECT COUNT(*) FROM outreach_drafts WHERE status != 'sent_by_human'").fetchone()[0]
    return {"g1": g1, "g2": g2n, "g3": g3n, "g4": g4n}


def overview(conn: sqlite3.Connection, now: str, cadence: dict | None = None) -> dict:
    return {
        "counts": counts(conn),
        "reminders": [r.__dict__ for r in rem.compute_reminders(conn, now, cadence)],
        "health": monitor.health_snapshot(conn),
    }


# --- Gate 1 -----------------------------------------------------------------
def gate1_queue(conn: sqlite3.Connection) -> list[dict]:
    return g1q.build_gate1_queue(conn)


def decide_gate1(conn: sqlite3.Connection, app_id: int, decision: str, now: str, note: str | None = None) -> None:
    g1q.apply_decision(conn, app_id, decision, now, note=note)


# --- Gate 2 -----------------------------------------------------------------
def gate2_queue(conn: sqlite3.Connection) -> list[dict]:
    items = g2.build_gate2_queue(conn)
    for item in items:
        for kind, v in item["versions"].items():
            p = Path(v["content_path"])
            v["content"] = p.read_text(encoding="utf-8") if p.exists() else "(content unavailable)"
    return items


def approve_gate2(conn: sqlite3.Connection, app_id: int, now: str) -> None:
    item = next((i for i in g2.build_gate2_queue(conn) if i["app_id"] == app_id), None)
    if not item:
        raise ValueError(f"app {app_id} not in Gate 2 queue")
    vids = {k: v["version_id"] for k, v in item["versions"].items()}
    g2.approve_bundle(conn, app_id, vids, now)   # locks versions (I4)


def rework_gate2(conn: sqlite3.Connection, app_id: int, notes: str, now: str) -> None:
    g2.rework(conn, app_id, notes, now)


# --- Gate 3 (record the Candidate's own submission — F7; no submit here, I1) -
def gate3_queue(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT app.id AS app_id, p.company, p.title, p.ats_platform, p.apply_url,
                  app.prefill_method, app.screenshot_path
           FROM applications app JOIN postings p ON p.id = app.posting_id
           WHERE app.state = 'PREFILLED'"""
    ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        sp = d.get("screenshot_path")
        d["capture"] = (Path(sp).read_text(encoding="utf-8")
                        if sp and Path(sp).exists() and str(sp).endswith(".txt") else None)
        out.append(d)
    return out


def record_submission(conn: sqlite3.Connection, app_id: int, now: str, confirmation_ref: str | None = None) -> None:
    g3.confirm_submitted(conn, app_id, now, confirmation_ref=confirmation_ref)


def hold_submission(conn: sqlite3.Connection, app_id: int, now: str, note: str = "held") -> None:
    g3.decline_submission(conn, app_id, now, note=note, withdraw=False)


def withdraw(conn: sqlite3.Connection, app_id: int, now: str, note: str = "withdrawn") -> None:
    g3.decline_submission(conn, app_id, now, note=note, withdraw=True)


# --- Gate 4 -----------------------------------------------------------------
def gate4_queue(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT o.id, o.application_id, o.contact_ref, o.purpose, o.status, o.draft_path,
                  p.company FROM outreach_drafts o
           LEFT JOIN applications a ON a.id = o.application_id
           LEFT JOIN postings p ON p.id = a.posting_id
           WHERE o.status != 'sent_by_human' ORDER BY o.id"""
    ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        p = Path(d["draft_path"])
        d["body"] = p.read_text(encoding="utf-8") if p.exists() else "(draft unavailable)"
        out.append(d)
    return out


def personalize(conn: sqlite3.Connection, draft_id: int) -> None:
    outreach.mark_personalized(conn, draft_id)


def mark_sent(conn: sqlite3.Connection, draft_id: int, now: str) -> None:
    outreach.mark_sent_by_human(conn, draft_id, now)   # no transport (I9)


# --- Pipeline / digest ------------------------------------------------------
def pipeline(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT app.id AS app_id, app.state, p.company, p.title
           FROM applications app JOIN postings p ON p.id = app.posting_id
           ORDER BY app.id"""
    ).fetchall()
    return [dict(r) for r in rows]


def digest(conn: sqlite3.Connection, now: str, window_days: int = 7, cadence: dict | None = None) -> dict:
    return dg.build_digest(conn, now, window_days=window_days, cadence=cadence)
