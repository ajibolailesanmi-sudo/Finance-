"""Per-source-type adapters. Each is isolated so one failure never kills a run.

Adapters are PARSE-ONLY: they turn already-fetched bytes/text into RawPostings.
Fetching (network + pacing) is a separate, injectable step, which keeps every
adapter unit-testable offline against fixtures.
"""
from .base import Adapter, get_adapter
from . import greenhouse, lever, rss  # noqa: F401  (register on import)

__all__ = ["Adapter", "get_adapter"]
