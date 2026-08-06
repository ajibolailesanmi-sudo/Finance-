#!/usr/bin/env python3
"""Phase 1 discovery spike (A3) — probe real posting endpoints for readability.

Read-only, paced (I6), non-mutating (never writes app.db). Confirms whether
Greenhouse/Lever/RSS endpoints for real target companies return parseable
postings. Enabling any verified source for production remains a Candidate ToS
decision (stop condition §10).

  python3 scripts/spike_discovery.py                     # live probe (needs egress)
  python3 scripts/spike_discovery.py --fixtures DIR      # offline instrument self-test
                                                         #   reads DIR/<label-slug>.txt

Exit code: 0 if A3 is verified (>=2 endpoints across >=2 platforms readable),
else 1 — so it doubles as a CI check once egress is available.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common.denylist import assert_not_denylisted
from jobagent.discovery import spike as S

ROOT = Path(__file__).resolve().parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _slug(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


def make_live_fetch():
    def fetch(url: str) -> str:
        assert_not_denylisted(url, context="spike fetch")  # I5, belt-and-braces
        req = urllib.request.Request(url, headers={"User-Agent": "hitl-job-agent-spike/0.1"})
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            return resp.read().decode("utf-8", "replace")
    return fetch


def make_fixture_fetch(candidates: list[dict], fixtures_dir: Path):
    """Offline: map each candidate's endpoint back to DIR/<label-slug>.txt."""
    by_endpoint = {}
    for c in candidates:
        ep = S.build_endpoint(c["platform"], c.get("token") or c.get("endpoint") or "")
        by_endpoint[ep] = fixtures_dir / f"{_slug(c.get('label',''))}.txt"

    def fetch(url: str) -> str:
        path = by_endpoint.get(url)
        if not path or not path.exists():
            raise FileNotFoundError(f"no fixture for {url}")
        return path.read_text(encoding="utf-8")
    return fetch


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Phase 1 discovery spike (A3).")
    ap.add_argument("--candidates", default="config/spike_candidates.yaml")
    ap.add_argument("--fixtures", default=None, help="offline dir of <label-slug>.txt payloads")
    ap.add_argument("--report", default="data/spike_report.json")
    ap.add_argument("--min-interval", type=float, default=3.0)
    args = ap.parse_args(argv)

    doc = cfg.load_yaml(ROOT / args.candidates) or {}
    candidates = doc.get("candidates", [])
    if not candidates:
        print("no candidates configured", file=sys.stderr)
        return 1

    if args.fixtures:
        fetch = make_fixture_fetch(candidates, Path(args.fixtures))
        sleep = lambda _s: None            # don't actually pace in the offline self-test
    else:
        fetch = make_live_fetch()
        sleep = time.sleep                 # real pacing (I6) for live probes

    now = _now()
    results = S.run_spike(candidates, fetch, now, sleep=sleep, min_interval=args.min_interval)
    summary = S.summarize(results)

    print(f"\nDiscovery spike (A3) — {now}\n" + "=" * 60)
    for r in results:
        status = "OK " if r.ok else "-- "
        print(f"[{status}] {r.platform:<10} {r.label}")
        print(f"        {r.endpoint}")
        if r.ok:
            print(f"        {r.normalized_count}/{r.raw_count} postings; e.g. "
                  + "; ".join(r.sample_titles[:2]))
        else:
            print(f"        {r.error}")
    print("=" * 60)
    print(f"probed={summary['probed']}  verified={summary['verified']}  "
          f"by_platform={summary['verified_by_platform']}  "
          f"postings={summary['total_normalized_postings']}")
    print(f"A3 verified: {summary['a3_verified']}")

    out = ROOT / args.report
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(
        {"now": now, "summary": summary, "results": [r.as_row() for r in results]},
        indent=2), encoding="utf-8")
    print(f"report -> {out}")
    return 0 if summary["a3_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
