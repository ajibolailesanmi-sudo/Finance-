"""F4 — bundle generation, claim gating before the queue, rework round-trip."""
from pathlib import Path

import pytest

from conftest import NOW, make_application

from jobagent.common.alerts import AlertCollector
from jobagent.tailoring.generate import (GenContext, MockTailor, generate_bundle,
                                         run_tailoring, TailoringViolation)
from jobagent.tailoring.library_loader import load_library, EmptyLibraryError

LIB = Path(__file__).parent / "fixtures" / "library_demo" / "accomplishments.yaml"
BLANK = Path(__file__).resolve().parent.parent / "library" / "accomplishments.yaml"


def _ctx(lib):
    posting = {"company": "Example CGT", "title": "Senior Director, Regulatory Affairs CMC",
               "description_text": "Lead CMC regulatory strategy for gene therapy, IND to BLA."}
    return GenContext(posting=posting, library=lib)


def test_empty_library_refuses():
    with pytest.raises(EmptyLibraryError):
        load_library(BLANK)   # shipped template has 0 usable entries


def test_clean_bundle_drafts_and_validates(conn, tmp_path):
    lib = load_library(LIB)
    app = make_application(conn, state="SHORTLISTED", company="Example CGT",
                           title="Senior Director, Regulatory Affairs CMC")
    res = generate_bundle(conn, app, _ctx(lib), MockTailor(),
                          materials_root=tmp_path, now=NOW)
    assert res.clean and set(res.written) == {"summary", "resume_emphasis",
                                              "cover_letter", "screening_answers"}
    state = conn.execute("SELECT state FROM applications WHERE id=?", (app,)).fetchone()[0]
    assert state == "DRAFTED"
    # Every generated version records the library_version (traceability, I4).
    rows = conn.execute("SELECT library_version FROM materials_versions WHERE application_id=?", (app,)).fetchall()
    assert all(r[0].startswith("sha256:") for r in rows)


class FabricatingTailor(MockTailor):
    """A tailor that plants an uncited metric to prove the gate rejects it."""
    def generate(self, kind, ctx):
        content, cites = super().generate(kind, ctx)
        if kind == "cover_letter":
            content += "\n\nI also increased revenue by 87%."   # not in library/posting
        return content, cites


def test_fabricated_metric_is_flagged_not_queued(conn, tmp_path):
    lib = load_library(LIB)
    app = make_application(conn, state="SHORTLISTED", company="Example CGT",
                           title="Senior Director, Regulatory Affairs CMC")
    alerts = AlertCollector()
    res = generate_bundle(conn, app, _ctx(lib), FabricatingTailor(),
                          materials_root=tmp_path, now=NOW, alerts=alerts)
    assert "cover_letter" in res.flagged and not res.clean
    # App does NOT advance to Gate 2 with a violating draft.
    state = conn.execute("SELECT state FROM applications WHERE id=?", (app,)).fetchone()[0]
    assert state == "SHORTLISTED"
    assert any("87" in v.detail for v in res.flagged["cover_letter"])
    assert alerts.alerts

    # strict mode raises instead of flagging.
    with pytest.raises(TailoringViolation):
        generate_bundle(conn, app, _ctx(lib), FabricatingTailor(),
                        materials_root=tmp_path, now=NOW, strict=True)


def test_run_tailoring_over_shortlisted(conn, tmp_path):
    lib = load_library(LIB)
    make_application(conn, state="SHORTLISTED", company="A", title="Director, Quality Systems")
    make_application(conn, state="SHORTLISTED", company="B", title="VP, Regulatory CMC")
    summary = run_tailoring(conn, lib, materials_root=tmp_path, voice_guide="", criteria="", now=NOW)
    assert summary["drafted"] == 2 and summary["flagged"] == 0
