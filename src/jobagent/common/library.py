"""F0.1 — source-of-truth library validation.

A schema linter rejects malformed accomplishments.yaml. An accomplishment
entry is only USABLE by F4 (Phase 2) if it has a non-empty statement/metric and
a `verified_at` date — an unverified entry is unusable, never invented around.

Proof: tests/test_library.py.
"""
from __future__ import annotations

from pathlib import Path

import yaml


class LibraryError(ValueError):
    pass


REQUIRED_KEYS = {"id", "statement", "metric", "context", "evidence_note", "verified_at"}


def lint_accomplishments(path: Path | str) -> dict:
    """Validate structure. Returns {'entries': N, 'usable': M, 'ids': [...]}.

    Raises LibraryError on malformed structure (missing keys, duplicate/blank ids).
    A blank template (verified_at: null) is STRUCTURALLY valid but yields 0 usable.
    """
    with open(path, "r", encoding="utf-8") as fh:
        doc = yaml.safe_load(fh) or {}
    entries = doc.get("accomplishments")
    if entries is None or not isinstance(entries, list):
        raise LibraryError("accomplishments.yaml: top-level 'accomplishments' list required")

    seen: set[str] = set()
    usable = 0
    ids: list[str] = []
    for i, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise LibraryError(f"entry {i}: must be a mapping")
        missing = REQUIRED_KEYS - set(entry)
        if missing:
            raise LibraryError(f"entry {i}: missing keys {sorted(missing)}")
        eid = entry.get("id")
        if not eid or not str(eid).strip():
            raise LibraryError(f"entry {i}: blank id")
        if eid in seen:
            raise LibraryError(f"duplicate accomplishment id {eid!r}")
        seen.add(eid)
        ids.append(eid)
        if str(entry.get("statement", "")).strip() and \
           str(entry.get("metric", "")).strip() and entry.get("verified_at"):
            usable += 1
    return {"entries": len(entries), "usable": usable, "ids": ids}
