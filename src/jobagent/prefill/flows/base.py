"""ATS flow registry + protocol.

A flow knows one ATS's field layout and fills it from the applicant profile,
approved documents, and the approved screening answers — then STOPS at the review
screen. No flow ever calls a submit control (I1); the driver would refuse anyway.
"""
from __future__ import annotations

from typing import Protocol

from ..profile import ApplicantProfile


class ATSFlow(Protocol):
    platform: str
    def fill_form(self, driver, profile: ApplicantProfile,
                  documents: dict[str, str], answers: str) -> None: ...


_REGISTRY: dict[str, "ATSFlow"] = {}


def register(cls):
    _REGISTRY[cls.platform] = cls()
    return cls


def get_flow(platform: str) -> "ATSFlow | None":
    """Return the scripted flow for a platform, or None (-> fallback)."""
    return _REGISTRY.get(platform)
