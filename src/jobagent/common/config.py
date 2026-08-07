"""Config loading + validation (F0.2).

Loads the YAML config files described in PROJECT_BIBLE.md §5.5/§8 and validates
them. Two invariants are enforced at load time:

  I5  a source touching a denylisted host must be denylisted+disabled, else refuse
  I6  every source must declare pacing (min_interval); missing pacing refuses

Proof: tests/test_config.py, tests/test_denylist.py.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

from .denylist import is_denylisted

VALID_SOURCE_TYPES = {"board_api", "ats_endpoint", "rss", "scraper"}


class ConfigError(ValueError):
    """Raised when a config file is malformed or violates an invariant."""


def load_yaml(path: Path | str) -> Any:
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _source_url_fields(cfg: dict) -> list[str]:
    """Collect any URL-ish values from a source config for denylist checks."""
    out: list[str] = []
    for key in ("endpoint", "url", "board_url", "apply_url"):
        val = cfg.get(key)
        if isinstance(val, str) and val:
            out.append(val)
    return out


def validate_source(src: dict) -> dict:
    """Validate one source entry; return a normalized dict ready for DB insert.

    Raises ConfigError on: unknown/missing type, missing pacing, missing
    min_interval, or a LinkedIn source that is not explicitly denied+disabled (I5).
    """
    if not isinstance(src, dict):
        raise ConfigError(f"source entry must be a mapping, got {type(src).__name__}")

    sid = src.get("id")
    if not sid:
        raise ConfigError("source missing required 'id'")

    stype = src.get("type")
    if stype not in VALID_SOURCE_TYPES:
        raise ConfigError(f"source {sid!r}: unknown type {stype!r}")

    pacing = src.get("pacing")
    if not isinstance(pacing, dict) or "min_interval" not in pacing:
        raise ConfigError(f"source {sid!r}: missing pacing.min_interval (I6)")

    cfg = src.get("config", {}) or {}
    denylisted = bool(src.get("denylisted", False))
    enabled = bool(src.get("enabled", True))

    # I5: any denylisted host must be flagged denylisted AND disabled.
    touches_denylist = is_denylisted(str(sid)) or any(
        is_denylisted(u) for u in _source_url_fields(cfg)
    ) or is_denylisted(str(src.get("name", "")))
    if touches_denylist and not (denylisted and not enabled):
        raise ConfigError(
            f"source {sid!r}: denylisted host must be denylisted:true + enabled:false (I5)"
        )

    return {
        "id": str(sid),
        "type": stype,
        "name": src.get("name", str(sid)),
        "config": json.dumps(cfg, sort_keys=True),
        "enabled": 1 if (enabled and not denylisted) else 0,
        "denylisted": 1 if denylisted else 0,
        "pacing": json.dumps(pacing, sort_keys=True),
        "alert_threshold": int(src.get("alert_threshold", 3)),
    }


def load_sources(path: Path | str) -> list[dict]:
    """Load and validate config/sources.yaml -> list of DB-ready source dicts."""
    doc = load_yaml(path) or {}
    raw = doc.get("sources", doc if isinstance(doc, list) else [])
    if not isinstance(raw, list):
        raise ConfigError("sources.yaml: 'sources' must be a list")
    seen: set[str] = set()
    out: list[dict] = []
    for src in raw:
        row = validate_source(src)
        if row["id"] in seen:
            raise ConfigError(f"duplicate source id {row['id']!r}")
        seen.add(row["id"])
        out.append(row)
    return out
