"""F10 — outreach drafting; I9 absence-of-transport audit; I3 applies."""
import re
from pathlib import Path

import pytest

from conftest import NOW, make_application

from jobagent.tailoring import outreach
from jobagent.tailoring.library_loader import load_library

LIB = Path(__file__).parent / "fixtures" / "library_demo" / "accomplishments.yaml"
POSTING = {"company": "Example CGT", "title": "Senior Director, Regulatory Affairs CMC",
           "description_text": "gene therapy CMC"}


def test_draft_and_status_flow(conn, tmp_path):
    app = make_application(conn, state="SHORTLISTED")
    lib = load_library(LIB)
    did = outreach.draft_outreach(conn, application_id=app, purpose="referral", library=lib,
                                  posting=POSTING, contact_ref="Jane (ex-colleague)",
                                  materials_root=tmp_path, now=NOW)
    row = conn.execute("SELECT status, draft_path FROM outreach_drafts WHERE id=?", (did,)).fetchone()
    assert row["status"] == "draft" and Path(row["draft_path"]).exists()

    outreach.mark_personalized(conn, did)
    outreach.mark_sent_by_human(conn, did, NOW)
    row = conn.execute("SELECT status, sent_noted_at FROM outreach_drafts WHERE id=?", (did,)).fetchone()
    assert row["status"] == "sent_by_human" and row["sent_noted_at"] == NOW


def test_outreach_respects_i3(conn, tmp_path):
    """A draft can't contain a metric absent from the library (guarded)."""
    app = make_application(conn, state="SHORTLISTED")
    lib = load_library(LIB)
    # Monkeypatch the opener to inject a fabricated number, prove it's caught.
    orig = outreach._OPENERS["recruiter"]
    outreach._OPENERS["recruiter"] = orig + " I closed 99% of deals."
    try:
        with pytest.raises(ValueError, match="I3"):
            outreach.draft_outreach(conn, application_id=app, purpose="recruiter", library=lib,
                                    posting=POSTING, contact_ref=None, materials_root=tmp_path, now=NOW)
    finally:
        outreach._OPENERS["recruiter"] = orig


def test_no_transport_capability_in_module():
    """I9 — the outreach module must have no send/transport capability."""
    src = Path(outreach.__file__).read_text(encoding="utf-8")
    banned = ["smtplib", "urllib.request", "http.client", "requests.", "sendmail",
              "socket.", "aiohttp", ".send("]
    hits = [tok for tok in banned if re.search(re.escape(tok), src)]
    assert hits == [], f"transport capability found in outreach module (I9): {hits}"
