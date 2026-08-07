"""I5 — LinkedIn exclusion, enforced in one place.

No automated interaction with LinkedIn, ever. This module is imported by the
source loader (F0.2) and would be imported by the pre-fill dispatcher (F6, P3).
A source that touches a denylisted host must be explicitly ``denylisted: true``
and ``enabled: false``; anything else refuses to load.

Proof: tests/test_denylist.py.
"""
from __future__ import annotations

from urllib.parse import urlparse

# Hosts the agent must never interact with automatically. Matching is on the
# registrable-domain suffix so subdomains (www., api.) are covered.
DENYLISTED_DOMAINS: tuple[str, ...] = ("linkedin.com",)


def _host(url_or_host: str) -> str:
    s = (url_or_host or "").strip().lower()
    if "://" in s:
        s = urlparse(s).netloc or ""
    # strip credentials / port if present
    s = s.split("@")[-1].split(":")[0]
    return s


def is_denylisted(url_or_host: str) -> bool:
    """True if the given URL or host is on the permanent denylist."""
    host = _host(url_or_host)
    if not host:
        return False
    return any(host == d or host.endswith("." + d) for d in DENYLISTED_DOMAINS)


class DenylistViolation(ValueError):
    """Raised when a denylisted target would be interacted with automatically."""


def assert_not_denylisted(url_or_host: str, *, context: str = "") -> None:
    if is_denylisted(url_or_host):
        raise DenylistViolation(
            f"Denylisted target refused (I5): {url_or_host!r}"
            + (f" [{context}]" if context else "")
        )
