"""F0.2 — config validation refuses malformed sources (I6 pacing, unknown type)."""
import pytest

from pathlib import Path

from jobagent.common.config import validate_source, load_sources, ConfigError

ROOT = Path(__file__).resolve().parent.parent


def test_missing_pacing_refuses():
    with pytest.raises(ConfigError, match="pacing"):
        validate_source({"id": "s", "type": "rss", "config": {"endpoint": "https://x/f.rss"}})


def test_unknown_type_refuses():
    with pytest.raises(ConfigError, match="unknown type"):
        validate_source({"id": "s", "type": "carrier_pigeon",
                         "pacing": {"min_interval": 1}, "config": {}})


def test_shipped_sources_yaml_loads_and_has_linkedin_denylisted():
    rows = load_sources(ROOT / "config" / "sources.yaml")
    by_id = {r["id"]: r for r in rows}
    assert "linkedin" in by_id
    assert by_id["linkedin"]["denylisted"] == 1 and by_id["linkedin"]["enabled"] == 0
    # At least two live source types enabled (Phase 1 acceptance: >=2 sources).
    enabled = [r for r in rows if r["enabled"] == 1]
    assert len(enabled) >= 2
