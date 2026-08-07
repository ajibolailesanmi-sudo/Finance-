#!/usr/bin/env python3
"""F4 — generate tailored materials bundles for SHORTLISTED / REWORK apps.

Offline (MockTailor, no spend). Every quantified claim is validated against the
accomplishment library before a draft is queued (I3); violating drafts are
flagged, not queued. Refuses to run against an empty/unverified library (F0.1).

  python3 scripts/tailor_run.py                      # uses library/accomplishments.yaml
  python3 scripts/tailor_run.py --library <path>     # e.g. a demo library
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.common.alerts import AlertCollector
from jobagent.tailoring.generate import run_tailoring
from jobagent.tailoring.library_loader import EmptyLibraryError, load_library

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Tailoring generation (F4).")
    ap.add_argument("--db", default=None)
    ap.add_argument("--library", default="library/accomplishments.yaml")
    ap.add_argument("--materials", default="materials")
    args = ap.parse_args(argv)

    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    conn = dbm.connect(args.db or (ROOT / settings.get("db_path", "data/app.db")))
    voice = (ROOT / "library" / "voice_guide.md").read_text(encoding="utf-8")
    criteria = (ROOT / "config" / "criteria.md").read_text(encoding="utf-8")

    try:
        library = load_library(ROOT / args.library if not str(args.library).startswith("/") else args.library)
    except EmptyLibraryError as exc:
        print(f"F4 refused: {exc}", file=sys.stderr)
        return 2

    alerts = AlertCollector()
    summary = run_tailoring(conn, library, materials_root=ROOT / args.materials,
                            voice_guide=voice, criteria=criteria, now=_now(), alerts=alerts)
    print(f"Tailoring: {summary['drafted']} drafted, {summary['flagged']} flagged (claim violations).")
    for line in alerts.summary_lines():
        print("  ", line)
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
