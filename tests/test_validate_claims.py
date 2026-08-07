"""I3 — the claim validator (planted uncited metric -> rejected)."""
from pathlib import Path

from jobagent.tailoring.library_loader import load_library
from jobagent.tailoring.validate_claims import extract_numbers, validate_material

LIB = Path(__file__).parent / "fixtures" / "library_demo" / "accomplishments.yaml"


def _lib():
    return load_library(LIB)


def test_extract_numbers():
    nums = extract_numbers("Reduced cycle by 40%, led 12 meetings, $2M saved in 2025")
    assert {"40", "12", "2"}.issubset(nums)


def test_backed_claim_passes():
    lib = _lib()
    # 40 comes from acc-002 ("reduced CAPA closure time by 40%")
    content = "I reduced CAPA closure time by 40% at a commercial GMP site."
    assert validate_material(content, ["acc-002"], lib) == []


def test_planted_uncited_metric_rejected():
    lib = _lib()
    # 87% appears nowhere in the library or a posting -> fabricated metric.
    content = "I improved yield by 87% across the network."
    violations = validate_material(content, ["acc-002"], lib)
    assert any(v.kind == "uncited_metric" and "87" in v.detail for v in violations)


def test_metric_from_wrong_uncited_accomplishment_rejected():
    lib = _lib()
    # 12 is real (acc-003) but the draft only cites acc-001 -> not backed by a CITED acc.
    content = "I led 12 health-authority meetings."
    violations = validate_material(content, ["acc-001"], lib)
    assert any(v.kind == "uncited_metric" and "12" in v.detail for v in violations)
    # Citing the right accomplishment fixes it.
    assert validate_material(content, ["acc-003"], lib) == []


def test_unknown_citation_rejected():
    lib = _lib()
    violations = validate_material("Solid track record.", ["acc-999"], lib)
    assert any(v.kind == "unknown_citation" for v in violations)


def test_posting_numbers_are_allowed():
    lib = _lib()
    # A "10+ years" requirement echoed from the posting is not a fabricated claim.
    content = "I bring more than 10 years of experience."
    assert validate_material(content, [], lib, posting_text="Requires 10+ years") == []
