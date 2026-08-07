"""F2 — score DISCOVERED postings into SCORED with a §5.2 assessment.

Guarantees:
  * The prompt builder whitelists the fields sent to the LLM (I7) — no PII beyond
    the posting text + the Candidate's own resume/criteria.
  * Output is validated against ASSESSMENT_SCHEMA; malformed output is retried
    up to ``max_retries`` then quarantined (the posting stays DISCOVERED, an
    alert is raised — never a partial write).
  * Any dealbreaker hit forces tier=SKIP regardless of what the model returned.

Proof: tests/test_scoring.py.
"""
from __future__ import annotations

import json
import sqlite3

from jsonschema import Draft7Validator

from ..common.alerts import AlertCollector
from ..common.llmclient import LLMClient
from ..gates import transitions
from .schema import ASSESSMENT_SCHEMA

PROMPT_VERSION = "score-v1"
_VALIDATOR = Draft7Validator(ASSESSMENT_SCHEMA)

# I7: only these posting fields ever leave the machine.
_POSTING_WHITELIST = ("company", "title", "location", "work_arrangement", "description_text")


def build_prompt(posting: dict, resume: str, criteria: str) -> str:
    """Assemble the scoring prompt from whitelisted fields only (I7)."""
    p = {k: posting.get(k) for k in _POSTING_WHITELIST}
    return (
        "You are screening a job posting for a senior candidate. Return ONLY a "
        "JSON object matching the required schema (fit_score 0-100; tier one of "
        "APPLY_NOW/CONSIDER/SKIP; rationale; matched_qualifications; "
        "missing_qualifications; dealbreaker_hits).\n\n"
        f"CRITERIA:\n{criteria}\n\n"
        f"CANDIDATE RESUME:\n{resume}\n\n"
        f"POSTING:\n{json.dumps(p, ensure_ascii=False)}\n"
    )


def _validate(obj) -> list[str]:
    return [e.message for e in _VALIDATOR.iter_errors(obj)]


def score_posting(
    llm: LLMClient,
    posting: dict,
    resume: str,
    criteria: str,
    *,
    max_retries: int = 1,
) -> dict:
    """Return a validated assessment dict, or raise ValueError if unrecoverable."""
    prompt = build_prompt(posting, resume, criteria)
    last_errors: list[str] = []
    for _ in range(max_retries + 1):
        obj = llm.complete_json(prompt)
        errors = _validate(obj)
        if not errors:
            # Dealbreaker hits force SKIP (assessment authority, not the model's).
            if obj.get("dealbreaker_hits"):
                obj["tier"] = "SKIP"
            return obj
        last_errors = errors
    raise ValueError(f"assessment failed schema after retries: {last_errors}")


def score_pending(
    conn: sqlite3.Connection,
    llm: LLMClient,
    resume: str,
    criteria: str,
    now: str,
    *,
    criteria_version: str = "criteria-v1",
    alerts: AlertCollector | None = None,
    max_retries: int = 1,
) -> dict:
    """Score every DISCOVERED application. Returns a summary."""
    alerts = alerts or AlertCollector()
    summary = {"scored": 0, "skipped_dealbreaker": 0, "quarantined": 0}

    rows = conn.execute(
        """
        SELECT app.id AS app_id, p.* FROM applications app
        JOIN postings p ON p.id = app.posting_id
        WHERE app.state = 'DISCOVERED'
        """
    ).fetchall()

    for row in rows:
        posting = dict(row)
        app_id = posting.pop("app_id")
        try:
            assessment = score_posting(llm, posting, resume, criteria, max_retries=max_retries)
        except ValueError as exc:
            summary["quarantined"] += 1
            alerts.emit(f"score:{posting['id']}",
                        f"scoring quarantined posting {posting['id']}: {exc}", "warn")
            continue

        conn.execute(
            """
            INSERT INTO assessments
              (posting_id, scored_at, model_id, prompt_version, criteria_version,
               fit_score, tier, rationale, matched_qualifications,
               missing_qualifications, dealbreaker_hits)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                posting["id"], now, llm.model_id, PROMPT_VERSION, criteria_version,
                assessment["fit_score"], assessment["tier"], assessment.get("rationale", ""),
                json.dumps(assessment.get("matched_qualifications", [])),
                json.dumps(assessment.get("missing_qualifications", [])),
                json.dumps(assessment.get("dealbreaker_hits", [])),
            ),
        )
        # transitions.py is the sole state writer (I2).
        transitions.transition(conn, app_id, "SCORED", actor=transitions.SYSTEM, now=now)
        summary["scored"] += 1
        if assessment["tier"] == "SKIP" and assessment.get("dealbreaker_hits"):
            summary["skipped_dealbreaker"] += 1

    conn.commit()
    return summary
