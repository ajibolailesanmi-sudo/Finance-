"""Production review dashboard (Streamlit) — the D1 surface, approved via a
flow-prototype pass. Run with:

    pip install streamlit
    streamlit run review/dashboard.py            # uses config/settings.yaml db_path
    JOBAGENT_DB=/path/to/app.db streamlit run review/dashboard.py

This is a thin view over review/service.py (offline-tested). Every state change
goes through the same transitions.py guard as the CLI, so all invariants hold.
Gate 3 RECORDS your own submission (F7) — there is no employer-submit path here (I1).
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))          # make jobagent importable
sys.path.insert(0, str(Path(__file__).resolve().parent))  # make service importable

import service as svc  # noqa: E402
from jobagent.common import config as cfg  # noqa: E402

st.set_page_config(page_title="HITL Job Agent — Review Console", page_icon="🧪", layout="wide")

# --- small palette + chip CSS (semantic colour separate from the accent) ----
st.markdown("""
<style>
  .chip{font-family:ui-monospace,Menlo,monospace;font-size:11px;padding:2px 8px;border-radius:20px;
        border:1px solid rgba(128,128,128,.25);white-space:nowrap}
  .apply{background:rgba(14,124,134,.14);color:#0E7C86}
  .consider{background:rgba(90,102,107,.14);color:#5A666B}
  .skip{background:rgba(147,160,165,.16);color:#8A969B}
  .good{background:rgba(31,122,84,.14);color:#1F7A54}
  .warn{background:rgba(154,106,18,.16);color:#9A6A12}
  .crit{background:rgba(178,58,40,.14);color:#B23A28}
  .idm{font-family:ui-monospace,Menlo,monospace;font-size:12px;opacity:.7}
  .stButton>button{border-radius:8px}
</style>
""", unsafe_allow_html=True)


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@st.cache_resource
def _settings() -> dict:
    return cfg.load_yaml(ROOT / "config" / "settings.yaml") or {}


def get_conn():
    settings = _settings()
    db = os.environ.get("JOBAGENT_DB") or str(ROOT / settings.get("db_path", "data/app.db"))
    return svc.connect(db)


def chip(text: str, cls: str) -> str:
    return f'<span class="chip {cls}">{text}</span>'


def tier_cls(t: str) -> str:
    return {"APPLY_NOW": "apply", "CONSIDER": "consider", "SKIP": "skip"}.get(t, "consider")


def invariant(text: str) -> None:
    st.caption(text)


# --------------------------------------------------------------------------- #
conn = get_conn()
c = svc.counts(conn)

with st.sidebar:
    st.markdown("### 🧪 Review Console")
    st.caption("Signed in as **Olaoluwa** · Candidate")
    page = st.radio(
        "Navigate",
        ["Today",
         f"① Shortlist · {c['g1']}",
         f"② Materials · {c['g2']}",
         f"③ Pre-fill & submit · {c['g3']}",
         f"④ Outreach · {c['g4']}",
         "Pipeline", "Weekly digest"],
        label_visibility="collapsed",
    )
    st.caption("The agent proposes; you decide and release.")

key = page.split(" ")[0]


# ---- Today -----------------------------------------------------------------
if page == "Today":
    st.title("Today")
    st.caption("A short review session. Clear what's waiting at each gate.")
    ov = svc.overview(conn, now(), cadence=_settings().get("reminders"))
    m = st.columns(4)
    for col, (k, lbl, sub) in zip(m, [
        ("g1", "Awaiting shortlist", "Gate 1 · you decide"),
        ("g2", "Awaiting materials", "Gate 2 · read & approve"),
        ("g3", "Ready to submit", "Gate 3 · you submit"),
        ("g4", "Outreach drafts", "Gate 4 · you send")]):
        col.metric(lbl, ov["counts"][k], help=sub)

    st.subheader("Reminders")
    if not ov["reminders"]:
        st.caption("Nothing overdue.")
    for r in ov["reminders"]:
        st.markdown(f"{chip(r['kind'].replace('_',' '), 'warn' if r['kind']=='follow_up' else 'good' if r['kind']=='interview_prep' else 'consider')} {r['message']}", unsafe_allow_html=True)

    st.subheader("Source health")
    h = ov["health"]
    st.markdown(
        chip(f"{h['ok']}/{h['total_sources']} OK", "good")
        + " " + chip(f"{len(h['failing'])} failing", "warn" if h['failing'] else "consider")
        + " " + chip(f"{len(h['auto_disabled'])} auto-disabled", "crit" if h['auto_disabled'] else "consider")
        + " " + chip("LinkedIn · denylisted", "consider"),
        unsafe_allow_html=True)
    invariant("I5 — LinkedIn is manual-only, forever; it appears only as a denylisted entry.")


# ---- Gate 1: Shortlist -----------------------------------------------------
elif key == "①":
    st.title("Shortlist review")
    st.caption("Ranked APPLY_NOW → CONSIDER → SKIP. Your decision advances a role; the agent never can (I2).")
    q = svc.gate1_queue(conn)
    if not q:
        st.success("Queue cleared — session over. The nightly run refills this tomorrow.")
    for r in q:
        with st.container(border=True):
            head, badges = st.columns([4, 1])
            head.markdown(f"**{r['title']}**  \n{r['co'] if 'co' in r else r['company']} · <span class='idm'>{r['app_id']}</span>", unsafe_allow_html=True)
            badges.markdown(chip(r["tier"], tier_cls(r["tier"])) + f" **{r['fit_score']}**", unsafe_allow_html=True)
            st.write(r["rationale"])
            a, b, d = st.columns([1, 1, 6])
            if a.button("Shortlist", key=f"s{r['app_id']}", type="primary"):
                svc.decide_gate1(conn, r["app_id"], "SHORTLISTED", now()); st.rerun()
            if b.button("Decline", key=f"d{r['app_id']}"):
                svc.decide_gate1(conn, r["app_id"], "DECLINED", now()); st.rerun()


# ---- Gate 2: Materials -----------------------------------------------------
elif key == "②":
    st.title("Materials review")
    st.caption("Read every document that will represent you, then approve per-bundle — or bounce back with notes.")
    q = svc.gate2_queue(conn)
    if not q:
        st.info("Nothing to approve. Shortlist a role at Gate 1 and the agent drafts materials.")
    for item in q:
        with st.container(border=True):
            st.markdown(f"**{item['title']}** · {item['company']} · <span class='idm'>{item['app_id']}</span>", unsafe_allow_html=True)
            for kind, v in item["versions"].items():
                with st.expander(f"{kind} · v{v['version_n']} · cites {', '.join(v['citations']) or '—'}"):
                    st.text(v["content"])
            a, b, _ = st.columns([2, 2, 4])
            if a.button("Approve bundle → lock versions", key=f"ap{item['app_id']}", type="primary"):
                svc.approve_gate2(conn, item["app_id"], now()); st.rerun()
            with b.popover("Request rework…"):
                notes = st.text_area("Notes back to tailoring", key=f"rw{item['app_id']}")
                if st.button("Send to rework", key=f"rwb{item['app_id']}"):
                    svc.rework_gate2(conn, item["app_id"], notes or "revise", now()); st.rerun()
    invariant("I3 — only claim-validated drafts reach this queue. I4 — Approve freezes the exact versions shown (immutable, audited).")


# ---- Gate 3: Pre-fill & submit --------------------------------------------
elif key == "③":
    st.title("Pre-fill & submit")
    st.caption("Each approved application, halted at the employer's review screen. You review every field and submit personally.")
    q = svc.gate3_queue(conn)
    if not q:
        st.info("Nothing pre-filled. Approve a bundle at Gate 2, then run a pre-fill session.")
    for r in q:
        with st.container(border=True):
            st.markdown(f"**{r['title']}** · {r['company']} · <span class='idm'>{r['app_id']} · {r['ats_platform']} · {r['prefill_method']}</span>", unsafe_allow_html=True)
            if r["capture"]:
                st.code(r["capture"], language="text")
            st.markdown(chip("✓ submit control present but NOT activated", "good"), unsafe_allow_html=True)
            ref = st.text_input("Employer confirmation (optional)", key=f"ref{r['app_id']}")
            a, b, d = st.columns([3, 1, 1])
            if a.button("I reviewed & submitted it myself", key=f"sub{r['app_id']}", type="primary"):
                svc.record_submission(conn, r["app_id"], now(), confirmation_ref=ref or None); st.rerun()
            if b.button("Hold", key=f"hold{r['app_id']}"):
                svc.hold_submission(conn, r["app_id"], now()); st.rerun()
            if d.button("Withdraw", key=f"wd{r['app_id']}"):
                svc.withdraw(conn, r["app_id"], now()); st.rerun()
    invariant("I1 — no-submit: the automation halts at the review screen. This surface only RECORDS the submission you make yourself.")


# ---- Gate 4: Outreach ------------------------------------------------------
elif key == "④":
    st.title("Outreach")
    st.caption("Every touch is personal, in your voice, from your own accounts. The agent drafts; you send.")
    q = svc.gate4_queue(conn)
    if not q:
        st.info("No drafts to send.")
    for o in q:
        with st.container(border=True):
            st.markdown(f"**{o['purpose'].replace('_',' ')} — {o['company'] or 'general'}** · to {o['contact_ref'] or '—'} · {chip(o['status'],'warn' if o['status']=='personalized' else 'consider')}", unsafe_allow_html=True)
            st.text(o["body"])
            a, b, _ = st.columns([1, 1, 5])
            if a.button("Mark personalized", key=f"pz{o['id']}"):
                svc.personalize(conn, o["id"]); st.rerun()
            if b.button("Mark sent by me", key=f"snt{o['id']}", type="primary"):
                svc.mark_sent(conn, o["id"], now()); st.rerun()
    invariant("I9 — this module has no send capability; you copy the draft and send it from your own account.")


# ---- Pipeline --------------------------------------------------------------
elif page == "Pipeline":
    st.title("Pipeline")
    st.caption("One row per pursued posting, always in exactly one state — the audit spine.")
    rows = svc.pipeline(conn)
    st.dataframe(
        [{"app": r["app_id"], "state": r["state"], "company": r["company"], "title": r["title"]} for r in rows],
        use_container_width=True, hide_index=True,
    )


# ---- Weekly digest ---------------------------------------------------------
elif page == "Weekly digest":
    st.title("Weekly digest")
    st.caption("Computed from the applications log alone. Success is outcome quality, not volume.")
    d = svc.digest(conn, now(), window_days=int(_settings().get("digest", {}).get("window_days", 7)))
    m = d["metrics"]
    cols = st.columns(4)
    def pct(x): return "n/a" if x is None else f"{x*100:.0f}%"
    cols[0].metric("Response rate", pct(m["response_rate"]))
    cols[1].metric("Interview conv.", pct(m["interview_conversion"]))
    cols[2].metric("Shortlist precision", pct(m["shortlist_precision"]["precision"]))
    cols[3].metric("Pre-fill success", pct(m["prefill_success_rate"]["rate"]))
    st.subheader("Calibration")
    cal = d["calibration"]
    st.markdown(chip(f"{cal['precision_miss_count']} precision miss(es)", "warn")
                + " " + chip(f"{cal['upgrade_count']} upgrade(s)", "good"), unsafe_allow_html=True)
    if cal["precision_by_criteria_version"]:
        st.dataframe(
            [{"criteria_version": k, "precision": pct(v["precision"]),
              "reviewed": v["reviewed"], "shortlisted": v["shortlisted"]}
             for k, v in cal["precision_by_criteria_version"].items()],
            use_container_width=True, hide_index=True)
    st.caption("A criteria change never rescores history — each version keeps its own precision (F11).")

conn.close()
