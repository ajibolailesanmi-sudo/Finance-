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


class ModelRefusal(RuntimeError):
    """Raised when the model declines a request (stop_reason == 'refusal')."""


class AnthropicClient:
    """Real Claude client — structured JSON output via the Messages API.

    Two hard guardrails keep spend a Candidate decision (stop condition, D6):
      * refuses unless an API key is present (I8) AND spend is explicitly authorized;
    so no code path spends money by default. The transport (`_create`) is injected
    so the request-shaping and response-parsing are unit-testable offline with a
    fake — the real transport lazily constructs the `anthropic` SDK only when used,
    keeping it an optional dependency (the whole offline suite runs without it).

    Structured output uses `output_config.format` with the caller's JSON Schema, so
    the returned object already conforms to the schema the pipeline validates against.
    """

    def __init__(
        self,
        api_key: str | None,
        model_id: str,
        *,
        spend_authorized: bool = False,
        output_schema: dict | None = None,
        max_tokens: int = 16000,
        _create: Callable[..., object] | None = None,
    ):
        self._api_key = api_key
        self._model_id = model_id
        self._spend_authorized = spend_authorized
        self._output_schema = output_schema
        self._max_tokens = max_tokens
        self._create = _create  # injected transport; lazily built if None

    @property
    def model_id(self) -> str:
        return self._model_id

    def with_schema(self, output_schema: dict) -> "AnthropicClient":
        """Return a copy bound to a different output schema (per-kind reuse)."""
        return AnthropicClient(
            self._api_key, self._model_id, spend_authorized=self._spend_authorized,
            output_schema=output_schema, max_tokens=self._max_tokens, _create=self._create,
        )

    def _transport(self):
        if self._create is not None:
            return self._create
        import anthropic  # lazy: optional dependency, only needed for real calls
        return anthropic.Anthropic(api_key=self._api_key).messages.create

    def complete_json(self, prompt: str) -> dict:
        if not self._api_key:
            raise SpendNotAuthorized("no API key present (I8): set it in the keychain/.env")
        if not self._spend_authorized:
            raise SpendNotAuthorized(
                "API spend not authorized by the Candidate (stop condition, D6)"
            )
        if not self._model_id:
            raise SpendNotAuthorized("no model pinned (D6): set llm.model_id in settings.yaml")

        request = {
            "model": self._model_id,
            "max_tokens": self._max_tokens,
            # I7: only the caller-built prompt leaves the machine — no extra fields.
            "messages": [{"role": "user", "content": prompt}],
        }
        if self._output_schema is not None:
            request["output_config"] = {
                "format": {"type": "json_schema", "schema": self._output_schema}
            }

        response = self._transport()(**request)

        # Handle a safety refusal before reading content (current-model behavior).
        if getattr(response, "stop_reason", None) == "refusal":
            raise ModelRefusal(f"model refused: {getattr(response, 'stop_details', None)}")

        text = _first_text(response)
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError) as exc:
            raise ValueError(f"model output was not valid JSON: {exc}") from exc


def _first_text(response) -> str:
    """Extract the first text block from a Messages API response."""
    for block in getattr(response, "content", []) or []:
        if getattr(block, "type", None) == "text":
            return block.text
    raise ValueError("no text block in model response")


def make_llm_client(settings: dict, *, output_schema: dict | None = None,
                    api_key: str | None = None) -> LLMClient:
    """Choose the real client only when the Candidate has fully opted in (D6).

    Returns MockLLMClient unless a model is pinned AND spend is authorized AND an
    API key is present — otherwise the offline mock, so nothing spends by accident.
    """
    import os
    llm = (settings or {}).get("llm", {}) or {}
    model_id = llm.get("model_id") or ""
    spend_ok = bool(llm.get("spend_authorized", False))
    key = api_key if api_key is not None else os.environ.get("ANTHROPIC_API_KEY")
    if model_id and spend_ok and key:
        return AnthropicClient(
            key, model_id, spend_authorized=True, output_schema=output_schema,
            max_tokens=int(llm.get("max_tokens_response", 16000)),
        )
    return MockLLMClient()
