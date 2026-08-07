#!/usr/bin/env python3
"""F1 -> F2 nightly run: discover, then score. Prints the F12 summary line.

Fetching is paced (I6). By default this uses a stdlib fetcher; pass --fixtures
DIR to run fully offline against saved payloads (proof/demo without network,
without touching real boards). Scoring uses the offline MockLLMClient unless the
Candidate has pinned a model AND authorized spend (D6) — a stop condition.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.common.alerts import AlertCollector
from jobagent.common.denylist import assert_not_denylisted
from jobagent.common.llmclient import make_llm_client
from jobagent.scoring.schema import ASSESSMENT_SCHEMA
from jobagent.common.pacing import Pacer
from jobagent.discovery.run import discover, enabled_sources
from jobagent.health import monitor
from jobagent.scoring.score import score_pending

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_fixture_fetch(fixtures_dir: Path):
    """Offline fetch: read <fixtures_dir>/<source_id>.txt as the payload."""
    def fetch(src: dict):
        path = fixtures_dir / f"{src['id']}.txt"
        return path.read_text(encoding="utf-8")
    return fetch


def make_live_fetch():
    """Paced (I6) network fetch. Refuses denylisted hosts (I5)."""
    def fetch(src: dict):
        conf = json.loads(src["config"])
        endpoint = conf["endpoint"]
        assert_not_denylisted(endpoint, context=f"fetch {src['id']}")
        pacer = Pacer.from_config(json.loads(src["pacing"]))
        pacer.wait()
        with urllib.request.urlopen(endpoint, timeout=30) as resp:  # noqa: S310
            return resp.read().decode("utf-8", "replace")
    return fetch


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Nightly discovery + scoring (F1->F2).")
    ap.add_argument("--db", default=None)
    ap.add_argument("--fixtures", default=None, help="offline: dir of <source_id>.txt payloads")
    args = ap.parse_args(argv)

    now = _now()
    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    db_path = args.db or (ROOT / settings.get("db_path", "data/app.db"))
    conn = dbm.connect(db_path)
    alerts = AlertCollector()

    fetch = make_fixture_fetch(Path(args.fixtures)) if args.fixtures else make_live_fetch()
    sources = enabled_sources(conn)
    disc = discover(conn, sources, fetch, now, alerts)

    resume = (ROOT / "library" / "master_resume.md").read_text(encoding="utf-8")
    criteria = (ROOT / "config" / "criteria.md").read_text(encoding="utf-8")
    # Real Claude scorer only if the Candidate pinned a model AND authorized spend
    # AND a key is present (D6); otherwise the offline mock. Nothing spends by default.
    llm = make_llm_client(settings, output_schema=ASSESSMENT_SCHEMA)
    score = score_pending(conn, llm, resume, criteria, now,
                          criteria_version=settings.get("scoring", {}).get("criteria_version", "criteria-v1"),
                          alerts=alerts)

    summary = {**disc, **score}
    print("F1/F2 nightly:", monitor.run_summary_line(disc, alerts))
    print("  scoring:", json.dumps(score))
    for line in alerts.summary_lines():
        print("  ", line)
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
