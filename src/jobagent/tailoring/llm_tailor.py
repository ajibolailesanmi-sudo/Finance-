"""F4 real-LLM tailor — structured drafting behind the D6 spend gate + I3.

Symmetric with F2 scoring: the real client is inert until the Candidate pins a
model AND authorizes spend AND a key is present; otherwise the offline MockTailor.
Crucially, the real tailor's output still flows through validate_claims (I3) in
generate_bundle — a real model can no more smuggle an uncited metric than the
mock can. The model is asked to return {content, claim_citations}; the citations
are then verified against the library exactly like the mock's.

Proof: tests/test_llm_tailor.py.
"""
from __future__ import annotations

import json

from ..common.llmclient import AnthropicClient, MockLLMClient, make_llm_client
from .generate import GenContext, MockTailor, BUNDLE_KINDS

# Structured-output schema for one generated material.
TAILOR_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["content", "claim_citations"],
    "properties": {
        "content": {"type": "string", "minLength": 1},
        "claim_citations": {"type": "array", "items": {"type": "string"}},
    },
}

PROMPT_VERSION = "tailor-llm-v1"

# I7: only these posting fields are sent to the model.
_POSTING_WHITELIST = ("company", "title", "location", "work_arrangement", "description_text")

_KIND_GUIDANCE = {
    "summary": "a tight professional summary tailored to the posting",
    "resume_emphasis": "a re-ordered emphasis of the most relevant accomplishments for this posting",
    "cover_letter": "a concise cover letter in the candidate's voice",
    "screening_answers": "answers to likely screening questions, grounded in the accomplishments",
}


def build_tailor_prompt(kind: str, ctx: GenContext) -> str:
    accs = [{"id": a.id, "statement": a.statement, "metric": a.metric, "context": a.context}
            for a in ctx.library.accomplishments]
    posting = {k: ctx.posting.get(k) for k in _POSTING_WHITELIST}
    parts = [
        f"Draft {_KIND_GUIDANCE.get(kind, kind)} for this job application, in the "
        "candidate's own voice.",
        "STRICT RULE: use ONLY the accomplishments below as the source of any "
        "quantified claim, metric, credential, or experience. Never invent a "
        "number, employer, or fact that is not in them.",
        "Return JSON: {\"content\": <the document text>, \"claim_citations\": "
        "[<accomplishment ids you relied on>]}.",
        f"\nACCOMPLISHMENTS (the only allowed source of claims):\n{json.dumps(accs, ensure_ascii=False)}",
        f"\nVOICE GUIDE:\n{ctx.voice_guide}",
        f"\nCRITERIA:\n{ctx.criteria}",
        f"\nPOSTING:\n{json.dumps(posting, ensure_ascii=False)}",
    ]
    if ctx.rework_notes:
        parts.append(f"\nREWORK NOTES (address these):\n{ctx.rework_notes}")
    return "\n".join(parts)


class AnthropicTailor:
    """Real Claude tailor. Output is still I3-validated downstream (generate_bundle)."""

    def __init__(self, client: AnthropicClient):
        self._client = client.with_schema(TAILOR_SCHEMA)

    @property
    def model_id(self) -> str:
        return self._client.model_id

    def generate(self, kind: str, ctx: GenContext) -> tuple[str, list[str]]:
        obj = self._client.complete_json(build_tailor_prompt(kind, ctx))
        return obj["content"], list(obj.get("claim_citations", []))


def make_tailor(settings: dict, *, api_key: str | None = None):
    """Real tailor only when the Candidate has fully opted in (D6); else the mock."""
    client = make_llm_client(settings, output_schema=TAILOR_SCHEMA, api_key=api_key)
    if isinstance(client, AnthropicClient):
        return AnthropicTailor(client)
    return MockTailor()
