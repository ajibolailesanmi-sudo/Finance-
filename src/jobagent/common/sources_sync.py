"""Sync validated source configs into the DB, preserving health counters.

Idempotent: config columns are upserted by id; runtime health columns
(consecutive_failures, last_run_at, last_success_at) are never touched here, so
re-running bootstrap does not reset a source's failure history.
"""
from __future__ import annotations

import sqlite3


def sync_sources(conn: sqlite3.Connection, rows: list[dict]) -> int:
    for r in rows:
        conn.execute(
            """
            INSERT INTO sources (id, type, name, config, enabled, denylisted, pacing, alert_threshold)
            VALUES (:id, :type, :name, :config, :enabled, :denylisted, :pacing, :alert_threshold)
            ON CONFLICT(id) DO UPDATE SET
                type = excluded.type,
                name = excluded.name,
                config = excluded.config,
                enabled = excluded.enabled,
                denylisted = excluded.denylisted,
                pacing = excluded.pacing,
                alert_threshold = excluded.alert_threshold
            """,
            r,
        )
    conn.commit()
    return len(rows)
