"""F10 — outreach drafting. Gate 4 is human: the Candidate sends, not the agent.

I9 — this module has NO transport capability: there is no email/SMTP/HTTP-send
code here, and there never will be. It only drafts (voice + library constrained,
I3) and records status. `sent_by_human` is set by the review surface after the
Candidate sends from their own account. Proof: tests/test_outreach.py includes
an absence-of-transport source audit.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

from .generate import GenContext, _relevant
from .library_loader import Library
from .validate_claims import validate_material

PURPOSES = ("referral", "recruiter", "follow_up", "thank_you")

_OPENERS = {
    "referral": "I'm exploring {title} at {company} and hoped you might point me to the right person.",
    "recruiter": "I'm interested in {title} at {company} and wanted to introduce myself.",
    "follow_up": "Following up on my application for {title} at {company}.",
    "thank_you": "Thank you for the conversation about {title} at {company}.",
}


def draft_outreach(
    conn: sqlite3.Connection,
    *,
    application_id: int | None,
    purpose: str,
    library: Library,
    posting: dict,
    contact_ref: str | None,
    materials_root: Path,
    now: str,
) -> int:
    """Compose an outreach draft from library evidence and record it. Returns id."""
    if purpose not in PURPOSES:
        raise ValueError(f"unknown outreach purpose {purpose!r}")
    company = posting.get("company", "your team")
    title = posting.get("title", "the role")
    top = _relevant(GenContext(posting=posting, library=library))[:1]
    cite = [a.id for a in top]

    lines = [_OPENERS[purpose].format(title=title, company=company)]
    if top:
        a = top[0]
        lines.append(f"For context: {a.statement.rstrip('.')}, delivering {a.metric}.")
    body = "\n\n".join(lines)

    # I3 applies to outreach too: no metric outside the cited accomplishment(s).
    violations = validate_material(body, cite, library,
                                   posting_text=f"{title} {posting.get('description_text','')}")
    if violations:
        raise ValueError(f"outreach draft failed claim validation (I3): "
                         f"{[v.detail for v in violations]}")

    draft_dir = Path(materials_root) / (str(application_id) if application_id else "_general") / "outreach"
    draft_dir.mkdir(parents=True, exist_ok=True)
    draft_path = draft_dir / f"{purpose}.md"
    draft_path.write_text(body, encoding="utf-8")

    cur = conn.execute(
        "INSERT INTO outreach_drafts (application_id, contact_ref, purpose, draft_path, created_at, status)"
        " VALUES (?, ?, ?, ?, ?, 'draft')",
        (application_id, contact_ref, purpose, str(draft_path), now),
    )
    conn.commit()
    return cur.lastrowid


def mark_personalized(conn: sqlite3.Connection, draft_id: int) -> None:
    conn.execute("UPDATE outreach_drafts SET status='personalized' WHERE id=? AND status='draft'",
                 (draft_id,))
    conn.commit()


def mark_sent_by_human(conn: sqlite3.Connection, draft_id: int, now: str) -> None:
    """Record that the Candidate sent this from their own account (review surface only)."""
    conn.execute(
        "UPDATE outreach_drafts SET status='sent_by_human', sent_noted_at=? WHERE id=?",
        (now, draft_id),
    )
    conn.commit()
