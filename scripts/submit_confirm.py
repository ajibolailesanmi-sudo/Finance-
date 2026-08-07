#!/usr/bin/env python3
"""F7 — Gate 3: record the Candidate's personal submission (or decline).

  list                                   PREFILLED apps awaiting your submit
  submit  <app_id> [--ref CONFIRMATION]  you personally submitted -> SUBMITTED
  hold    <app_id> --note "..."          stay PREFILLED with a note
  withdraw <app_id> --note "..."         withdraw the application

This tool records a human action; it cannot itself submit anything (I1).
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.gates import submission

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _conn(db):
    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    return dbm.connect(db or (ROOT / settings.get("db_path", "data/app.db")))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Gate 3 submission recording (F7).")
    ap.add_argument("cmd", choices=["list", "submit", "hold", "withdraw"])
    ap.add_argument("app_id", nargs="?", type=int)
    ap.add_argument("--db", default=None)
    ap.add_argument("--ref", default=None)
    ap.add_argument("--note", default=None)
    args = ap.parse_args(argv)

    conn = _conn(args.db)
    if args.cmd == "list":
        rows = conn.execute(
            """SELECT app.id, p.company, p.title, app.screenshot_path
               FROM applications app JOIN postings p ON p.id = app.posting_id
               WHERE app.state = 'PREFILLED'"""
        ).fetchall()
        for r in rows:
            print(f"#{r['id']} {r['company']} — {r['title']}  (review: {r['screenshot_path']})")
        print(f"({len(rows)} awaiting your personal submit)")
    elif args.cmd == "submit":
        submission.confirm_submitted(conn, args.app_id, _now(), confirmation_ref=args.ref)
        print(f"#{args.app_id} -> SUBMITTED (confirmed by you)")
    elif args.cmd == "hold":
        submission.decline_submission(conn, args.app_id, _now(), note=args.note or "on hold")
        print(f"#{args.app_id} held at PREFILLED")
    elif args.cmd == "withdraw":
        submission.decline_submission(conn, args.app_id, _now(), note=args.note or "withdrawn", withdraw=True)
        print(f"#{args.app_id} -> WITHDRAWN")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
