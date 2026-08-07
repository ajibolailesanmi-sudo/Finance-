"""Applicant profile — the personal info entered on forms.

PII lives on the Candidate's machine (I7): config/applicant.yaml is gitignored;
only config/applicant.example.yaml (names only) is committed. Tests use a fixture.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class ApplicantProfile:
    first_name: str
    last_name: str
    email: str
    phone: str = ""
    location: str = ""
    current_org: str = ""
    linkedin_url: str = ""   # the Candidate's own profile URL (manual use only, I5)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


def load_profile(path: Path | str) -> ApplicantProfile:
    doc = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    return ApplicantProfile(
        first_name=str(doc.get("first_name", "")).strip(),
        last_name=str(doc.get("last_name", "")).strip(),
        email=str(doc.get("email", "")).strip(),
        phone=str(doc.get("phone", "")).strip(),
        location=str(doc.get("location", "")).strip(),
        current_org=str(doc.get("current_org", "")).strip(),
        linkedin_url=str(doc.get("linkedin_url", "")).strip(),
    )
