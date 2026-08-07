"""Lever postings API adapter.

Public shape (api.lever.co/v0/postings/{company}?mode=json): a JSON array of
  {"id", "text", "categories": {"location","team","commitment"},
   "hostedUrl", "createdAt" (ms epoch), "descriptionPlain"}
Parse-only; fetching happens elsewhere under pacing.
"""
from __future__ import annotations

import json

from ..normalize import RawPosting
from .base import register


@register("lever")
class LeverAdapter:
    name = "lever"

    def parse(self, payload, *, company="", source_url="") -> list[RawPosting]:
        data = json.loads(payload)
        postings = data if isinstance(data, list) else data.get("postings", [])
        out: list[RawPosting] = []
        for p in postings:
            cats = p.get("categories", {}) or {}
            out.append(
                RawPosting(
                    company=company or "",
                    title=p.get("text", ""),
                    apply_url=p.get("hostedUrl") or p.get("applyUrl") or "",
                    location=cats.get("location"),
                    work_arrangement=(cats.get("workplaceType") or None),
                    description_text=p.get("descriptionPlain") or p.get("description"),
                    ats_platform="lever",
                    posted_at=str(p.get("createdAt")) if p.get("createdAt") else None,
                    source_url=source_url or p.get("hostedUrl"),
                    raw_ref=p.get("id"),
                )
            )
        return out
