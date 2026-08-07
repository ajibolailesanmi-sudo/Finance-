#!/usr/bin/env python3
"""Seed a DEMO database with items across every gate state, so the dashboard
(and CLIs) show realistic content on first run. Writes a separate data/demo.db —
it never touches your real data/app.db.

    python3 scripts/seed_demo.py
    JOBAGENT_DB=data/demo.db streamlit run review/dashboard.py

Re-runnable: it recreates data/demo.db each time. All data is fictional.
"""
from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from jobagent.common import config as cfg
from jobagent.common import db as dbm
from jobagent.common.sources_sync import sync_sources
from jobagent.discovery.normalize import dedup_key
from jobagent.gates import materials as g2
from jobagent.gates import transitions as T
from jobagent.tailoring import outreach
from jobagent.tailoring.generate import GenContext, MockTailor, generate_bundle
from jobagent.tailoring.library_loader import load_library

NOW = "2026-08-07T12:00:00Z"
DB = ROOT / "data" / "demo.db"
MAT = ROOT / "materials" / "demo"
LIB_PATH = ROOT / "tests" / "fixtures" / "library_demo" / "accomplishments.yaml"


def main() -> int:
    DB.parent.mkdir(parents=True, exist_ok=True)
    if DB.exists():
        DB.unlink()
    conn = dbm.connect(DB)
    dbm.migrate(conn, NOW)
    sync_sources(conn, cfg.load_sources(ROOT / "config" / "sources.yaml"))
    lib = load_library(LIB_PATH)

    def posting(company, title, ats="greenhouse"):
        url = f"https://ex.com/{title.replace(' ', '-').lower()}-{company[:4]}"
        return conn.execute(
            "INSERT INTO postings (dedup_key,company,title,apply_url,ats_platform,first_seen_at,"
            "description_text,location) VALUES (?,?,?,?,?,?,?,?)",
            (dedup_key(company, title, url), company, title, url, ats, NOW,
             "gene therapy CMC, IND to BLA", "Remote - US")).lastrowid

    def app(pid, state):
        aid = conn.execute("INSERT INTO applications (posting_id,state) VALUES (?,?)", (pid, state)).lastrowid
        conn.execute("INSERT INTO state_history (application_id,from_state,to_state,actor,at) "
                     "VALUES (?,?,?,?,?)", (aid, None, state, "system", NOW))
        return aid

    def assess(pid, tier, fit):
        conn.execute(
            "INSERT INTO assessments (posting_id,scored_at,model_id,prompt_version,criteria_version,"
            "fit_score,tier,rationale,matched_qualifications,missing_qualifications,dealbreaker_hits) "
            "VALUES (?,?,'mock','score-v1','criteria-v1',?,?,?,?,?,'[]')",
            (pid, NOW, fit, tier, "CGT modality, IND-BLA CMC leadership, agency-facing scope.",
             json.dumps(["CMC", "gene therapy", "IND", "BLA"]), json.dumps(["EU MAA"])))

    # Gate 1 — SCORED
    for co, ti, tier, fit in [
        ("Vireo Cell Therapeutics", "Senior Director, Regulatory Affairs CMC", "APPLY_NOW", 88),
        ("Helix Biologics", "Head of Quality (Quality Systems)", "APPLY_NOW", 84),
        ("Northmark CDMO", "Director, CMC Program Management", "CONSIDER", 66)]:
        pid = posting(co, ti); app(pid, "SCORED"); assess(pid, tier, fit)

    ctx = GenContext(posting={"company": "Example CGT Co",
                              "title": "Senior Director, Regulatory Affairs CMC",
                              "description_text": "gene therapy CMC, IND to BLA"}, library=lib)

    # Gate 2 — DRAFTED bundle
    pid = posting("Example CGT Co", "Senior Director, Regulatory Affairs CMC")
    a2 = app(pid, "SHORTLISTED"); assess(pid, "APPLY_NOW", 90)
    generate_bundle(conn, a2, ctx, MockTailor(), materials_root=MAT, now=NOW)

    # Gate 3 — PREFILLED (approve a bundle, then halt at a review capture)
    pid = posting("Auralis Bio", "Executive Director, CMC Regulatory")
    a3 = app(pid, "SHORTLISTED"); assess(pid, "APPLY_NOW", 86)
    generate_bundle(conn, a3, ctx, MockTailor(), materials_root=MAT, now=NOW)
    item = next(i for i in g2.build_gate2_queue(conn) if i["app_id"] == a3)
    g2.approve_bundle(conn, a3, {k: v["version_id"] for k, v in item["versions"].items()}, NOW)
    cap = MAT / f"{a3}.txt"
    cap.write_text(
        "REVIEW SCREEN CAPTURE - greenhouse.io/auralis/jobs/210\n----\nfilled fields:\n"
        "  first_name: Ola\n  last_name: Candidate\n  email: ola.candidate@example.com\n"
        f"  resume: [file] materials/demo/{a3}/v2/resume_emphasis.md\n"
        "submit control present but NOT activated: true\nunfilled required fields: none",
        encoding="utf-8")
    T.transition(conn, a3, "PREFILLED", actor=T.SYSTEM, now=NOW,
                 fields={"prefill_method": "scripted", "screenshot_path": str(cap)})

    # Gate 4 — outreach draft
    outreach.draft_outreach(conn, application_id=a2, purpose="referral", library=lib,
                            posting={"company": "Example CGT Co",
                                     "title": "Senior Director, Regulatory Affairs CMC",
                                     "description_text": "gene therapy CMC"},
                            contact_ref="Jane - ex-colleague", materials_root=MAT, now=NOW)

    # Pipeline / digest history
    def hist(company, title, states):
        pid = posting(company, title)
        aid = conn.execute("INSERT INTO applications (posting_id,state) VALUES (?,?)",
                           (pid, states[-1])).lastrowid
        base = date(2026, 8, 1)
        for i, s in enumerate(states):
            at = (base + timedelta(days=i)).isoformat() + "T00:00:00Z"
            conn.execute("INSERT INTO state_history (application_id,from_state,to_state,actor,at) "
                         "VALUES (?,?,?,?,?)", (aid, states[i - 1] if i else None, s, "system", at))
        assess(pid, "APPLY_NOW", 80)

    submit = ["DISCOVERED", "SCORED", "SHORTLISTED", "DRAFTED", "APPROVED", "PREFILLED", "SUBMITTED"]
    hist("Cordent Tx", "Director, Quality", submit + ["ACKNOWLEDGED"])
    hist("Selta CDMO", "Head of RA", submit + ["ACKNOWLEDGED", "SCREENING", "INTERVIEWING"])
    hist("Kestrel Bio", "VP Quality (Device)", ["DISCOVERED", "SCORED", "DECLINED"])

    conn.commit(); conn.close()
    print(f"Seeded demo DB → {DB}")
    print("Run the dashboard against it:")
    print("  JOBAGENT_DB=data/demo.db streamlit run review/dashboard.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
