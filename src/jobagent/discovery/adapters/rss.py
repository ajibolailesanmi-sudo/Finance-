"""RSS/Atom adapter using the stdlib XML parser (no feedparser dependency).

Handles the common RSS 2.0 <item> shape and Atom <entry>. Company is taken from
the source config (feeds rarely carry it structurally); title/link/description
map straight across.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET

from ..normalize import RawPosting
from .base import register

_ATOM = "{http://www.w3.org/2005/Atom}"


def _text(el, tag):
    child = el.find(tag)
    return child.text.strip() if child is not None and child.text else None


@register("rss")
class RSSAdapter:
    name = "rss"

    def parse(self, payload, *, company="", source_url="") -> list[RawPosting]:
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8", "replace")
        root = ET.fromstring(payload)
        out: list[RawPosting] = []

        # RSS 2.0
        for item in root.iter("item"):
            link = _text(item, "link")
            out.append(
                RawPosting(
                    company=company or _text(item, "author") or "",
                    title=_text(item, "title") or "",
                    apply_url=link or "",
                    description_text=_text(item, "description"),
                    ats_platform="other",
                    posted_at=_text(item, "pubDate"),
                    source_url=source_url or link,
                    raw_ref=_text(item, "guid"),
                )
            )

        # Atom
        for entry in root.iter(f"{_ATOM}entry"):
            link_el = entry.find(f"{_ATOM}link")
            link = link_el.get("href") if link_el is not None else None
            title_el = entry.find(f"{_ATOM}title")
            summ_el = entry.find(f"{_ATOM}summary")
            upd_el = entry.find(f"{_ATOM}updated")
            id_el = entry.find(f"{_ATOM}id")
            out.append(
                RawPosting(
                    company=company or "",
                    title=(title_el.text.strip() if title_el is not None and title_el.text else ""),
                    apply_url=link or "",
                    description_text=(summ_el.text if summ_el is not None else None),
                    ats_platform="other",
                    posted_at=(upd_el.text if upd_el is not None else None),
                    source_url=source_url or link,
                    raw_ref=(id_el.text if id_el is not None else None),
                )
            )
        return out
