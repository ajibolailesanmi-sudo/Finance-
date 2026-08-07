"""I5 — LinkedIn exclusion."""
import pytest

from jobagent.common.denylist import is_denylisted, assert_not_denylisted, DenylistViolation
from jobagent.common.config import validate_source, ConfigError


def test_is_denylisted_matches_domain_and_subdomains():
    assert is_denylisted("https://www.linkedin.com/jobs/")
    assert is_denylisted("linkedin.com")
    assert is_denylisted("https://api.linkedin.com/x")
    assert not is_denylisted("https://boards-api.greenhouse.io/v1")


def test_assert_not_denylisted_raises():
    with pytest.raises(DenylistViolation):
        assert_not_denylisted("https://linkedin.com/jobs", context="fetch")


def test_enabled_linkedin_source_refuses_to_load():
    src = {"id": "linkedin", "type": "scraper", "name": "LinkedIn",
           "enabled": True, "denylisted": False,
           "config": {"endpoint": "https://www.linkedin.com/jobs/"},
           "pacing": {"min_interval": 5}}
    with pytest.raises(ConfigError, match="I5"):
        validate_source(src)


def test_properly_denylisted_linkedin_entry_loads_disabled():
    src = {"id": "linkedin", "type": "scraper", "name": "LinkedIn",
           "enabled": False, "denylisted": True,
           "config": {"endpoint": "https://www.linkedin.com/jobs/"},
           "pacing": {"min_interval": 999999}}
    row = validate_source(src)
    assert row["denylisted"] == 1 and row["enabled"] == 0
