#!/usr/bin/env python3
"""F5 — Gate 2 materials review & approval.

  list                          show DRAFTED bundles + their versions
  show   <app_id>               print each draft's content
  approve <app_id>              approve every current draft version -> APPROVED
  rework <app_id> --notes "..." bounce back to F4 with notes

Approvals/reworks go through transitions.py as actor=candidate.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.gates import materials

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _conn(db):
    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    return dbm.connect(db or (ROOT / settings.get("db_path", "data/app.db")))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Gate 2 materials review (F5).")
    ap.add_argument("cmd", choices=["list", "show", "approve", "rework"])
    ap.add_argument("app_id", nargs="?", type=int)
    ap.add_argument("--db", default=None)
    ap.add_argument("--notes", default=None)
    args = ap.parse_args(argv)

    conn = _conn(args.db)
    queue = materials.build_gate2_queue(conn)

    if args.cmd == "list":
        for item in queue:
            kinds = ", ".join(item["versions"])
            print(f"#{item['app_id']} {item['company']} — {item['title']}  [{kinds}]")
        print(f"({len(queue)} bundle(s) awaiting Gate 2)")
    elif args.cmd == "show":
        item = next((i for i in queue if i["app_id"] == args.app_id), None)
        if not item:
            print(f"app {args.app_id} not in Gate 2 queue"); return 1
        for kind, v in item["versions"].items():
            print(f"\n===== {kind} (v{v['version_n']}, cites {v['citations']}) =====")
            print(Path(v["content_path"]).read_text(encoding="utf-8"))
    elif args.cmd == "approve":
        item = next((i for i in queue if i["app_id"] == args.app_id), None)
        if not item:
            print(f"app {args.app_id} not in Gate 2 queue"); return 1
        vids = {k: v["version_id"] for k, v in item["versions"].items()}
        materials.approve_bundle(conn, args.app_id, vids, _now())
        print(f"#{args.app_id} APPROVED; locked versions: {vids}")
    elif args.cmd == "rework":
        if not args.notes:
            print("rework requires --notes", file=sys.stderr); return 1
        materials.rework(conn, args.app_id, args.notes, _now())
        print(f"#{args.app_id} -> REWORK with notes")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
