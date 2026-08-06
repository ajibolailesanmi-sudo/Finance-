"""I6 — human-like pacing: conservative rate limits + jitter + nightly caps.

Every fetch and every form interaction goes through a Pacer so no adapter can
hammer a source. The sleep function and RNG are injectable so tests are
deterministic and never actually block.

Proof: tests/test_pacing.py.
"""
from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Callable


class NightlyCapReached(RuntimeError):
    """Raised when a source's nightly request cap is exhausted."""


@dataclass
class Pacer:
    """Bounds request rate for a single source.

    min_interval: minimum seconds between requests (before jitter).
    jitter: max extra seconds added, drawn uniformly in [0, jitter].
    nightly_cap: max requests permitted per run (0 = unlimited).
    """

    min_interval: float
    jitter: float = 0.0
    nightly_cap: int = 0
    _sleep: Callable[[float], None] = time.sleep
    _rng: random.Random = field(default_factory=random.Random)
    count: int = 0

    def __post_init__(self) -> None:
        if self.min_interval < 0 or self.jitter < 0 or self.nightly_cap < 0:
            raise ValueError("pacing values must be non-negative")

    def next_delay(self) -> float:
        return self.min_interval + self._rng.uniform(0.0, self.jitter)

    def wait(self) -> float:
        """Enforce the cap, then sleep one paced interval. Returns the delay."""
        if self.nightly_cap and self.count >= self.nightly_cap:
            raise NightlyCapReached(
                f"nightly cap {self.nightly_cap} reached ({self.count} requests)"
            )
        self.count += 1
        delay = self.next_delay()
        if delay:
            self._sleep(delay)
        return delay

    @classmethod
    def from_config(cls, cfg: dict, *, sleep=time.sleep, rng=None) -> "Pacer":
        return cls(
            min_interval=float(cfg.get("min_interval", 0)),
            jitter=float(cfg.get("jitter", 0)),
            nightly_cap=int(cfg.get("nightly_cap", 0)),
            _sleep=sleep,
            _rng=rng or random.Random(),
        )
