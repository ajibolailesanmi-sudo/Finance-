"""F4 — generate a tailored materials bundle per shortlisted role.

Inputs are strictly the Candidate's own data + the posting (§F4): master resume,
accomplishment library, voice guide, posting, criteria (+ rework notes). Each
generated material is run through the I3 claim validator; on violation it is
regenerated once, and if it still violates it is FLAGGED (not queued) and the
app stays out of Gate 2 — a violating draft never silently reaches the queue.

Generation is injectable: MockTailor composes offline from library evidence (so
Phase 2 runs without spend); a real LLM tailor would slot in behind the same
validate-before-queue gate. Proof: tests/test_tailoring.py.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from ..common.alerts import AlertCollector
from ..gates import transitions
from . import materials_store as store
from .library_loader import Library
from .validate_claims import Violation, validate_material

PROMPT_VERSION = "tailor-v1"
BUNDLE_KINDS = ("summary", "resume_emphasis", "cover_letter", "screening_answers")


@dataclass
class GenContext:
    posting: dict
    library: Library
    voice_guide: str = ""
    criteria: str = ""
    rework_notes: str = ""


class Tailor(Protocol):
    model_id: str
    def generate(self, kind: str, ctx: GenContext) -> tuple[str, list[str]]:
        ...


def _relevant(ctx: GenContext):
    """Rank usable accomplishments by keyword overlap with the posting."""
    blob = f"{ctx.posting.get('title','')} {ctx.posting.get('description_text','')}".lower()
    def score(a):
        words = set(w for w in (a.statement + " " + a.context).lower().split() if len(w) > 4)
        return sum(1 for w in words if w in blob)
    return sorted(ctx.library.accomplishments, key=score, reverse=True)


class MockTailor:
    """Offline tailor. Composes ONLY from cited accomplishments (numbers included
    verbatim from their metric text), so validation passes by construction."""

    model_id = "mock-tailor-1"

    def generate(self, kind: str, ctx: GenContext) -> tuple[str, list[str]]:
        accs = _relevant(ctx)
        company = ctx.posting.get("company", "the company")
        title = ctx.posting.get("title", "the role")
        top = accs[: min(3, len(accs))]
        cites = [a.id for a in top]

        if kind == "summary":
            body = " ".join(a.statement.rstrip(".") + "." for a in top[:2])
            return (f"Senior leader targeting {title}. {body}", [a.id for a in top[:2]])
        if kind == "resume_emphasis":
            lines = [f"- {a.statement} ({a.metric})" for a in top]
            return ("Reordered emphasis for this role:\n" + "\n".join(lines), cites)
        if kind == "cover_letter":
            picks = top[:2]
            paras = [f"Dear {company} Hiring Team,",
                     f"I am writing regarding {title}."]
            for a in picks:
                paras.append(f"In {a.context or 'a prior role'}, {a.statement.rstrip('.')} — {a.metric}.")
            paras.append("I would welcome the chance to discuss the role.")
            return ("\n\n".join(paras), [a.id for a in picks])
        if kind == "screening_answers":
            a = top[0]
            qa = (f"Q: Why are you a fit for {title}?\n"
                  f"A: {a.statement.rstrip('.')}, delivering {a.metric}.")
            return (qa, [a.id])
        raise ValueError(f"unknown kind {kind!r}")


@dataclass
class BundleResult:
    app_id: int
    written: dict[str, int] = field(default_factory=dict)      # kind -> version_id
    flagged: dict[str, list[Violation]] = field(default_factory=dict)

    @property
    def clean(self) -> bool:
        return not self.flagged


def generate_bundle(
    conn: sqlite3.Connection,
    app_id: int,
    ctx: GenContext,
    tailor: Tailor,
    *,
    materials_root: Path,
    now: str,
    alerts: AlertCollector | None = None,
    strict: bool = False,
) -> BundleResult:
    """Generate + validate the four-kind bundle for one shortlisted app.

    On a persistent claim violation: if strict, raise; else flag and leave the app
    in its current state (not DRAFTED) so the violating draft never reaches Gate 2.
    """
    alerts = alerts or AlertCollector()
    result = BundleResult(app_id=app_id)
    posting_text = f"{ctx.posting.get('title','')} {ctx.posting.get('description_text','')}"

    for kind in BUNDLE_KINDS:
        content, cites = tailor.generate(kind, ctx)
        violations = validate_material(content, cites, ctx.library, posting_text=posting_text)
        if violations:
            # One regeneration attempt (F4).
            content, cites = tailor.generate(kind, ctx)
            violations = validate_material(content, cites, ctx.library, posting_text=posting_text)
        if violations:
            result.flagged[kind] = violations
            alerts.emit(f"tailor:{app_id}:{kind}",
                        f"app {app_id} '{kind}': claim validation failed ({len(violations)} violation(s)) — "
                        f"flagged, not queued (I3)", "warn")
            if strict:
                raise TailoringViolation(kind, violations)
            continue
        vid = store.write_version(
            conn, app_id, kind, content, materials_root=materials_root, now=now,
            model_id=tailor.model_id, prompt_version=PROMPT_VERSION,
            library_version=ctx.library.version, claim_citations=cites,
        )
        result.written[kind] = vid

    # Only transition to DRAFTED when the whole bundle is clean.
    if result.clean and result.written:
        cur = conn.execute("SELECT state FROM applications WHERE id=?", (app_id,)).fetchone()[0]
        if cur in ("SHORTLISTED", "REWORK"):
            transitions.transition(conn, app_id, "DRAFTED", actor=transitions.SYSTEM, now=now,
                                   note=("rework regen" if cur == "REWORK" else "tailored"))
    return result


class TailoringViolation(RuntimeError):
    def __init__(self, kind: str, violations: list[Violation]):
        self.kind = kind
        self.violations = violations
        super().__init__(f"{kind}: {[v.detail for v in violations]}")


def run_tailoring(
    conn: sqlite3.Connection,
    library: Library,
    *,
    materials_root: Path,
    voice_guide: str,
    criteria: str,
    now: str,
    tailor: Tailor | None = None,
    alerts: AlertCollector | None = None,
) -> dict:
    """Generate bundles for every SHORTLISTED / REWORK app. Returns a summary."""
    tailor = tailor or MockTailor()
    alerts = alerts or AlertCollector()
    rows = conn.execute(
        """SELECT app.id AS app_id, app.state, app.notes, p.*
           FROM applications app JOIN postings p ON p.id = app.posting_id
           WHERE app.state IN ('SHORTLISTED', 'REWORK')"""
    ).fetchall()
    summary = {"drafted": 0, "flagged": 0}
    for row in rows:
        posting = dict(row)
        app_id = posting.pop("app_id")
        posting.pop("state", None)
        rework_notes = posting.pop("notes", None) or ""
        ctx = GenContext(posting=posting, library=library, voice_guide=voice_guide,
                         criteria=criteria, rework_notes=rework_notes)
        res = generate_bundle(conn, app_id, ctx, tailor, materials_root=materials_root,
                              now=now, alerts=alerts)
        if res.clean:
            summary["drafted"] += 1
        else:
            summary["flagged"] += 1
    return summary
