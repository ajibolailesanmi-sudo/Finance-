"""F9 — weekly digest. One artifact the Candidate reads to see pipeline health.

Sections: activity this window, §11 metrics, source health (F12), calibration
(F11), and reminders (F9). Everything is computed from the log, so the digest is
reproducible (proof: tests/test_digest.py against a seeded log with known answers).
"""
from __future__ import annotations

import sqlite3

from ..health import monitor
from . import calibration, metrics, reminders as remind

RESPONDED = metrics.RESPONDED


def _count_history_in_window(conn, states, since: str) -> int:
    q = (f"SELECT COUNT(DISTINCT application_id) FROM state_history "
         f"WHERE to_state IN ({','.join('?' * len(states))}) AND at >= ?")
    return conn.execute(q, (*states, since)).fetchone()[0]


def build_digest(conn: sqlite3.Connection, now: str, *, window_days: int = 7,
                 cadence: dict | None = None) -> dict:
    since = _minus_days(now, window_days)
    new_ops = conn.execute(
        "SELECT COUNT(*) FROM postings WHERE first_seen_at >= ?", (since,)).fetchone()[0]
    return {
        "generated_at": now,
        "window_days": window_days,
        "activity": {
            "new_opportunities": new_ops,
            "submissions": _count_history_in_window(conn, ("SUBMITTED",), since),
            "responses": _count_history_in_window(conn, RESPONDED, since),
        },
        "metrics": metrics.summary(conn),
        "source_health": monitor.health_snapshot(conn),
        "calibration": calibration.build_calibration(conn),
        "reminders": [r.__dict__ for r in remind.compute_reminders(conn, now, cadence)],
    }


def _minus_days(now: str, days: int) -> str:
    from datetime import date, timedelta
    d = date.fromisoformat(now[:10]) - timedelta(days=days)
    return d.isoformat()


def _pct(x) -> str:
    return "n/a" if x is None else f"{x * 100:.0f}%"


def render_text(d: dict) -> str:
    m = d["metrics"]
    h = d["source_health"]
    c = d["calibration"]
    L = [
        f"WEEKLY DIGEST — {d['generated_at']} (last {d['window_days']}d)",
        "=" * 56,
        "ACTIVITY",
        f"  new opportunities : {d['activity']['new_opportunities']}",
        f"  submissions       : {d['activity']['submissions']}",
        f"  responses         : {d['activity']['responses']}",
        "",
        "OUTCOMES (all-time, from the log)",
        f"  submissions        : {m['submissions']}",
        f"  response rate      : {_pct(m['response_rate'])}",
        f"  interview conv.    : {_pct(m['interview_conversion'])}",
        f"  shortlist precision: {_pct(m['shortlist_precision']['precision'])} "
        f"({m['shortlist_precision']['apply_now_shortlisted']}/{m['shortlist_precision']['apply_now_reviewed']} APPLY_NOW)",
        f"  pre-fill success   : {_pct(m['prefill_success_rate']['rate'])} "
        f"{m['prefill_success_rate']['by_method'] or ''}",
        f"  stale rate         : {_pct(m['stale_rate'])}",
        f"  candidate time/app : {m['candidate_time_per_application_min'] or 'n/a (timer not enabled)'}",
        "",
        "SOURCE HEALTH (F12)",
        f"  {h['ok']}/{h['total_sources']} sources OK; "
        f"{len(h['failing'])} failing; {len(h['auto_disabled'])} auto-disabled",
    ]
    for s in h["auto_disabled"]:
        L.append(f"    ! {s['name']} disabled after {s['failures']} failures "
                 f"(last success {s['last_success_at'] or 'never'}) — re-enable via F0.2")
    tier_str = ", ".join(f"{k}: {_pct(v)}" for k, v in c["response_rate_by_tier"].items())
    L += ["", "CALIBRATION (F11)",
          f"  precision misses (APPLY_NOW->DECLINED): {c['precision_miss_count']}",
          f"  upgrades (CONSIDER->SHORTLISTED)      : {c['upgrade_count']}",
          f"  response rate by tier: {tier_str}",
          "  precision by criteria_version:"]
    for cv, b in c["precision_by_criteria_version"].items():
        L.append(f"    {cv}: {_pct(b['precision'])} ({b['shortlisted']}/{b['reviewed']})")
    L += ["", f"REMINDERS (F9) — {len(d['reminders'])}"]
    for r in d["reminders"]:
        L.append(f"  [{r['kind']}] {r['message']}")
    return "\n".join(L)
