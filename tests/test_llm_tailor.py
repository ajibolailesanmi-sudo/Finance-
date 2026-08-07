"""F4 real tailor (D6-gated) — offline via fake transport; output still I3-gated."""
import json
from pathlib import Path
from types import SimpleNamespace

from conftest import NOW, make_application

from jobagent.common.llmclient import AnthropicClient, MockLLMClient
from jobagent.tailoring.generate import GenContext, MockTailor, generate_bundle
from jobagent.tailoring.library_loader import load_library
from jobagent.tailoring.llm_tailor import (AnthropicTailor, build_tailor_prompt,
                                           make_tailor, TAILOR_SCHEMA)

LIB = Path(__file__).parent / "fixtures" / "library_demo" / "accomplishments.yaml"


def _fake_transport(content, cites):
    payload = json.dumps({"content": content, "claim_citations": cites})
    def create(**kw):
        return SimpleNamespace(stop_reason="end_turn",
                               content=[SimpleNamespace(type="text", text=payload)])
    return create


def _ctx():
    return GenContext(posting={"company": "Example CGT Co", "title": "Sr Dir RA CMC",
                               "description_text": "gene therapy CMC, IND to BLA"},
                      library=load_library(LIB))


def test_prompt_whitelists_posting_fields():
    ctx = _ctx()
    ctx.posting["secret_internal_id"] = "SHOULD-NOT-LEAK"
    prompt = build_tailor_prompt("cover_letter", ctx)
    assert "SHOULD-NOT-LEAK" not in prompt          # I7
    assert "acc-001" in prompt                       # accomplishments provided as the claim source


def test_real_tailor_returns_content_and_citations():
    client = AnthropicClient("sk", "claude-x", spend_authorized=True,
                             _create=_fake_transport("Grounded draft citing acc-001.", ["acc-001"]))
    t = AnthropicTailor(client)
    content, cites = t.generate("summary", _ctx())
    assert "Grounded" in content and cites == ["acc-001"]
    assert t.model_id == "claude-x"


def test_real_tailor_output_is_still_i3_gated(conn, tmp_path):
    # A real model that emits an uncited metric is caught by validate_claims (I3),
    # exactly like the mock — the draft is flagged, not queued.
    app = make_application(conn, state="SHORTLISTED", company="Example CGT Co", title="Sr Dir RA CMC")
    bad = AnthropicTailor(AnthropicClient("sk", "claude-x", spend_authorized=True,
                          _create=_fake_transport("I boosted revenue by 87%.", ["acc-001"])))
    res = generate_bundle(conn, app, _ctx(), bad, materials_root=tmp_path, now=NOW)
    assert res.flagged                                # 87 has no backing accomplishment (I3)
    assert conn.execute("SELECT state FROM applications WHERE id=?", (app,)).fetchone()[0] == "SHORTLISTED"


def test_factory_gates_on_optin():
    assert isinstance(make_tailor({"llm": {"model_id": "", "spend_authorized": True}}, api_key="sk"), MockTailor)
    assert isinstance(make_tailor({"llm": {"model_id": "claude-x", "spend_authorized": False}}, api_key="sk"), MockTailor)
    assert isinstance(make_tailor({"llm": {"model_id": "claude-x", "spend_authorized": True}}, api_key="sk"), AnthropicTailor)
