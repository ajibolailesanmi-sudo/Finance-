"""F6 — pre-fill batch session.

For each APPROVED application: resolve the exact approved documents/answers (I4),
pick the scripted flow for its ATS, run the form up to the review screen, capture
a screenshot, and halt at PREFILLED. Novel layouts / unknown fields route to
PREFILL_FAILED with a screenshot + reason (attended computer-use/manual fallback).

There is no submit here — advancing to SUBMITTED is a human action (F7). Pacing
between applications (I6). Proof: tests/test_prefill_session.py.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Callable

from ..common.alerts import AlertCollector
from ..common.pacing import Pacer
from ..gates import transitions
from ..tailoring import materials_store as store
from .driver import SubmitControlError, UnknownFieldError
from .flows import get_flow
from .profile import ApplicantProfile

DriverFactory = Callable[[dict], object]   # posting/app row -> FormDriver


def _resolve_documents(conn: sqlite3.Connection, approved_version_ids: dict) -> tuple[dict, str]:
    """Map approved versions to upload paths + the approved screening answers text."""
    documents: dict[str, str] = {}
    answers = ""
    if approved_version_ids.get("resume_emphasis"):
        v = store.get_version(conn, approved_version_ids["resume_emphasis"])
        if v:
            documents["resume"] = v["content_path"]
    if approved_version_ids.get("cover_letter"):
        v = store.get_version(conn, approved_version_ids["cover_letter"])
        if v:
            documents["cover_letter"] = v["content_path"]
    if approved_version_ids.get("screening_answers"):
        v = store.get_version(conn, approved_version_ids["screening_answers"])
        if v and Path(v["content_path"]).exists():
            answers = Path(v["content_path"]).read_text(encoding="utf-8")
    return documents, answers


def prefill_batch(
    conn: sqlite3.Connection,
    driver_factory: DriverFactory,
    profile: ApplicantProfile,
    *,
    screenshots_dir: Path,
    now: str,
    alerts: AlertCollector | None = None,
    pacer: Pacer | None = None,
) -> dict:
    alerts = alerts or AlertCollector()
    summary = {"prefilled": 0, "failed": 0}
    rows = conn.execute(
        """SELECT app.id AS app_id, app.approved_version_ids, p.ats_platform, p.apply_url,
                  p.company, p.title
           FROM applications app JOIN postings p ON p.id = app.posting_id
           WHERE app.state = 'APPROVED' AND app.approved_version_ids IS NOT NULL"""
    ).fetchall()

    for row in rows:
        app_id = row["app_id"]
        avids = json.loads(row["approved_version_ids"])
        documents, answers = _resolve_documents(conn, avids)
        platform = row["ats_platform"]
        flow = get_flow(platform)
        shot = str(Path(screenshots_dir) / f"{app_id}.txt")

        driver = driver_factory(dict(row))
        driver.goto(row["apply_url"])

        if flow is None:
            # Novel layout — computer-use/manual fallback is an attended action.
            _fail(conn, app_id, now, "computer_use",
                  f"no scripted flow for ATS '{platform}'; route to computer-use/manual (attended)",
                  driver, shot, alerts)
            summary["failed"] += 1
        else:
            try:
                flow.fill_form(driver, profile, documents, answers)
                unfilled = driver.unfilled_required() if hasattr(driver, "unfilled_required") else set()
                if unfilled:
                    raise UnknownFieldError(f"unfilled required fields: {sorted(unfilled)}")
            except (UnknownFieldError, SubmitControlError) as exc:
                _fail(conn, app_id, now, "scripted", str(exc), driver, shot, alerts)
                summary["failed"] += 1
            else:
                screenshot_path = driver.screenshot(shot)
                transitions.transition(
                    conn, app_id, "PREFILLED", actor=transitions.SYSTEM, now=now,
                    note="pre-filled; halted at review",
                    fields={"prefill_at": now, "prefill_method": "scripted",
                            "screenshot_path": screenshot_path},
                )
                summary["prefilled"] += 1

        if pacer is not None:
            pacer.wait()   # I6 pacing between applications

    conn.commit()
    return summary


def _fail(conn, app_id, now, method, reason, driver, shot, alerts) -> None:
    screenshot_path = driver.screenshot(shot)
    transitions.transition(
        conn, app_id, "PREFILL_FAILED", actor=transitions.SYSTEM, now=now,
        note=reason,
        fields={"prefill_at": now, "prefill_method": method,
                "screenshot_path": screenshot_path, "notes": reason},
    )
    alerts.emit(f"prefill:{app_id}", f"app {app_id} pre-fill failed: {reason}", "warn")
