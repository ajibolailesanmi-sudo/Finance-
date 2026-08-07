"""F6 — halt-at-review, screenshot, fallback + layout-drift -> PREFILL_FAILED."""
from pathlib import Path

from conftest import NOW, make_application

from jobagent.common.alerts import AlertCollector
from jobagent.gates import materials
from jobagent.prefill.driver import FakeDriver
from jobagent.prefill.profile import load_profile
from jobagent.prefill.session import prefill_batch
from jobagent.tailoring.generate import GenContext, MockTailor, generate_bundle
from jobagent.tailoring.library_loader import load_library

FORMS = Path(__file__).parent / "fixtures" / "forms"
LIB = Path(__file__).parent / "fixtures" / "library_demo" / "accomplishments.yaml"
PROFILE = load_profile(Path(__file__).parent / "fixtures" / "applicant_demo.yaml")


def _approved_app(conn, tmp_path, *, platform, company, title):
    app = make_application(conn, state="SHORTLISTED", company=company, title=title, ats=platform)
    lib = load_library(LIB)
    ctx = GenContext(posting={"company": company, "title": title,
                              "description_text": "gene therapy CMC, IND to BLA"}, library=lib)
    generate_bundle(conn, app, ctx, MockTailor(), materials_root=tmp_path, now=NOW)
    item = next(i for i in materials.build_gate2_queue(conn) if i["app_id"] == app)
    materials.approve_bundle(conn, app, {k: v["version_id"] for k, v in item["versions"].items()}, NOW)
    return app


def _factory(fixture_by_app):
    def factory(row):
        return FakeDriver(str(FORMS / fixture_by_app[row["app_id"]]))
    return factory


def test_prefill_halts_at_review_with_screenshot(conn, tmp_path):
    gh = _approved_app(conn, tmp_path, platform="greenhouse", company="CGT", title="Sr Dir RA CMC")
    lv = _approved_app(conn, tmp_path, platform="lever", company="Bio", title="VP Reg CMC")
    factory = _factory({gh: "greenhouse_form.html", lv: "lever_form.html"})

    summary = prefill_batch(conn, factory, PROFILE, screenshots_dir=tmp_path / "shots", now=NOW)
    assert summary == {"prefilled": 2, "failed": 0}

    for app in (gh, lv):
        row = conn.execute("SELECT state, prefill_method, screenshot_path FROM applications WHERE id=?", (app,)).fetchone()
        assert row["state"] == "PREFILLED" and row["prefill_method"] == "scripted"
        cap = Path(row["screenshot_path"]).read_text()
        # Evidence: fields filled, submit present but NOT activated.
        assert "REVIEW SCREEN CAPTURE" in cap
        assert "ola.candidate@example.com" in cap
        assert "submit control present but NOT activated: True" in cap
        assert "unfilled required fields: none" in cap


def test_unknown_ats_routes_to_fallback_failed(conn, tmp_path):
    app = _approved_app(conn, tmp_path, platform="workday", company="X", title="Dir")
    # No scripted flow for workday -> fallback -> PREFILL_FAILED (computer_use/manual).
    factory = _factory({app: "greenhouse_form.html"})
    summary = prefill_batch(conn, factory, PROFILE, screenshots_dir=tmp_path / "shots", now=NOW)
    assert summary == {"prefilled": 0, "failed": 1}
    row = conn.execute("SELECT state, prefill_method, notes FROM applications WHERE id=?", (app,)).fetchone()
    assert row["state"] == "PREFILL_FAILED" and row["prefill_method"] == "computer_use"
    assert "workday" in row["notes"]


def test_layout_drift_triggers_failed(conn, tmp_path):
    app = _approved_app(conn, tmp_path, platform="greenhouse", company="Y", title="Dir QA")
    # The greenhouse flow runs against a drifted form with a NEW required field.
    factory = _factory({app: "greenhouse_form_extrafield.html"})
    alerts = AlertCollector()
    summary = prefill_batch(conn, factory, PROFILE, screenshots_dir=tmp_path / "shots", now=NOW, alerts=alerts)
    assert summary == {"prefilled": 0, "failed": 1}
    row = conn.execute("SELECT state, notes, screenshot_path FROM applications WHERE id=?", (app,)).fetchone()
    assert row["state"] == "PREFILL_FAILED"
    assert "work_authorization" in row["notes"]        # the unknown required field
    assert Path(row["screenshot_path"]).exists()        # screenshot captured on failure
    assert alerts.alerts


def test_prefill_never_reaches_submitted(conn, tmp_path):
    app = _approved_app(conn, tmp_path, platform="greenhouse", company="Z", title="Dir")
    prefill_batch(conn, _factory({app: "greenhouse_form.html"}),
                  PROFILE, screenshots_dir=tmp_path / "shots", now=NOW)
    # The whole batch never produces a SUBMITTED row — that needs a human (F7).
    assert conn.execute("SELECT COUNT(*) FROM applications WHERE state='SUBMITTED'").fetchone()[0] == 0
