#!/usr/bin/env python3
"""F8 — pipeline status upkeep CLI.

  set   <app_id> <STATE> [--note ...] [--outcome ...]   advance a submitted app
  stale                                                  list STALE suggestions
  show  <app_id>                                         print state history

All writes go through transitions.py as actor=candidate.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.tracking import status as S

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _conn(db):
    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    return dbm.connect(db or (ROOT / settings.get("db_path", "data/app.db"))), settings


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Pipeline status upkeep (F8).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    ap.add_argument("--db", default=None)

    p_set = sub.add_parser("set")
    p_set.add_argument("app_id", type=int)
    p_set.add_argument("state")
    p_set.add_argument("--note", default=None)
    p_set.add_argument("--outcome", default=None)

    sub.add_parser("stale")

    p_show = sub.add_parser("show")
    p_show.add_argument("app_id", type=int)

    args = ap.parse_args(argv)
    conn, settings = _conn(args.db)

    if args.cmd == "set":
        S.update_status(conn, args.app_id, args.state, _now(), note=args.note, outcome=args.outcome)
        print(f"#{args.app_id} -> {args.state.upper()}")
    elif args.cmd == "stale":
        days = settings.get("status", {}).get("stale_after_days", 21)
        ids = S.suggest_stale(conn, _now(), days)
        print(f"STALE suggestions (silent >= {days}d): {ids or 'none'}")
    elif args.cmd == "show":
        for h in S.history(conn, args.app_id):
            print(f"  {h['at']}  {h['from_state']} -> {h['to_state']}  ({h['actor']})"
                  + (f"  {h['note']}" if h['note'] else ""))
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
