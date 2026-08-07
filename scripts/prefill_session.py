#!/usr/bin/env python3
"""F6 — attended pre-fill session. Fills each APPROVED application up to the
review screen and halts. NEVER submits (I1); the Candidate submits personally (F7).

  # Real, visible browser (attended). Requires config/applicant.yaml + a display:
  python3 scripts/prefill_session.py

  # Offline halt-at-review proof against local fixture forms:
  python3 scripts/prefill_session.py --fixtures tests/fixtures/forms \\
      --profile tests/fixtures/applicant_demo.yaml
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
from jobagent.common.pacing import Pacer
from jobagent.prefill.driver import FakeDriver, PlaywrightDriver
from jobagent.prefill.profile import load_profile
from jobagent.prefill.session import prefill_batch

ROOT = Path(__file__).resolve().parent.parent
_FIXTURE_BY_PLATFORM = {"greenhouse": "greenhouse_form.html", "lever": "lever_form.html"}


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Pre-fill session (F6).")
    ap.add_argument("--db", default=None)
    ap.add_argument("--fixtures", default=None, help="offline: dir of <platform>_form.html")
    ap.add_argument("--profile", default="config/applicant.yaml")
    args = ap.parse_args(argv)

    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    conn = dbm.connect(args.db or (ROOT / settings.get("db_path", "data/app.db")))
    profile = load_profile(ROOT / args.profile if not str(args.profile).startswith("/") else args.profile)
    pace = Pacer.from_config(settings.get("pacing", {}).get("default", {"min_interval": 0}))

    if args.fixtures:
        fdir = Path(args.fixtures)
        def factory(row):
            fixture = _FIXTURE_BY_PLATFORM.get(row["ats_platform"], "greenhouse_form.html")
            return FakeDriver(str(fdir / fixture))
    else:
        # Real, visible browser — one page reused across the batch.
        chromium = str(next(Path("/opt/pw-browsers").glob("chromium-*/chrome-linux/chrome"), ""))
        driver = PlaywrightDriver.launch(executable_path=chromium or None)
        def factory(row):
            return driver

    alerts = AlertCollector()
    summary = prefill_batch(conn, factory, profile,
                            screenshots_dir=ROOT / "data" / "screenshots",
                            now=_now(), alerts=alerts, pacer=pace)
    print(f"Pre-fill: {summary['prefilled']} halted at review, {summary['failed']} failed.")
    for line in alerts.summary_lines():
        print("  ", line)
    print("Each pre-filled application awaits your personal review & submit (F7).")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
