"""F1 orchestration — parse, normalize, dedup, insert; per-source isolation.

``fetch`` is injected: it takes a source row and returns the raw payload. In
production it is a paced network call (I6); in tests it returns fixture bytes.
One broken source never kills the run — its exception is caught, its health
counter bumped (F12), and the run continues.

Proof: tests/test_discovery_normalize.py, tests/test_dedup.py, tests/test_health.py.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Callable

from ..common.alerts import AlertCollector
from ..health import monitor
from .adapters import get_adapter
from .normalize import RawPosting, normalize

FetchFn = Callable[[dict], object]  # source_row -> payload (str|bytes)


def _adapter_name(source_row: dict) -> str:
    cfg = json.loads(source_row["config"]) if isinstance(source_row["config"], str) else source_row["config"]
    if source_row["type"] == "rss":
        return "rss"
    platform = cfg.get("platform")
    if not platform:
        raise ValueError(f"source {source_row['id']}: config.platform required for {source_row['type']}")
    return platform


def insert_posting(conn: sqlite3.Connection, norm: dict, source_id: str, now: str) -> tuple[int, bool]:
    """Insert a normalized posting, deduped on dedup_key. Returns (posting_id, created)."""
    cur = conn.execute(
        """
        INSERT OR IGNORE INTO postings
          (dedup_key, company, title, location, work_arrangement, comp_min, comp_max,
           comp_currency, description_text, ats_platform, apply_url, posted_at, first_seen_at)
        VALUES (:dedup_key, :company, :title, :location, :work_arrangement, :comp_min,
                :comp_max, :comp_currency, :description_text, :ats_platform, :apply_url,
                :posted_at, :first_seen_at)
        """,
        {k: v for k, v in norm.items() if not k.startswith("_")},
    )
    created = cur.rowcount == 1
    row = conn.execute("SELECT id FROM postings WHERE dedup_key = ?", (norm["dedup_key"],)).fetchone()
    posting_id = row[0]

    # Provenance: always record the sighting (merged on duplicates).
    conn.execute(
        "INSERT OR IGNORE INTO posting_sources (posting_id, source_id, source_url, fetched_at, raw_ref)"
        " VALUES (?, ?, ?, ?, ?)",
        (posting_id, source_id, norm.get("_source_url"), now, norm.get("_raw_ref")),
    )

    if created:
        # One application stub per posting, starting at DISCOVERED.
        conn.execute(
            "INSERT INTO applications (posting_id, state) VALUES (?, 'DISCOVERED')",
            (posting_id,),
        )
        app_id = conn.execute(
            "SELECT id FROM applications WHERE posting_id = ?", (posting_id,)
        ).fetchone()[0]
        conn.execute(
            "INSERT INTO state_history (application_id, from_state, to_state, actor, at, note)"
            " VALUES (?, NULL, 'DISCOVERED', 'system', ?, 'discovered')",
            (app_id, now),
        )
    return posting_id, created


def discover(
    conn: sqlite3.Connection,
    sources: list[dict],
    fetch: FetchFn,
    now: str,
    alerts: AlertCollector | None = None,
) -> dict:
    """Run discovery across enabled sources. Returns a run summary."""
    alerts = alerts or AlertCollector()
    summary = {
        "sources_ok": 0,
        "sources_failed": 0,
        "new_postings": 0,
        "duplicates": 0,
        "quarantined": 0,
    }

    for src in sources:
        if not src["enabled"] or src["denylisted"]:
            continue
        try:
            payload = fetch(src)
            adapter = get_adapter(_adapter_name(src))
            cfg = json.loads(src["config"]) if isinstance(src["config"], str) else src["config"]
            raws: list[RawPosting] = adapter.parse(
                payload, company=cfg.get("company", ""), source_url=cfg.get("endpoint", "")
            )
        except Exception as exc:  # per-source isolation
            summary["sources_failed"] += 1
            monitor.record_failure(conn, src["id"], now, alerts, reason=str(exc))
            continue

        for raw in raws:
            try:
                norm = normalize(raw, first_seen_at=now)
            except Exception as exc:
                summary["quarantined"] += 1
                alerts.emit(
                    f"quarantine:{src['id']}",
                    f"source '{src['name']}': {summary['quarantined']} malformed posting(s) quarantined",
                    "warn",
                )
                continue
            _pid, created = insert_posting(conn, norm, src["id"], now)
            if created:
                summary["new_postings"] += 1
            else:
                summary["duplicates"] += 1

        summary["sources_ok"] += 1
        monitor.record_success(conn, src["id"], now)

    conn.commit()
    return summary


def enabled_sources(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM sources WHERE enabled = 1 AND denylisted = 0"
    ).fetchall()
    return [dict(r) for r in rows]
