"""F5 — Gate 2 approve/rework, immutability (I4), and downstream gating."""
from pathlib import Path

import pytest

from conftest import NOW, make_application

from jobagent.gates import materials, transitions
from jobagent.tailoring import materials_store as store
from jobagent.tailoring.generate import GenContext, MockTailor, generate_bundle
from jobagent.tailoring.library_loader import load_library

LIB = Path(__file__).parent / "fixtures" / "library_demo" / "accomplishments.yaml"


def _drafted_app(conn, tmp_path):
    lib = load_library(LIB)
    app = make_application(conn, state="SHORTLISTED", company="Example CGT",
                           title="Senior Director, Regulatory Affairs CMC")
    ctx = GenContext(posting={"company": "Example CGT",
                              "title": "Senior Director, Regulatory Affairs CMC",
                              "description_text": "gene therapy CMC, IND to BLA"}, library=lib)
    generate_bundle(conn, app, ctx, MockTailor(), materials_root=tmp_path, now=NOW)
    return app


def test_approve_locks_versions_and_advances(conn, tmp_path):
    app = _drafted_app(conn, tmp_path)
    item = materials.build_gate2_queue(conn)[0]
    vids = {k: v["version_id"] for k, v in item["versions"].items()}
    materials.approve_bundle(conn, app, vids, NOW)

    row = conn.execute("SELECT state, g2_approved_at, approved_version_ids FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "APPROVED" and row[1] == NOW
    import json
    assert json.loads(row[2]) == vids   # traceability (I4)
    # Approved versions are frozen.
    for vid in vids.values():
        assert store.get_version(conn, vid)["status"] == "approved"


def test_approved_version_is_immutable(conn, tmp_path):
    app = _drafted_app(conn, tmp_path)
    item = materials.build_gate2_queue(conn)[0]
    vids = {k: v["version_id"] for k, v in item["versions"].items()}
    materials.approve_bundle(conn, app, vids, NOW)

    vid = next(iter(vids.values()))
    # DB trigger refuses any update to an approved row (I4).
    with pytest.raises(Exception, match="immutable"):
        conn.execute("UPDATE materials_versions SET content_path='x' WHERE id=?", (vid,))


def test_gate2_needs_versions_no_shortcut(conn):
    # An app in DRAFTED with no approved versions cannot be forced APPROVED.
    app = make_application(conn, state="DRAFTED")
    with pytest.raises(transitions.TransitionError, match="approved_version_ids"):
        transitions.transition(conn, app, "APPROVED", actor=transitions.CANDIDATE, now=NOW)


def test_rework_round_trips_notes(conn, tmp_path):
    app = _drafted_app(conn, tmp_path)
    materials.rework(conn, app, "Tighten the cover letter; lead with the BLA filing.", NOW)
    row = conn.execute("SELECT state, notes FROM applications WHERE id=?", (app,)).fetchone()
    assert row[0] == "REWORK" and "BLA filing" in row[1]

    # F4 regeneration consumes the notes and returns to DRAFTED.
    lib = load_library(LIB)
    ctx = GenContext(posting={"company": "Example CGT", "title": "Senior Director",
                              "description_text": "gene therapy"}, library=lib,
                     rework_notes=row[1])
    res = generate_bundle(conn, app, ctx, MockTailor(), materials_root=tmp_path, now=NOW)
    assert res.clean
    assert conn.execute("SELECT state FROM applications WHERE id=?", (app,)).fetchone()[0] == "DRAFTED"
