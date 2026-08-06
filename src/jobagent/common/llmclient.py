"""Pluggable LLM client for scoring/tailoring (F2, F4).

Two deliberate guardrails, both tied to PROJECT_BIBLE.md stop conditions & I7:

  * The real Anthropic client is a thin stub that REFUSES to run unless a key is
    present AND spend has been explicitly authorized. Spending money (API budget)
    is a Candidate stop condition, so no code path spends by default.
  * MockLLMClient makes the whole pipeline runnable and testable offline with
    deterministic, fixture-driven output — no network, no cost.

Only the fields a builder passes in are sent; prompt builders whitelist fields (I7).
"""
from __future__ import annotations

import json
from typing import Callable, Protocol


class LLMClient(Protocol):
    def complete_json(self, prompt: str) -> dict:  # pragma: no cover - protocol
        ...

    @property
    def model_id(self) -> str:  # pragma: no cover - protocol
        ...


class MockLLMClient:
    """Deterministic client for tests / offline runs.

    ``responder`` maps a prompt string to a dict. Defaults to returning a fixed
    stub so callers that only need *a* well-formed object work out of the box.
    """

    def __init__(self, responder: Callable[[str], dict] | None = None,
                 model_id: str = "mock-llm-1"):
        self._responder = responder or (lambda _p: {
            "fit_score": 50,
            "tier": "CONSIDER",
            "rationale": "mock",
            "matched_qualifications": [],
            "missing_qualifications": [],
            "dealbreaker_hits": [],
        })
        self._model_id = model_id

    def complete_json(self, prompt: str) -> dict:
        return self._responder(prompt)

    @property
    def model_id(self) -> str:
        return self._model_id


class SpendNotAuthorized(RuntimeError):
    """Raised when a real API call is attempted without explicit spend approval."""


class AnthropicClient:
    """Real client stub. Inert until the Candidate authorizes spend (stop condition).

    Wiring the actual Messages API call is intentionally left to F0/F2 hardening
    once the Candidate has set a model pin and budget cap in settings.yaml (D6)
    and approved spend. Until then this raises rather than silently costing money.
    """

    def __init__(self, api_key: str | None, model_id: str, *, spend_authorized: bool = False):
        self._api_key = api_key
        self._model_id = model_id
        self._spend_authorized = spend_authorized

    @property
    def model_id(self) -> str:
        return self._model_id

    def complete_json(self, prompt: str) -> dict:
        if not self._api_key:
            raise SpendNotAuthorized("no API key present (I8): set it in the keychain/.env")
        if not self._spend_authorized:
            raise SpendNotAuthorized(
                "API spend not authorized by the Candidate (stop condition, D6)"
            )
        # Real call intentionally not implemented in Phase 1.
        raise NotImplementedError(
            "AnthropicClient.complete_json is wired in F2 hardening after spend approval"
        )
