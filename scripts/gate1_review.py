#!/usr/bin/env python3
"""F3 — Gate 1 review surface (v1 = spreadsheet/CLI).

  export : write the ranked SCORED queue to a CSV the Candidate fills in
  import : apply a filled CSV's decisions (SHORTLISTED/DECLINED)
  list   : print the queue to the terminal

Decisions go through transitions.py as actor=candidate — the ONLY way a
SCORED item advances (system callers are refused, I2).
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.tracking import queue as q

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _conn(db):
    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    return dbm.connect(db or (ROOT / settings.get("db_path", "data/app.db")))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Gate 1 shortlist review (F3).")
    ap.add_argument("cmd", choices=["export", "import", "list"])
    ap.add_argument("--db", default=None)
    ap.add_argument("--file", default="review/gate1_queue.csv")
    args = ap.parse_args(argv)

    conn = _conn(args.db)
    if args.cmd in ("export", "list"):
        rows = q.build_gate1_queue(conn)
        if args.cmd == "list":
            for r in rows:
                print(f"[{r['tier']:<9} {r['fit_score']:>3}] #{r['app_id']} "
                      f"{r['company']} — {r['title']}")
            print(f"({len(rows)} item(s) awaiting Gate 1)")
        else:
            out = ROOT / args.file
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(q.to_csv(rows), encoding="utf-8")
            print(f"Wrote {len(rows)} item(s) to {out}. Fill the 'decision' column, then import.")
    else:  # import
        csv_text = (ROOT / args.file).read_text(encoding="utf-8")
        summary = q.apply_decisions_csv(conn, csv_text, _now())
        print(f"Applied: {summary['shortlisted']} shortlisted, "
              f"{summary['declined']} declined, {summary['skipped']} left queued.")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
