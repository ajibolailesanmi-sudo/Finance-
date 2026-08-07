"""F0.1 hardened — load the accomplishment library as claim-backing evidence.

Only *usable* entries (non-empty statement+metric, with verified_at) may back a
generated claim (I3). An entry without verified_at is unusable — F4 must refuse
to invent around a missing library rather than proceed.

The library_version is a content hash of the file, recorded on every generated
version for traceability (I4 / §5.3).
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .validate_claims import extract_numbers


@dataclass(frozen=True)
class Accomplishment:
    id: str
    statement: str
    metric: str
    context: str
    verified_at: str
    numbers: frozenset[str] = field(default_factory=frozenset)

    @property
    def text(self) -> str:
        return f"{self.statement} {self.metric} {self.context}".strip()


@dataclass(frozen=True)
class Library:
    version: str
    accomplishments: tuple[Accomplishment, ...]

    def by_id(self, aid: str) -> Accomplishment | None:
        for a in self.accomplishments:
            if a.id == aid:
                return a
        return None

    @property
    def ids(self) -> set[str]:
        return {a.id for a in self.accomplishments}


def library_version(path: Path | str) -> str:
    data = Path(path).read_bytes()
    return "sha256:" + hashlib.sha256(data).hexdigest()[:16]


def load_library(path: Path | str) -> Library:
    """Load only usable accomplishments. Raises if none are usable (F4 refuses)."""
    doc = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    entries = doc.get("accomplishments", []) or []
    usable: list[Accomplishment] = []
    for e in entries:
        stmt = str(e.get("statement", "")).strip()
        metric = str(e.get("metric", "")).strip()
        verified = e.get("verified_at")
        if stmt and metric and verified:
            nums = extract_numbers(f"{stmt} {metric} {e.get('context','')}")
            usable.append(Accomplishment(
                id=str(e["id"]), statement=stmt, metric=metric,
                context=str(e.get("context", "")), verified_at=str(verified),
                numbers=frozenset(nums),
            ))
    if not usable:
        raise EmptyLibraryError(
            f"no usable (verified, non-empty) accomplishments in {path}; "
            "F4 refuses to generate — populate the library first (F0.1)"
        )
    return Library(version=library_version(path), accomplishments=tuple(usable))


class EmptyLibraryError(RuntimeError):
    """Raised when generation is attempted against an empty/unverified library."""
