"""F0.1 — accomplishment library linter."""
import pytest

from pathlib import Path

from jobagent.common.library import lint_accomplishments, LibraryError

ROOT = Path(__file__).resolve().parent.parent


def test_shipped_template_is_structurally_valid_but_unusable():
    res = lint_accomplishments(ROOT / "library" / "accomplishments.yaml")
    assert res["entries"] >= 1
    assert res["usable"] == 0  # blank template: no verified entries yet


def test_malformed_missing_keys_rejected(tmp_path):
    p = tmp_path / "a.yaml"
    p.write_text("accomplishments:\n  - id: acc-1\n    statement: x\n")
    with pytest.raises(LibraryError, match="missing keys"):
        lint_accomplishments(p)


def test_duplicate_ids_rejected(tmp_path):
    p = tmp_path / "a.yaml"
    p.write_text(
        "accomplishments:\n"
        + "".join(
            f"  - id: acc-1\n    statement: s\n    metric: m\n    context: c\n"
            f"    evidence_note: e\n    verified_at: 2026-01-01\n" for _ in range(2)
        )
    )
    with pytest.raises(LibraryError, match="duplicate"):
        lint_accomplishments(p)


def test_verified_entry_counts_as_usable(tmp_path):
    p = tmp_path / "a.yaml"
    p.write_text(
        "accomplishments:\n"
        "  - id: acc-1\n    statement: Led BLA\n    metric: 3 filings\n"
        "    context: CGT\n    evidence_note: filing\n    verified_at: 2026-01-01\n"
    )
    assert lint_accomplishments(p)["usable"] == 1
