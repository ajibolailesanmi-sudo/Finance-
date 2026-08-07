"""Phase 1 discovery spike (A3) — verify real posting endpoints are readable.

This is a *probe*, not ingestion: it fetches each candidate endpoint ONCE, under
pacing (I6), runs the payload through the real adapters + normalizer, and reports
whether the endpoint is reachable and parseable. It never writes to app.db and
never enables a source — enabling for production is a Candidate ToS decision
(stop condition §10). The denylist (I5) is enforced on every endpoint.

The network fetch is injected so the whole spike is unit-testable offline against
saved payloads (proof: tests/test_spike.py).
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Callable

from ..common.denylist import assert_not_denylisted
from ..common.pacing import Pacer
from .adapters import get_adapter
from .normalize import normalize

FetchFn = Callable[[str], str]  # url -> payload text (raises on network error)

GREENHOUSE_TMPL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
LEVER_TMPL = "https://api.lever.co/v0/postings/{token}?mode=json"


def build_endpoint(platform: str, token_or_url: str) -> str:
    if platform == "greenhouse":
        return GREENHOUSE_TMPL.format(token=token_or_url)
    if platform == "lever":
        return LEVER_TMPL.format(token=token_or_url)
    if platform in ("rss", "other"):
        return token_or_url  # already a full URL
    raise ValueError(f"unknown spike platform {platform!r}")


def _adapter_for(platform: str) -> str:
    return "rss" if platform in ("rss", "other") else platform


@dataclass
class SpikeResult:
    label: str
    platform: str
    endpoint: str
    ok: bool = False
    raw_count: int = 0
    normalized_count: int = 0
    sample_titles: list[str] = field(default_factory=list)
    error: str | None = None

    def as_row(self) -> dict:
        return {
            "label": self.label,
            "platform": self.platform,
            "endpoint": self.endpoint,
            "ok": self.ok,
            "raw_count": self.raw_count,
            "normalized_count": self.normalized_count,
            "sample_titles": self.sample_titles,
            "error": self.error,
        }


def probe(candidate: dict, fetch: FetchFn, now: str) -> SpikeResult:
    """Probe one candidate endpoint. Never raises; failures land in .error."""
    platform = candidate["platform"]
    token = candidate.get("token") or candidate.get("endpoint") or ""
    company = candidate.get("company", "")
    label = candidate.get("label", token or company)
    try:
        endpoint = build_endpoint(platform, token)
    except ValueError as exc:
        return SpikeResult(label=label, platform=platform, endpoint=str(token), error=str(exc))

    res = SpikeResult(label=label, platform=platform, endpoint=endpoint)
    try:
        assert_not_denylisted(endpoint, context=f"spike {label}")  # I5
        payload = fetch(endpoint)
        raws = get_adapter(_adapter_for(platform)).parse(payload, company=company, source_url=endpoint)
        res.raw_count = len(raws)
        titles: list[str] = []
        for raw in raws:
            try:
                n = normalize(raw, first_seen_at=now)
                res.normalized_count += 1
                if len(titles) < 3:
                    titles.append(f"{n['company']} — {n['title']}")
            except Exception:
                pass
        res.sample_titles = titles
        res.ok = res.normalized_count > 0
        if res.raw_count and not res.normalized_count:
            res.error = "fetched+parsed but 0 normalized (shape mismatch?)"
        elif not res.raw_count:
            res.error = "endpoint returned no postings"
    except Exception as exc:  # network / policy / parse error
        res.error = f"{type(exc).__name__}: {exc}"
    return res


def run_spike(
    candidates: list[dict],
    fetch: FetchFn,
    now: str,
    *,
    sleep: Callable[[float], None] = None,
    rng: random.Random | None = None,
    min_interval: float = 3.0,
    jitter: float = 2.0,
    max_probes: int = 25,
) -> list[SpikeResult]:
    """Probe candidates under shared pacing (I6). Bounded by max_probes."""
    pacer = Pacer(min_interval=min_interval, jitter=jitter, nightly_cap=max_probes,
                  _sleep=(sleep or (lambda _s: None)), _rng=(rng or random.Random(0)))
    results: list[SpikeResult] = []
    for cand in candidates[:max_probes]:
        pacer.wait()  # pace BEFORE each request; enforces the cap
        results.append(probe(cand, fetch, now))
    return results


def summarize(results: list[SpikeResult]) -> dict:
    ok = [r for r in results if r.ok]
    by_platform: dict[str, int] = {}
    for r in ok:
        by_platform[r.platform] = by_platform.get(r.platform, 0) + 1
    return {
        "probed": len(results),
        "verified": len(ok),
        "verified_by_platform": by_platform,
        "total_normalized_postings": sum(r.normalized_count for r in ok),
        # A3 is verified only if >=1 endpoint of >=2 distinct platforms is readable.
        "a3_verified": len(by_platform) >= 2 and len(ok) >= 2,
    }
