#!/usr/bin/env python3
"""F0.2 — source registry admin (expansion + re-enable after a fix).

  list                    show sources with health
  sync                    reload config/sources.yaml (validates; refuses bad/I5)
  reenable <id>           re-enable an auto-disabled source (human action, F12)
  disable  <id>           disable a source

A denylisted source (LinkedIn, I5) can never be enabled here.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.common.sources_sync import sync_sources

ROOT = Path(__file__).resolve().parent.parent


def _conn(db):
    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    return dbm.connect(db or (ROOT / settings.get("db_path", "data/app.db")))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Source registry admin (F0.2).")
    ap.add_argument("cmd", choices=["list", "sync", "reenable", "disable"])
    ap.add_argument("source_id", nargs="?")
    ap.add_argument("--db", default=None)
    args = ap.parse_args(argv)

    conn = _conn(args.db)
    if args.cmd == "list":
        for r in conn.execute("SELECT id, name, enabled, denylisted, consecutive_failures, last_success_at FROM sources"):
            flag = "DENYLISTED" if r["denylisted"] else ("on" if r["enabled"] else "OFF")
            print(f"  [{flag:>10}] {r['id']:<20} fails={r['consecutive_failures']} "
                  f"last_ok={r['last_success_at'] or 'never'}  {r['name']}")
    elif args.cmd == "sync":
        rows = cfg.load_sources(ROOT / "config" / "sources.yaml")
        n = sync_sources(conn, rows)
        print(f"synced {n} source(s) from config/sources.yaml")
    elif args.cmd in ("reenable", "disable"):
        if not args.source_id:
            print("source_id required", file=sys.stderr); return 1
        row = conn.execute("SELECT denylisted FROM sources WHERE id=?", (args.source_id,)).fetchone()
        if row is None:
            print(f"no such source {args.source_id}", file=sys.stderr); return 1
        if args.cmd == "reenable":
            if row["denylisted"]:
                print(f"refused: {args.source_id} is denylisted (I5) and cannot be enabled", file=sys.stderr)
                return 1
            conn.execute("UPDATE sources SET enabled=1, consecutive_failures=0 WHERE id=?", (args.source_id,))
            print(f"{args.source_id} re-enabled (failure counter reset)")
        else:
            conn.execute("UPDATE sources SET enabled=0 WHERE id=?", (args.source_id,))
            print(f"{args.source_id} disabled")
        conn.commit()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
