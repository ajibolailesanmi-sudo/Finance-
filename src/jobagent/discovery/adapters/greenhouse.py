"""Greenhouse job-board API adapter.

Public shape (boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true):
  {"jobs": [{"id", "title", "location": {"name"}, "absolute_url",
             "updated_at", "content" (HTML, entity-encoded)}]}
Parse-only; fetching happens elsewhere under pacing.
"""
from __future__ import annotations

import html
import json
import re

from ..normalize import RawPosting
from .base import register

_TAGS = re.compile(r"<[^>]+>")


def _strip_html(s: str | None) -> str | None:
    if not s:
        return s
    return _TAGS.sub(" ", html.unescape(s)).strip() or None


@register("greenhouse")
class GreenhouseAdapter:
    name = "greenhouse"

    def parse(self, payload, *, company="", source_url="") -> list[RawPosting]:
        data = json.loads(payload)
        jobs = data.get("jobs", []) if isinstance(data, dict) else data
        out: list[RawPosting] = []
        for j in jobs:
            loc = (j.get("location") or {})
            out.append(
                RawPosting(
                    company=company or j.get("company_name") or "",
                    title=j.get("title", ""),
                    apply_url=j.get("absolute_url", ""),
                    location=loc.get("name") if isinstance(loc, dict) else loc,
                    description_text=_strip_html(j.get("content")),
                    ats_platform="greenhouse",
                    posted_at=j.get("updated_at") or j.get("first_published"),
                    source_url=source_url or j.get("absolute_url"),
                    raw_ref=str(j.get("id")) if j.get("id") is not None else None,
                )
            )
        return out
