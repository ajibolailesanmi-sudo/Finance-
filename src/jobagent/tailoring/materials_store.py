"""Append-only storage for materials_versions (§5.3) + immutability (I4).

Rows are never edited in place: an edit creates version_n+1. Approval flips a
draft to 'approved', after which the DB trigger (migration 2) refuses any update
— content is frozen and traceable to the exact bytes that were approved.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

KINDS = ("summary", "resume_emphasis", "cover_letter", "screening_answers", "outreach")


class ImmutableVersionError(RuntimeError):
    pass


def next_version_n(conn: sqlite3.Connection, app_id: int, kind: str) -> int:
    row = conn.execute(
        "SELECT COALESCE(MAX(version_n), 0) FROM materials_versions "
        "WHERE application_id = ? AND kind = ?",
        (app_id, kind),
    ).fetchone()
    return int(row[0]) + 1


def write_version(
    conn: sqlite3.Connection,
    app_id: int,
    kind: str,
    content: str,
    *,
    materials_root: Path,
    now: str,
    model_id: str,
    prompt_version: str,
    library_version: str,
    claim_citations: list[str],
    human_edited: bool = False,
) -> int:
    """Write a new draft version to disk + DB. Returns the version id."""
    if kind not in KINDS:
        raise ValueError(f"unknown material kind {kind!r}")
    vn = next_version_n(conn, app_id, kind)
    vdir = Path(materials_root) / str(app_id) / f"v{vn}"
    vdir.mkdir(parents=True, exist_ok=True)
    content_path = vdir / f"{kind}.md"
    content_path.write_text(content, encoding="utf-8")

    cur = conn.execute(
        """
        INSERT INTO materials_versions
          (application_id, kind, version_n, content_path, generated_at, model_id,
           prompt_version, library_version, claim_citations, status, human_edited)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
        """,
        (app_id, kind, vn, str(content_path), now, model_id, prompt_version,
         library_version, json.dumps(claim_citations), 1 if human_edited else 0),
    )
    conn.commit()
    return cur.lastrowid


def get_version(conn: sqlite3.Connection, version_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM materials_versions WHERE id = ?", (version_id,)).fetchone()
    return dict(row) if row else None


def latest_drafts(conn: sqlite3.Connection, app_id: int) -> dict[str, dict]:
    """Latest non-superseded draft/approved version per kind."""
    rows = conn.execute(
        "SELECT * FROM materials_versions WHERE application_id = ? "
        "AND status != 'superseded' ORDER BY kind, version_n",
        (app_id,),
    ).fetchall()
    out: dict[str, dict] = {}
    for r in rows:
        out[r["kind"]] = dict(r)   # last (highest version_n) wins per kind
    return out


def edit_version(
    conn: sqlite3.Connection, app_id: int, kind: str, new_content: str, *,
    materials_root: Path, now: str, base_version: dict,
) -> int:
    """Human edit -> a NEW version (append-only), never a mutation of the base."""
    return write_version(
        conn, app_id, kind, new_content, materials_root=materials_root, now=now,
        model_id=base_version.get("model_id", ""),
        prompt_version=base_version.get("prompt_version", ""),
        library_version=base_version.get("library_version", ""),
        claim_citations=json.loads(base_version.get("claim_citations") or "[]"),
        human_edited=True,
    )


def approve_version(conn: sqlite3.Connection, version_id: int, now: str) -> None:
    """Flip a draft to approved (immutable thereafter) and supersede its siblings."""
    v = get_version(conn, version_id)
    if v is None:
        raise ValueError(f"no such version {version_id}")
    if v["status"] == "approved":
        return
    # Supersede other non-approved versions of the same kind for this app.
    conn.execute(
        "UPDATE materials_versions SET status = 'superseded' "
        "WHERE application_id = ? AND kind = ? AND id != ? AND status = 'draft'",
        (v["application_id"], v["kind"], version_id),
    )
    conn.execute(
        "UPDATE materials_versions SET status = 'approved', approved_at = ? WHERE id = ?",
        (now, version_id),
    )
    conn.commit()
