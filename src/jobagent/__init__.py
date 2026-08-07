"""Human-in-the-Loop Job Application Agent.

Phase 1 — minimum viable pipeline (F0, F0.1, F0.2, F1, F2, F3, F8, F12).
See PROJECT_BIBLE.md at the repository root for the authoritative design.

Design guarantees enforced in code (see PROJECT_BIBLE.md §9):
  I2  gates.transitions is the sole writer of applications.state
  I5  common.denylist refuses any enabled LinkedIn source
  I6  common.pacing bounds all fetching
  I7  scoring prompt builders whitelist the fields sent to the LLM
"""

__version__ = "0.1.0"
