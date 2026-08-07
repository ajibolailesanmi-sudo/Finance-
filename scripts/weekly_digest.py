#!/usr/bin/env python3
"""F9 — weekly digest (+ F11 calibration + F12 health, all from the log).

  python3 scripts/weekly_digest.py                 # print + write data/digest_latest.txt
  python3 scripts/weekly_digest.py --json          # emit the raw digest dict as JSON
  python3 scripts/weekly_digest.py --window 14

Digest generation never blocks the pipeline; failure is alerted, not fatal (F9).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.tracking import digest as dg

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Weekly digest (F9).")
    ap.add_argument("--db", default=None)
    ap.add_argument("--window", type=int, default=None)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    conn = dbm.connect(args.db or (ROOT / settings.get("db_path", "data/app.db")))
    window = args.window or settings.get("digest", {}).get("window_days", 7)
    cadence = settings.get("reminders", None)

    d = dg.build_digest(conn, _now(), window_days=window, cadence=cadence)
    if args.json:
        print(json.dumps(d, indent=2))
    else:
        text = dg.render_text(d)
        print(text)
        out = ROOT / "data" / "digest_latest.txt"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
        print(f"\n(written to {out})")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
