"""F12 — per-source health + auto-disable + run-summary.

A source failing ``alert_threshold`` consecutive runs auto-disables (enabled=0)
and raises an alert; re-enabling is an explicit human action (F0.2). Alerts are
deduplicated by key so an ongoing failure is one line, not one per run.

Proof: tests/test_health.py.
"""
from __future__ import annotations

import sqlite3

from ..common.alerts import AlertCollector


def record_success(conn: sqlite3.Connection, source_id: str, now: str) -> None:
    conn.execute(
        "UPDATE sources SET last_run_at = ?, last_success_at = ?, "
        "consecutive_failures = 0 WHERE id = ?",
        (now, now, source_id),
    )
    conn.commit()


def record_failure(
    conn: sqlite3.Connection,
    source_id: str,
    now: str,
    alerts: AlertCollector,
    reason: str,
) -> bool:
    """Bump the failure counter; auto-disable at threshold. Returns disabled?"""
    row = conn.execute(
        "SELECT consecutive_failures, alert_threshold, name FROM sources WHERE id = ?",
        (source_id,),
    ).fetchone()
    if row is None:
        alerts.emit(f"source:{source_id}", f"unknown source {source_id}", "error")
        return False
    failures = int(row["consecutive_failures"]) + 1
    threshold = int(row["alert_threshold"])
    name = row["name"]
    disabled = failures >= threshold
    conn.execute(
        "UPDATE sources SET last_run_at = ?, consecutive_failures = ?, "
        "enabled = CASE WHEN ? THEN 0 ELSE enabled END WHERE id = ?",
        (now, failures, 1 if disabled else 0, source_id),
    )
    conn.commit()
    if disabled:
        alerts.emit(
            f"source:{source_id}",
            f"source '{name}' auto-disabled after {failures} consecutive failures: {reason}",
            "error",
        )
    else:
        alerts.emit(
            f"source:{source_id}",
            f"source '{name}' failing ({failures}/{threshold}): {reason}",
            "warn",
        )
    return disabled


def health_snapshot(conn) -> dict:
    """F12 hardened — persisted source health for the digest.

    Auto-disabled sources need an explicit human re-enable (F0.2); they are listed
    separately so they can't quietly stay dark. 'last success' doubles as the
    'failing since' reference for a source in a failure streak.
    """
    rows = conn.execute(
        "SELECT id, name, enabled, denylisted, consecutive_failures, "
        "last_success_at, alert_threshold FROM sources"
    ).fetchall()
    sources, failing, disabled = [], [], []
    for r in rows:
        d = dict(r)
        sources.append(d)
        if r["denylisted"]:
            continue
        if not r["enabled"] and r["consecutive_failures"] >= r["alert_threshold"]:
            disabled.append({"id": r["id"], "name": r["name"],
                             "failures": r["consecutive_failures"],
                             "last_success_at": r["last_success_at"]})
        elif r["consecutive_failures"] > 0:
            failing.append({"id": r["id"], "name": r["name"],
                            "failures": r["consecutive_failures"],
                            "last_success_at": r["last_success_at"]})
    ok = sum(1 for r in rows if r["enabled"] and not r["denylisted"]
             and r["consecutive_failures"] == 0)
    return {"ok": ok, "failing": failing, "auto_disabled": disabled,
            "total_sources": len(rows)}


def run_summary_line(summary: dict, alerts: AlertCollector) -> str:
    """One-line nightly health summary (e.g. '3 sources OK, 1 failing')."""
    ok = summary.get("sources_ok", 0)
    failed = summary.get("sources_failed", 0)
    new = summary.get("new_postings", 0)
    dup = summary.get("duplicates", 0)
    quar = summary.get("quarantined", 0)
    parts = [f"{ok} sources OK", f"{failed} failing"]
    parts.append(f"{new} new / {dup} dup / {quar} quarantined")
    if alerts.alerts:
        parts.append(f"{len(alerts.alerts)} alert(s)")
    return "; ".join(parts)
