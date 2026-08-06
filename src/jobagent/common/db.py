"""SQLite connection + deterministic, idempotent migrations (F0).

The migration runner tracks applied migrations in ``schema_migrations`` and
applies only what is missing, so ``bootstrap`` is safe to run twice (proof:
tests/test_bootstrap.py) and a fresh DB replays the same schema deterministically.

Storage: data/app.db (see PROJECT_BIBLE.md §5, §8).
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

DEFAULT_DB_PATH = Path("data/app.db")


# --- Migrations -------------------------------------------------------------
# Append-only, ordered list. NEVER edit an applied migration's SQL in place;
# add a new one. Each entry is (id, sql). ids are monotonic integers.
MIGRATIONS: list[tuple[int, str]] = [
    (
        1,
        """
        CREATE TABLE postings (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            dedup_key     TEXT NOT NULL UNIQUE,
            company       TEXT NOT NULL,
            title         TEXT NOT NULL,
            location      TEXT,
            work_arrangement TEXT CHECK (work_arrangement IN
                              ('onsite','hybrid','remote') OR work_arrangement IS NULL),
            comp_min      INTEGER,
            comp_max      INTEGER,
            comp_currency TEXT,
            description_text TEXT,
            ats_platform  TEXT NOT NULL DEFAULT 'unknown'
                              CHECK (ats_platform IN
                              ('greenhouse','lever','workday','other','unknown')),
            apply_url     TEXT NOT NULL,
            posted_at     TEXT,
            first_seen_at TEXT NOT NULL
        );

        -- Provenance: many source-sightings per posting (dedup merges here).
        CREATE TABLE posting_sources (
            posting_id  INTEGER NOT NULL REFERENCES postings(id),
            source_id   TEXT NOT NULL,
            source_url  TEXT,
            fetched_at  TEXT NOT NULL,
            raw_ref     TEXT,
            PRIMARY KEY (posting_id, source_id, source_url)
        );

        CREATE TABLE assessments (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            posting_id    INTEGER NOT NULL REFERENCES postings(id),
            scored_at     TEXT NOT NULL,
            model_id      TEXT NOT NULL,
            prompt_version   TEXT NOT NULL,
            criteria_version TEXT NOT NULL,
            fit_score     INTEGER NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
            tier          TEXT NOT NULL CHECK (tier IN ('APPLY_NOW','CONSIDER','SKIP')),
            rationale     TEXT,
            matched_qualifications TEXT,   -- JSON array
            missing_qualifications TEXT,   -- JSON array
            dealbreaker_hits       TEXT    -- JSON array
        );

        -- The audit spine. Exactly one row per pursued posting; state is the
        -- ONLY column gates.transitions may write (I2).
        CREATE TABLE applications (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            posting_id    INTEGER NOT NULL UNIQUE REFERENCES postings(id),
            state         TEXT NOT NULL DEFAULT 'DISCOVERED',
            tier_at_g1    TEXT,
            g1_approved_at TEXT,
            g1_decided_by TEXT,
            g2_approved_at TEXT,
            approved_version_ids TEXT,     -- JSON {kind: materials_version_id}
            prefill_at    TEXT,
            prefill_method TEXT CHECK (prefill_method IN
                              ('scripted','computer_use','manual') OR prefill_method IS NULL),
            screenshot_path TEXT,
            submitted_at  TEXT,
            submitted_confirmed_by_human INTEGER NOT NULL DEFAULT 0,
            contacts      TEXT,            -- JSON array
            next_action   TEXT,
            next_action_date TEXT,
            outcome       TEXT,
            outcome_at    TEXT,
            notes         TEXT
        );

        -- Immutable generated/edited documents (P2 writes rows; table exists now
        -- so the schema is whole and F6/F7 traceability (I4) has a target).
        CREATE TABLE materials_versions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER NOT NULL REFERENCES applications(id),
            kind          TEXT NOT NULL CHECK (kind IN
                              ('summary','resume_emphasis','cover_letter',
                               'screening_answers','outreach')),
            version_n     INTEGER NOT NULL,
            content_path  TEXT NOT NULL,
            generated_at  TEXT NOT NULL,
            model_id      TEXT,
            prompt_version TEXT,
            library_version TEXT,
            claim_citations TEXT,          -- JSON array of accomplishment ids (I3)
            status        TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','approved','superseded')),
            approved_at   TEXT,
            human_edited  INTEGER NOT NULL DEFAULT 0,
            UNIQUE (application_id, kind, version_n)
        );

        -- Append-only history. Corrections add a row; history is never rewritten.
        CREATE TABLE state_history (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER NOT NULL REFERENCES applications(id),
            from_state    TEXT,
            to_state      TEXT NOT NULL,
            actor         TEXT NOT NULL,   -- 'system' | 'candidate'
            at            TEXT NOT NULL,
            note          TEXT
        );

        CREATE TABLE sources (
            id            TEXT PRIMARY KEY,
            type          TEXT NOT NULL CHECK (type IN
                              ('board_api','ats_endpoint','rss','scraper')),
            name          TEXT NOT NULL,
            config        TEXT NOT NULL,   -- JSON
            enabled       INTEGER NOT NULL DEFAULT 1,
            denylisted    INTEGER NOT NULL DEFAULT 0,
            pacing        TEXT NOT NULL,   -- JSON {min_interval, jitter, nightly_cap}
            last_run_at   TEXT,
            last_success_at TEXT,
            consecutive_failures INTEGER NOT NULL DEFAULT 0,
            alert_threshold INTEGER NOT NULL DEFAULT 3
        );

        CREATE TABLE run_log (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            kind          TEXT NOT NULL,   -- 'discovery' | 'scoring'
            started_at    TEXT NOT NULL,
            finished_at   TEXT,
            summary       TEXT
        );

        CREATE INDEX idx_applications_state ON applications(state);
        CREATE INDEX idx_assessments_posting ON assessments(posting_id);
        """,
    ),
]


def connect(db_path: Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Open a connection with FK enforcement and Row access."""
    path = Path(db_path)
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _applied_ids(conn: sqlite3.Connection) -> set[int]:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations "
        "(id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
    )
    return {row[0] for row in conn.execute("SELECT id FROM schema_migrations")}


def migrate(conn: sqlite3.Connection, now: str, migrations: Iterable[tuple[int, str]] | None = None) -> list[int]:
    """Apply pending migrations in order. Returns the ids newly applied.

    Idempotent: already-applied ids are skipped. Deterministic: a fresh DB
    always ends in the same schema regardless of how many times this runs.
    """
    migrations = list(MIGRATIONS if migrations is None else migrations)
    applied = _applied_ids(conn)
    newly: list[int] = []
    for mid, sql in sorted(migrations, key=lambda m: m[0]):
        if mid in applied:
            continue
        conn.executescript(sql)
        conn.execute(
            "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)",
            (mid, now),
        )
        newly.append(mid)
    conn.commit()
    return newly
