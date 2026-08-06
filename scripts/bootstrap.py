#!/usr/bin/env python3
"""F0 — bootstrap the workspace. Idempotent; safe to run twice.

Steps: create directory layout -> run migrations -> validate configs & library
-> sync sources into the DB -> report credential status (named, never prompt to
hardcode). Exits non-zero on config/library error or a missing *required* secret.

Proof: tests/test_bootstrap.py (runs twice, identical result; replays on fresh DB).
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))  # make src/ importable

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.common.library import lint_accomplishments
from jobagent.common.sources_sync import sync_sources

ROOT = Path(__file__).resolve().parent.parent
DIRS = ["config", "library", "data", "data/screenshots", "materials", "prompts"]

# Secrets checked at bootstrap. In Phase 1 the API key is OPTIONAL — scoring runs
# on the offline mock until the Candidate authorizes spend (D6). It becomes
# required only when settings.llm.spend_authorized is true.
OPTIONAL_SECRETS = ["ANTHROPIC_API_KEY"]


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def run(db_path: str | None = None, *, now: str | None = None) -> dict:
    now = now or _now()
    for d in DIRS:
        (ROOT / d).mkdir(parents=True, exist_ok=True)

    settings = cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}
    db_path = db_path or settings.get("db_path", "data/app.db")

    conn = dbm.connect(ROOT / db_path if not str(db_path).startswith("/") else db_path)
    applied = dbm.migrate(conn, now)

    # Validate library (structural) and configs (refuse invalid — I5/I6).
    lib = lint_accomplishments(ROOT / "library" / "accomplishments.yaml")
    sources = cfg.load_sources(ROOT / "config" / "sources.yaml")
    synced = sync_sources(conn, sources)

    spend_authorized = bool(settings.get("llm", {}).get("spend_authorized", False))
    secret_status = {name: bool(os.environ.get(name)) for name in OPTIONAL_SECRETS}
    missing_required = [
        name for name, present in secret_status.items()
        if not present and spend_authorized  # only required once spend is on
    ]

    conn.close()
    return {
        "migrations_applied": applied,
        "sources_synced": synced,
        "library_entries": lib["entries"],
        "library_usable": lib["usable"],
        "secret_status": secret_status,
        "missing_required_secrets": missing_required,
        "db_path": str(db_path),
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Bootstrap the job-agent workspace (F0).")
    ap.add_argument("--db", default=None, help="override db path")
    args = ap.parse_args(argv)
    try:
        result = run(args.db)
    except (cfg.ConfigError, Exception) as exc:  # surface a named, actionable error
        print(f"BOOTSTRAP FAILED: {exc}", file=sys.stderr)
        return 1

    print("Bootstrap OK (idempotent).")
    print(f"  migrations applied this run : {result['migrations_applied'] or 'none (already up to date)'}")
    print(f"  sources synced              : {result['sources_synced']}")
    print(f"  library entries / usable    : {result['library_entries']} / {result['library_usable']}")
    for name, present in result["secret_status"].items():
        print(f"  secret {name:<20}: {'present' if present else 'NOT SET (optional until spend authorized)'}")
    if result["missing_required_secrets"]:
        print(f"MISSING REQUIRED SECRETS: {result['missing_required_secrets']}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
