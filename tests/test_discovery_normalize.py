"""Fixture-based normalization per source type + dedup-key stability."""
from conftest import FIXTURES

from jobagent.discovery.adapters import get_adapter
from jobagent.discovery.normalize import normalize, dedup_key, canonical_url

NOW = "2026-08-06T00:00:00Z"


def test_greenhouse_normalizes():
    raws = get_adapter("greenhouse").parse(
        (FIXTURES / "greenhouse_sample.json").read_text(), company="Example CGT Co")
    assert len(raws) == 2
    n = normalize(raws[0], first_seen_at=NOW)
    assert n["company"] == "Example CGT Co"
    assert n["title"].startswith("Senior Director")
    assert n["ats_platform"] == "greenhouse"
    assert n["work_arrangement"] == "remote"       # inferred from "Remote - US"
    assert "<b>" not in (n["description_text"] or "")  # HTML stripped & unescaped


def test_lever_normalizes():
    raws = get_adapter("lever").parse(
        (FIXTURES / "lever_sample.json").read_text(), company="Example Bio")
    n = normalize(raws[0], first_seen_at=NOW)
    assert n["ats_platform"] == "lever"
    assert n["title"] == "VP, Regulatory CMC"
    assert n["work_arrangement"] == "remote"


def test_rss_normalizes():
    raws = get_adapter("rss").parse(
        (FIXTURES / "sample.rss").read_text(), company="Feed Co")
    assert len(raws) == 2
    n = normalize(raws[0], first_seen_at=NOW)
    assert n["title"].startswith("Executive Director")
    assert n["apply_url"] == "https://example.com/jobs/9001"


def test_blank_company_falls_back_to_host():
    # A feed item with no company (common for RSS) is kept, not dropped.
    raws = get_adapter("rss").parse((FIXTURES / "sample.rss").read_text(), company="")
    n = normalize(raws[0], first_seen_at=NOW)
    assert n["company"] == "example.com"  # from https://example.com/jobs/9001


def test_missing_title_or_url_still_rejected():
    from jobagent.discovery.normalize import RawPosting
    import pytest
    with pytest.raises(ValueError, match="title/apply_url"):
        normalize(RawPosting(company="Acme", title="", apply_url="https://x/1"), first_seen_at=NOW)
    with pytest.raises(ValueError, match="title/apply_url"):
        normalize(RawPosting(company="Acme", title="Dir", apply_url=""), first_seen_at=NOW)


def test_canonical_url_and_dedup_key_stable():
    a = dedup_key("Acme Bio", "Director, CMC", "https://x.com/jobs/1?utm=abc#frag")
    b = dedup_key("acme  bio", "director, cmc ", "https://x.com/jobs/1/")
    assert a == b  # case/whitespace/query/fragment/trailing-slash insensitive
    assert canonical_url("https://X.com/Jobs/1?q=2#f") == "https://x.com/Jobs/1"
