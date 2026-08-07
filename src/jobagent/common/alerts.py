"""F12 alert sink — deduplicated so ongoing conditions don't spam.

One line per ongoing condition (keyed), not one per run, to prevent alert
fatigue. In Phase 1 alerts print to a log file and are collected for the run
summary; email/dashboard delivery is a later phase.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Alert:
    key: str          # stable identity of the condition (dedup key)
    severity: str     # 'info' | 'warn' | 'error'
    message: str


@dataclass
class AlertCollector:
    """Collects alerts during a run, deduplicating by key."""

    _by_key: dict[str, Alert] = field(default_factory=dict)

    def emit(self, key: str, message: str, severity: str = "warn") -> None:
        # Last write wins for a given ongoing condition; count is not inflated.
        self._by_key[key] = Alert(key=key, severity=severity, message=message)

    @property
    def alerts(self) -> list[Alert]:
        return list(self._by_key.values())

    def summary_lines(self) -> list[str]:
        return [f"[{a.severity.upper()}] {a.message}" for a in self.alerts]

    def has_errors(self) -> bool:
        return any(a.severity == "error" for a in self.alerts)
