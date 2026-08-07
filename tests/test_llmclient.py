"""D6 — real Anthropic client wiring, tested offline with a fake transport.

No network, no spend: the transport is injected, so these tests exercise request
shaping, structured-output config, refusal handling, and the spend gate without
importing the `anthropic` SDK or making a paid call.
"""
import json
from types import SimpleNamespace

import pytest

from conftest import NOW, make_application

from jobagent.common.llmclient import (AnthropicClient, MockLLMClient, ModelRefusal,
                                       SpendNotAuthorized, make_llm_client)
from jobagent.scoring.schema import ASSESSMENT_SCHEMA
from jobagent.scoring.score import score_pending

VALID = {"fit_score": 82, "tier": "APPLY_NOW", "rationale": "strong",
         "matched_qualifications": ["CMC"], "missing_qualifications": [],
         "dealbreaker_hits": []}


def _resp(text, stop_reason="end_turn"):
    return SimpleNamespace(stop_reason=stop_reason,
                           content=[SimpleNamespace(type="text", text=text)])


def _capturing_transport(text=None, stop_reason="end_turn"):
    calls = {}
    def create(**kwargs):
        calls.update(kwargs)
        return _resp(text if text is not None else json.dumps(VALID), stop_reason)
    return create, calls


# --- spend gate (stop condition, D6) ----------------------------------------
def test_refuses_without_api_key():
    c = AnthropicClient(None, "claude-x", spend_authorized=True)
    with pytest.raises(SpendNotAuthorized, match="API key"):
        c.complete_json("hi")


def test_refuses_without_spend_authorization():
    c = AnthropicClient("sk-test", "claude-x", spend_authorized=False)
    with pytest.raises(SpendNotAuthorized, match="not authorized"):
        c.complete_json("hi")


def test_refuses_without_model_pin():
    create, _ = _capturing_transport()
    c = AnthropicClient("sk-test", "", spend_authorized=True, _create=create)
    with pytest.raises(SpendNotAuthorized, match="model"):
        c.complete_json("hi")


# --- request shaping + parsing ----------------------------------------------
def test_builds_structured_request_and_parses_json():
    create, calls = _capturing_transport()
    c = AnthropicClient("sk-test", "claude-x", spend_authorized=True,
                        output_schema=ASSESSMENT_SCHEMA, max_tokens=1234, _create=create)
    out = c.complete_json("PROMPT TEXT")
    assert out == VALID
    assert calls["model"] == "claude-x" and calls["max_tokens"] == 1234
    assert calls["messages"] == [{"role": "user", "content": "PROMPT TEXT"}]
    # structured output uses output_config.format with the caller's schema
    assert calls["output_config"]["format"]["type"] == "json_schema"
    assert calls["output_config"]["format"]["schema"] is ASSESSMENT_SCHEMA
    # I7: nothing beyond model/max_tokens/messages/output_config is sent
    assert set(calls) == {"model", "max_tokens", "messages", "output_config"}


def test_refusal_raises():
    create, _ = _capturing_transport(stop_reason="refusal")
    c = AnthropicClient("sk-test", "claude-x", spend_authorized=True, _create=create)
    with pytest.raises(ModelRefusal):
        c.complete_json("hi")


def test_invalid_json_raises_valueerror():
    create, _ = _capturing_transport(text="not json")
    c = AnthropicClient("sk-test", "claude-x", spend_authorized=True, _create=create)
    with pytest.raises(ValueError, match="valid JSON"):
        c.complete_json("hi")


# --- factory (opt-in only) --------------------------------------------------
def test_factory_returns_mock_without_full_optin():
    base = {"llm": {"model_id": "claude-x", "spend_authorized": True}}
    assert isinstance(make_llm_client(base, api_key=None), MockLLMClient)       # no key
    assert isinstance(make_llm_client({"llm": {"model_id": "", "spend_authorized": True}},
                                      api_key="sk"), MockLLMClient)             # no model
    assert isinstance(make_llm_client({"llm": {"model_id": "claude-x", "spend_authorized": False}},
                                      api_key="sk"), MockLLMClient)             # spend off


def test_factory_returns_real_client_when_fully_opted_in():
    base = {"llm": {"model_id": "claude-x", "spend_authorized": True}}
    c = make_llm_client(base, api_key="sk-test", output_schema=ASSESSMENT_SCHEMA)
    assert isinstance(c, AnthropicClient) and c.model_id == "claude-x"


# --- end-to-end: F2 scoring through the real client (fake transport) --------
def test_scoring_runs_through_real_client(conn):
    app = make_application(conn, state="DISCOVERED", company="CGT", title="Dir CMC")
    create, _ = _capturing_transport()
    llm = AnthropicClient("sk-test", "claude-x", spend_authorized=True,
                          output_schema=ASSESSMENT_SCHEMA, _create=create)
    summary = score_pending(conn, llm, "resume", "criteria", NOW)
    assert summary["scored"] == 1
    assert conn.execute("SELECT state FROM applications WHERE id=?", (app,)).fetchone()[0] == "SCORED"
    row = conn.execute("SELECT model_id, tier FROM assessments WHERE posting_id="
                       "(SELECT posting_id FROM applications WHERE id=?)", (app,)).fetchone()
    assert row[0] == "claude-x" and row[1] == "APPLY_NOW"
