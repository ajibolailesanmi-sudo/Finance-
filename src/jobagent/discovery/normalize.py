"""Normalization to the postings contract (§5.1) + the dedup key.

The dedup key is a stable hash of (normalized company, normalized title,
canonical apply URL). Same posting seen twice -> same key -> zero new rows
(proof: tests/test_dedup.py, tests/test_discovery_normalize.py).
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from urllib.parse import urlsplit, urlunsplit


@dataclass
class RawPosting:
    """What an adapter emits before normalization. Adapter-neutral."""

    company: str
    title: str
    apply_url: str
    location: str | None = None
    work_arrangement: str | None = None
    description_text: str | None = None
    ats_platform: str = "unknown"
    posted_at: str | None = None
    comp_min: int | None = None
    comp_max: int | None = None
    comp_currency: str | None = None
    source_url: str | None = None
    raw_ref: str | None = None
    extra: dict = field(default_factory=dict)


_WS = re.compile(r"\s+")


def _norm_text(s: str | None) -> str:
    return _WS.sub(" ", (s or "").strip()).lower()


def canonical_url(url: str) -> str:
    """Lowercase host, drop query/fragment, strip trailing slash."""
    if not url:
        return ""
    parts = urlsplit(url.strip())
    scheme = (parts.scheme or "https").lower()
    netloc = parts.netloc.lower()
    path = parts.path.rstrip("/")
    return urlunsplit((scheme, netloc, path, "", ""))


def dedup_key(company: str, title: str, apply_url: str) -> str:
    basis = "|".join((_norm_text(company), _norm_text(title), canonical_url(apply_url)))
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()


_REMOTE = re.compile(r"\bremote\b", re.I)
_HYBRID = re.compile(r"\bhybrid\b", re.I)


def infer_arrangement(*texts: str | None) -> str | None:
    blob = " ".join(t for t in texts if t)
    if _HYBRID.search(blob):
        return "hybrid"
    if _REMOTE.search(blob):
        return "remote"
    return None


def _host_company(apply_url: str) -> str:
    """Provisional company from a URL host (for feeds that carry no company)."""
    host = urlsplit(apply_url).netloc.lower().split("@")[-1].split(":")[0]
    return host[4:] if host.startswith("www.") else host


def normalize(raw: RawPosting, *, first_seen_at: str) -> dict:
    """RawPosting -> dict matching the postings row contract (§5.1).

    title and apply_url are strictly required (no dedup/navigation without them).
    A blank company falls back to the posting's host — feeds often omit it — so a
    source is never silently dropped over a missing company name.
    """
    if not raw.title or not raw.apply_url:
        raise ValueError("posting missing required title/apply_url")
    company = (raw.company or "").strip() or _host_company(raw.apply_url)
    if not company:
        raise ValueError("posting missing company and has no host to fall back to")
    arrangement = raw.work_arrangement or infer_arrangement(
        raw.location, raw.description_text, raw.title
    )
    return {
        "dedup_key": dedup_key(company, raw.title, raw.apply_url),
        "company": company,
        "title": raw.title.strip(),
        "location": (raw.location or "").strip() or None,
        "work_arrangement": arrangement,
        "comp_min": raw.comp_min,
        "comp_max": raw.comp_max,
        "comp_currency": raw.comp_currency,
        "description_text": raw.description_text,
        "ats_platform": raw.ats_platform or "unknown",
        "apply_url": raw.apply_url.strip(),
        "posted_at": raw.posted_at,
        "first_seen_at": first_seen_at,
        "_source_url": raw.source_url or raw.apply_url,
        "_raw_ref": raw.raw_ref,
    }
