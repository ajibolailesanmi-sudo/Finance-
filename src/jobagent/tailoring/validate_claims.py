"""I3 — library-only claims. The fabrication guard that runs before Gate 2.

Rule enforced: every *quantified* claim (any number/metric) in a generated
document must be backed by a cited accomplishment (its statement/metric/context)
or by the posting text itself. A number that appears in the draft but in none of
those sources is an uncited/fabricated metric and the draft is REJECTED.

This errs toward rejection — the safe direction for a fabrication guard — with
mandatory human Gate 2 review as the backstop (§10). Cited IDs must also exist
and be usable; citing an unknown/unverified id is a violation.

Proof: tests/test_validate_claims.py (planted uncited metric -> rejected;
library-absent fact never survives).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Matches money ($2M, $1,500), percentages (40%), and bare numbers (3, 12.5, 2024).
_NUM = re.compile(r"\$?\d[\d,]*(?:\.\d+)?\s?%?[KMB]?", re.I)

# Numbers that are contextual noise, not claims (years, small ordinals in prose).
_ALLOWED_CONTEXT = {str(y) for y in range(1990, 2036)}


def _digits(token: str) -> str:
    """Normalize a numeric token to its digit sequence (drops $ , % KMB)."""
    return re.sub(r"[^\d]", "", token)


def extract_numbers(text: str) -> set[str]:
    """Return the set of normalized numeric tokens in text (empty tokens dropped)."""
    out: set[str] = set()
    for m in _NUM.finditer(text or ""):
        d = _digits(m.group())
        if d:
            out.add(d)
    return out


@dataclass
class Violation:
    kind: str            # 'uncited_metric' | 'unknown_citation' | 'no_citation'
    detail: str


def validate_material(
    content: str,
    claim_citations: list[str],
    library,                      # Library (avoids circular import at type level)
    *,
    posting_text: str = "",
    allow_context_numbers: bool = True,
) -> list[Violation]:
    """Return a list of I3 violations. Empty list == the draft may be queued."""
    violations: list[Violation] = []

    # (1) Every cited id must exist and be usable in the library.
    cited = []
    for cid in claim_citations:
        acc = library.by_id(cid)
        if acc is None:
            violations.append(Violation("unknown_citation",
                                        f"cited accomplishment {cid!r} is not in the usable library"))
        else:
            cited.append(acc)

    # (2) Build the set of numbers the draft is ALLOWED to contain.
    allowed: set[str] = set()
    for acc in cited:
        allowed |= set(acc.numbers)
    allowed |= extract_numbers(posting_text)
    if allow_context_numbers:
        allowed |= _ALLOWED_CONTEXT

    # (3) Any number in the draft not covered is an uncited/fabricated metric.
    #     (This is the whole guarantee: a metric must trace to a cited
    #     accomplishment, the posting, or contextual years — nothing else.)
    draft_numbers = extract_numbers(content)
    for num in sorted(draft_numbers - allowed):
        violations.append(Violation(
            "uncited_metric",
            f"metric {num!r} appears in the draft but is backed by no cited "
            f"accomplishment or the posting (I3)",
        ))
    return violations
