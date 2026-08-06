"""JSON Schema for an F2 assessment. LLM output is validated before any write.

Malformed output is retried (bounded), then quarantined — never partially
written (PROJECT_BIBLE.md §5). Proof: tests/test_scoring.py.
"""
from __future__ import annotations

ASSESSMENT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["fit_score", "tier", "rationale",
                 "matched_qualifications", "missing_qualifications", "dealbreaker_hits"],
    "properties": {
        "fit_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "tier": {"type": "string", "enum": ["APPLY_NOW", "CONSIDER", "SKIP"]},
        "rationale": {"type": "string", "minLength": 1, "maxLength": 2000},
        "matched_qualifications": {"type": "array", "items": {"type": "string"}},
        "missing_qualifications": {"type": "array", "items": {"type": "string"}},
        "dealbreaker_hits": {"type": "array", "items": {"type": "string"}},
    },
}
