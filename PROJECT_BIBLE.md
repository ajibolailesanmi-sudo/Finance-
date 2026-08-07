# Human-in-the-Loop Job Application Agent

**Version:** 0.1 (foundation plan — pre-build)
**Owner:** Olaoluwa (the Candidate — sole deciding authority)
**Method:** Flow-by-flow. Every requirement in this document is attached to a named flow. If a piece of work cannot be traced to a flow ID, it is out of scope until a flow is added here.
**Paradigm:** automation (scheduled pipeline + browser automation) with a minimal human review surface (spreadsheet/CLI in v1, optional web dashboard later).

---

## 1. Identity & Mission

A semi-autonomous system that compresses the repetitive labor of a senior-level job search — discovery, screening, document tailoring, form pre-fill, and pipeline tracking — into short, structured human review sessions, while reserving every consequential judgment and every external-facing action for the Candidate.

**Mission in one line:** the agent proposes; only the human decides and releases.

Optimized for: **quality over volume**, **verifiability of every claim**, and **full auditability of every submission**. Explicitly **not** optimized for application count.

Target search (seed): regulated life-sciences leadership — CMC regulatory affairs, quality leadership, cell & gene therapy (see §16 Seed Configuration).

---

## 2. How to Use This Document

This is the single durable artifact for the project. It lives at the repository root and is updated whenever a durable decision is made (schema change, new flow, changed invariant, phase completion).

- **Flow contracts (§6)** are the unit of planning, building, and testing. **Build order (§13)** is dependency order between flows.
- The **invariants in §9** are testable requirements, not aspirations. Each has a named enforcement mechanism and appears in the verification plan (§14).
- **Open items live in §15.** Nothing in §15 blocks Phase 1 unless marked `[blocking]`.

---

## 3. Actors & Authority Model

| Actor | Role | Authority |
|---|---|---|
| **Candidate (Olaoluwa)** | Sole deciding authority | Approves shortlists, approves materials, performs every submission, sends every human communication, edits the source-of-truth library, changes configuration |
| **Agent (this system)** | Research analyst, drafting assistant, administrative coordinator | May search, normalize, score, draft, pre-fill, remind, and report. **May never submit, send, or assert unverified experience** |
| **External systems** | Job boards, ATS platforms (Greenhouse, Lever, Workday…), Claude API, scheduler | Interacted with only under the pacing, ToS, and privacy rules of §9 |

### The four human gates (architectural, not procedural)

| Gate | Decision | Enforced by |
|---|---|---|
| **G1 — Shortlist approval** | Which roles are pursued | Tailoring (F4) work queue selects only `SHORTLISTED` records with non-null `g1_approved_at` |
| **G2 — Materials approval** | Which words represent the Candidate | Pre-fill (F6) work queue selects only `APPROVED` records with locked `approved_version_ids` |
| **G3 — Submission** | Whether an application is released | The automation layer contains no code path that activates a submit control (Invariant I1). Submission is a physical human click |
| **G4 — Human communication** | Every message to a recruiter, referrer, or hiring manager | Outreach module has no transport integration (Invariant I9); drafts are copied out and sent by the Candidate from their own accounts |

"Downstream stages cannot execute against an item that has not cleared the preceding gate" is implemented as a **data-layer fact**: stage work queues are state-filtered queries, and transition guards refuse writes that skip states (Invariant I2).

---

## 4. Canonical State Machine

Every tracked opportunity is one row in `applications`, always in exactly one state.

### States

| State | Meaning | Set by |
|---|---|---|
| `DISCOVERED` | Collected, deduplicated, normalized | System (F1) |
| `SCORED` | Assessment attached; tier = `APPLY_NOW` / `CONSIDER` / `SKIP` | System (F2) |
| `SHORTLISTED` | Candidate selected it at Gate 1 | Candidate (F3) |
| `DECLINED` | Candidate passed at Gate 1 (kept for calibration data) | Candidate (F3) |
| `DRAFTED` | Tailored materials generated, awaiting Gate 2 | System (F4) |
| `REWORK` | Candidate bounced materials with notes | Candidate (F5) |
| `APPROVED` | Materials approved and version-locked at Gate 2 | Candidate (F5) |
| `PREFILLED` | Form completed and halted at final review screen; screenshot captured | System (F6) |
| `PREFILL_FAILED` | Automation could not complete the form; routed to fallback or manual | System (F6/F12) |
| `SUBMITTED` | Candidate personally clicked submit (Gate 3) | Candidate (F7) |
| `ACKNOWLEDGED` / `SCREENING` / `INTERVIEWING` / `OFFER` | Post-submission progress | Candidate (F8), system-suggested |
| `REJECTED` / `WITHDRAWN` / `STALE` | Closed outcomes | Candidate (F8); `STALE` system-suggested after N days silent |
| `ARCHIVED` | Terminal; retained for audit and metrics | Candidate or retention policy |

### Legal transitions (all others are refused by the transition guard)

```
DISCOVERED → SCORED                          (system, F2)
SCORED     → SHORTLISTED | DECLINED          (CANDIDATE ONLY, F3 / Gate 1)
SHORTLISTED→ DRAFTED                         (system, F4)
DRAFTED    → APPROVED | REWORK               (CANDIDATE ONLY, F5 / Gate 2)
REWORK     → DRAFTED                         (system, F4, with candidate notes)
APPROVED   → PREFILLED | PREFILL_FAILED      (system, F6)
PREFILL_FAILED → PREFILLED                   (fallback/computer-use or manual fill)
PREFILLED  → SUBMITTED                       (CANDIDATE ONLY, F7 / Gate 3 — human click)
APPROVED   → SUBMITTED                       (candidate applied manually, e.g. LinkedIn-hosted)
SUBMITTED  → ACKNOWLEDGED → SCREENING → INTERVIEWING → OFFER   (F8)
SUBMITTED/any post-submit state → REJECTED | WITHDRAWN | STALE (F8)
any closed state → ARCHIVED
```

**Enforcement design:** one `transitions.py` guard module owns all writes to `applications.state`; it checks (a) transition legality, (b) required approval timestamps/version IDs are present, (c) actor authorization (system code cannot execute CANDIDATE-ONLY transitions — those are only reachable from the review surface acting on explicit human input). SQLite `CHECK` constraints back up the guard where expressible.

---

## 5. Shared Data Contracts

These schemas are the shared contracts between flows. The orchestrator (not any single module) owns them; a module may not change a schema without a Bible update. Storage: SQLite (`data/app.db`) + versioned files under `materials/` and `library/`. LLM outputs are validated against JSON Schemas before any write; malformed output is retried, then quarantined (never partially written).

### 5.1 `postings` — normalized opportunity (written by F1)

```
id, dedup_key (normalized company+title+canonical_url hash),
company, title, location, work_arrangement (onsite|hybrid|remote),
comp_min, comp_max, comp_currency (nullable),
description_text, ats_platform (greenhouse|lever|workday|other|unknown),
apply_url, posted_at, first_seen_at,
sources[] (provenance: source_id, source_url, fetched_at, raw_ref)
```

### 5.2 `assessments` — structured fit evaluation (written by F2)

```
posting_id, scored_at, model_id, prompt_version, criteria_version,
fit_score (0–100), tier (APPLY_NOW|CONSIDER|SKIP),
rationale (short prose), matched_qualifications[], missing_qualifications[],
dealbreaker_hits[] (any hit forces tier=SKIP)
```

### 5.3 `materials_versions` — immutable generated/edited documents (written by F4, locked by F5)

```
id, application_id, kind (summary|resume_emphasis|cover_letter|screening_answers|outreach),
version_n, content_path, generated_at, model_id, prompt_version,
library_version (accomplishment library git/content hash used),
claim_citations[] (accomplishment IDs backing each quantified claim — Invariant I3),
status (draft|approved|superseded), approved_at (nullable), human_edited (bool)
```

**Rule:** rows are **append-only**. An edit creates `version_n+1`; approval sets `approved_at` and the version becomes immutable.

### 5.4 `applications` — the audit spine (one row per pursued posting)

```
id, posting_id, state (see §4), tier_at_g1,
g1_approved_at, g1_decided_by,
g2_approved_at, approved_version_ids {kind → materials_version_id},
prefill_at, prefill_method (scripted|computer_use|manual), screenshot_path,
submitted_at, submitted_confirmed_by_human (bool, always true by construction),
contacts[] (name, role, channel — voluntarily received only),
next_action, next_action_date, outcome, outcome_at, notes, state_history[] (timestamped)
```

### 5.5 `sources` — discovery source registry (configured in F0.2, read by F1)

```
id, type (board_api|ats_endpoint|rss|scraper), name, config (endpoint, params),
enabled, denylisted (LinkedIn: permanently true — Invariant I5),
pacing (min_interval, jitter, nightly_cap), last_run_at, last_success_at,
consecutive_failures, alert_threshold
```

### 5.6 Human-owned source-of-truth library (files, maintained in F0.1)

```
library/master_resume.md          — canonical resume
library/accomplishments.yaml      — entries: {id, statement, metric, context,
                                    evidence_note, verified_at}   ← only source of claims
library/voice_guide.md            — how the Candidate actually writes
config/criteria.md                — priorities, dealbreakers, preferences, weights
config/search_profile.yaml        — titles, keywords, geos, seniority, comp floor (§16)
```

### 5.7 `outreach_drafts` (written by F10; no transport fields by design)

```
id, application_id (nullable), contact_ref, purpose (referral|recruiter|follow_up|thank_you),
draft_path, created_at, status (draft|personalized|sent_by_human), sent_noted_at
```

---

## 6. Flow Inventory

A flow is one actor pursuing one measurable goal. Flow numbers follow pipeline order; odd interleaving is deliberate — every machine flow is followed by the human gate that controls it. Each contract lists: **Actor · Goal · Trigger/Entry · Surface · Behavior · States handled · Data touched · Depends on · Proof · Phase.**

### Foundation flows (human-owned setup)

#### F0 — Bootstrap the workspace
- **Actor:** Candidate (agent-assisted) · **Goal:** a runnable empty system: repo, DB schema migrated, config templates in place, secrets in keychain/env.
- **Trigger:** project start · **Surface:** terminal (`scripts/bootstrap.py`).
- **Behavior:** create directory layout (§8) → run migrations → write config templates → verify credentials present (fail with named-missing-secret message, never prompt to hardcode).
- **States:** success (idempotent — safe to run twice); failure (missing dependency/secret → actionable error, no partial DB).
- **Data:** `app.db` schema, `config/*` templates · **Depends on:** nothing · **Proof:** bootstrap runs twice with identical result; migrations replay deterministically on a fresh DB.
- **Phase:** 1

#### F0.1 — Maintain the source-of-truth library
- **Actor:** Candidate · **Goal:** resume, accomplishment library, voice guide, and criteria document are current, verified, and version-tracked.
- **Trigger:** project start; then whenever an accomplishment, preference, or dealbreaker changes · **Surface:** text editor + git.
- **Behavior:** Candidate writes/edits `library/*` and `config/criteria.md`; each accomplishment entry carries `verified_at` set by the Candidate; commits create the `library_version` hash that generation cites (I3, I4).
- **States:** validation — a schema linter rejects malformed `accomplishments.yaml`; an entry without `verified_at` is unusable by F4.
- **Data:** §5.6 files · **Depends on:** F0 · **Proof:** linter passes; F4 refuses to run against an empty/invalid library (tested).
- **Phase:** 1 (minimal: resume + criteria); hardened in Phase 2 (full accomplishment library + voice guide).

#### F0.2 — Configure discovery sources & search profile
- **Actor:** Candidate (agent-assisted research) · **Goal:** an enabled, paced source registry and a search profile that defines collection scope.
- **Trigger:** project start; revisited by F11 · **Surface:** `config/sources.yaml`, `config/search_profile.yaml`.
- **Behavior:** enumerate target-company Greenhouse/Lever endpoints, board APIs, RSS feeds; set pacing per source; LinkedIn is present only as a permanently denylisted entry (I5) so the exclusion is explicit, not implicit.
- **States:** validation — unknown source type or missing pacing refuses to load; a source failing N consecutive runs auto-disables and alerts (F12).
- **Data:** `sources`, profile files · **Depends on:** F0 · **Proof:** config loads; a seeded bad source is refused; denylist test passes.
- **Phase:** 1 (2–3 source types), expanded in Phase 4.

### The pipeline: machine flow → human gate, five times

#### F1 — Nightly discovery run (perception)
- **Actor:** System · **Goal:** every new in-scope posting is captured exactly once, normalized to §5.1.
- **Trigger:** scheduler, nightly · **Surface:** none (headless); log + F12 alerts.
- **Behavior:** for each enabled source: fetch under pacing (I6) → parse → normalize → dedup against `dedup_key` (merge provenance on duplicates) → insert as `DISCOVERED`.
- **States:** per-source failure isolates (one broken scraper never kills the run); retry with backoff; partial-run resumes next night without duplication; malformed postings quarantined with reason.
- **Data:** writes `postings`, `applications` stubs · **Depends on:** F0.2 · **Proof:** fixture-based normalization tests per source type; dedup determinism test (same input twice → zero new rows); one real nightly-run transcript.
- **Phase:** 1

#### F2 — Fit scoring run (reasoning)
- **Actor:** System (LLM) · **Goal:** every `DISCOVERED` posting carries a §5.2 assessment the Candidate can trust at the top of the ranking.
- **Trigger:** after F1 completes · **Surface:** none; output lands in the Gate 1 queue.
- **Behavior:** for each unscored posting: prompt = posting + master resume + `criteria.md` → structured JSON (schema-enforced) → any `dealbreaker_hit` forces `SKIP` → write assessment, transition to `SCORED`.
- **States:** malformed LLM output → bounded retry → quarantine; API outage → resume next cycle; oversized descriptions truncated by section-priority rules, flagged in rationale.
- **Data:** reads `postings`, library; writes `assessments` · **Depends on:** F1, F0.1 · **Proof:** schema-validation tests (malformed JSON rejected); dealbreaker-forcing test; `prompt_version` recorded on every row; shortlist precision tracked from real G1 decisions (§11).
- **Phase:** 1

#### F3 — Gate 1: shortlist review (human)
- **Actor:** Candidate · **Goal:** clear the scored queue in minutes, with `APPLY_NOW` precision high enough to trust.
- **Trigger:** review session every 1–2 days (target ≤ 20 min) · **Surface:** v1 = ranked spreadsheet/CLI queue (score, tier, rationale, matched/missing, link); later dashboard (§15 D1).
- **Behavior:** per item: `SHORTLISTED` or `DECLINED` (one keystroke/cell); optional note. Decision + timestamp recorded; `DECLINED` on an `APPLY_NOW` item is captured as a precision miss for F11.
- **States:** skip/defer leaves item queued; bulk-decline for obvious noise; empty queue = session over.
- **Data:** `applications.state`, `g1_*` fields · **Depends on:** F2 · **Proof:** CANDIDATE-ONLY transition test (system caller refused); queue shows only `SCORED` items; timed real session ≤ 20 min.
- **Phase:** 1

#### F4 — Tailoring generation (generation)
- **Actor:** System (LLM) · **Goal:** a complete draft materials bundle per shortlisted role — targeted summary, resume-emphasis reordering, cover letter, screening answers — with zero claims outside the accomplishment library.
- **Trigger:** item enters `SHORTLISTED` (or returns as `REWORK` with notes) · **Surface:** none; output lands in Gate 2 queue.
- **Behavior:** inputs strictly = master resume + accomplishment library + voice guide + posting + criteria (+ rework notes). Every quantified claim must cite an accomplishment ID; the claim validator rejects uncited metrics before the draft reaches the queue (I3). Writes §5.3 draft versions, transitions to `DRAFTED`.
- **States:** validator rejection → one regeneration → then flagged to human with the violation shown; library entry missing → flow refuses (points to F0.1) rather than inventing.
- **Data:** reads library, `postings`, `assessments`; writes `materials_versions` · **Depends on:** F3, F0.1 · **Proof:** failing-first validator tests (planted uncited metric → rejected); prohibition test (fact absent from library never appears in output across fixture set); voice-guide spot-check in G2.
- **Phase:** 2

#### F5 — Gate 2: materials review & approval (human)
- **Actor:** Candidate · **Goal:** every document that will represent the Candidate is read, edited as needed, and explicitly approved.
- **Trigger:** items in `DRAFTED` during a review session · **Surface:** v1 = files in `materials/<app-id>/v<N>/` + queue row; diffs against master resume shown.
- **Behavior:** edit → saves as new version (`human_edited=true`) → Approve locks `approved_version_ids` and transitions to `APPROVED`; or Rework with notes bounces to F4. Approval is per-bundle, explicit, timestamped.
- **States:** partial approval (e.g. resume yes, letter rework) supported per kind; nothing downstream can read a draft version (queue filters on approved).
- **Data:** `materials_versions.status`/`approved_at`, `applications` · **Depends on:** F4 · **Proof:** immutability test (write to approved version refused); F6 queue ignores items lacking `approved_version_ids`; version-traceability check (I4).
- **Phase:** 2

#### F6 — Pre-fill batch session (action)
- **Actor:** System, with Candidate present (semi-attended, batched 2–3×/week) · **Goal:** each `APPROVED` application is fully completed on the employer's form and halted at the final review screen.
- **Trigger:** Candidate starts `scripts/prefill_session.py` with a batch of `APPROVED` items · **Surface:** visible browser (never headless — the Candidate watches the run land on the review screen).
- **Behavior:** navigate to `apply_url` → scripted Playwright flow for known ATS platforms; computer-use agent fallback for novel layouts → populate personal info, upload approved documents (exact `approved_version_ids`), answer screening questions only from the approved answer set → halt before submit → capture full-form screenshot → transition to `PREFILLED`.
- **States:** unknown field → pause and ask the Candidate in-session (answer optionally added to approved set for reuse); layout mismatch → fallback → else `PREFILL_FAILED` with screenshot + reason; CAPTCHA/login walls → hand control to Candidate, never bypass; pacing between applications (I6).
- **Data:** reads approved versions; writes `prefill_*`, `screenshot_path` · **Depends on:** F5 · **Proof:** no-submit static test — the pre-fill layer contains no selector/action bound to submit controls (I1); runtime proof: recorded fixture forms for each scripted ATS end at review screen with screenshot; fallback-trigger test.
- **Phase:** 3 (scripted platforms chosen from real pipeline data, expected Greenhouse/Lever + one more — §15 D5)

#### F7 — Gate 3: final review & manual submission (human — absolute)
- **Actor:** Candidate · **Goal:** every released application was personally reviewed and personally submitted.
- **Trigger:** immediately after each F6 item, same sitting · **Surface:** the live browser form itself.
- **Behavior:** Candidate reviews every field against the screenshot/queue row → corrects anything → personally clicks submit → confirms in the tool → `SUBMITTED` recorded with timestamp and approved-version audit trail (I4).
- **States:** Candidate declines to submit → stays `PREFILLED` with note, or `WITHDRAWN`; employer confirmation page/number captured to notes when available.
- **Data:** `submitted_at`, `submitted_confirmed_by_human` · **Depends on:** F6 · **Proof:** grep/AST audit + code review on every pre-fill change (I1); `SUBMITTED` transition reachable only from the review surface.
- **Phase:** 3

#### F8 — Pipeline status upkeep (memory)
- **Actor:** Candidate (system-suggested) · **Goal:** the log reflects reality: every response, rejection, and advance is recorded within a day or two.
- **Trigger:** during regular review sessions; system suggests `STALE` after N silent days · **Surface:** queue/spreadsheet status column.
- **Behavior:** one-touch status updates along §4 post-submit states; recording an advance to `INTERVIEWING` triggers interview-prep task creation (F9); contacts added only when voluntarily received (I7).
- **States:** correction supported (a mis-set status is amended with a new history entry, never by rewriting history); system `STALE` suggestion is dismissible.
- **Data:** `applications` state history, contacts, outcomes · **Depends on:** F7 · **Proof:** state-history append test; metrics in §11 computable from log alone.
- **Phase:** 1 (manual log from day one), enriched later.

#### F9 — Reminders, deadlines & weekly digest
- **Actor:** System · **Goal:** nothing goes silent by accident, and the Candidate sees pipeline health weekly.
- **Trigger:** daily check (reminders/deadlines); weekly (digest) · **Surface:** digest file/email; reminder list in queue.
- **Behavior:** follow-up reminders on defined cadence per state; deadline flags from posting close dates; interview-prep tasks on advance; weekly digest = new opportunities, submissions, responses, conversion rates, precision (§11), source health.
- **States:** reminders are suggestions only — acting on them is F10/F8 (human); digest generation failure alerts (F12) but never blocks the pipeline.
- **Data:** reads everything; writes reminders, digest artifact · **Depends on:** F8 · **Proof:** digest correctness test against a seeded log with known metrics; reminder-cadence unit tests.
- **Phase:** 4 (a minimal "next_action_date is overdue" list ships in Phase 1).

#### F10 — Gate 4: outreach personalization & send (human)
- **Actor:** Candidate · **Goal:** every recruiter/referrer/hiring-manager touch is personal, in the Candidate's voice, from the Candidate's own accounts.
- **Trigger:** shortlisting a role with a known contact; reminder from F9; interview follow-ups · **Surface:** draft file → Candidate's own email/LinkedIn (manual).
- **Behavior:** agent drafts (voice guide + library constraints apply, I3) → Candidate personalizes → sends personally → marks `sent_by_human`. The module has **no transport integration** (I9): nothing to disable, nothing to misfire.
- **States:** draft → personalized → `sent_by_human`; abandoned drafts stay draft and expire from reminders after N days; a reply received is logged as a contact/status event in F8.
- **Data:** `outreach_drafts` · **Depends on:** F4-quality drafting, contacts from F8 · **Proof:** absence-of-transport audit (no mail/HTTP-send capability in module); status `sent_by_human` settable only from review surface.
- **Phase:** 2 (drafting), ongoing.

#### F11 — Calibration review (the loop that makes it improve)
- **Actor:** Candidate (agent-prepared analysis) · **Goal:** search profile, criteria weights, and scoring prompt improve against real data.
- **Trigger:** weekly, after digest · **Surface:** digest §"calibration" — precision misses (G1 declines of `APPLY_NOW`), G1 approvals of `CONSIDER`, response rate by tier/source.
- **Behavior:** Candidate adjusts `criteria.md` / `search_profile.yaml` / prompt version; changes are versioned so every assessment remains traceable to the criteria that produced it (§5.2 `criteria_version`).
- **States:** "no change" is a valid outcome and is recorded; a criteria change never rescores history silently — old assessments keep their `criteria_version`, and rescoring open items is an explicit choice.
- **Data:** config versions · **Depends on:** F9 · **Proof:** assessments always carry criteria/prompt versions; before/after precision visible across a version change.
- **Phase:** 4

### Cross-cutting machine flow

#### F12 — Health monitoring & error alerting
- **Actor:** System · **Goal:** silent failure is impossible: broken sources, ATS layout drift, API errors, and quarantines surface to the Candidate within a day.
- **Trigger:** every scheduled run; threshold breaches · **Surface:** alert line in queue/digest + log file.
- **Behavior:** per-source failure counters with auto-disable at threshold; prefill failures with screenshots; LLM quarantine counts; nightly-run summary line ("3 sources OK, 1 failing since Tue").
- **States:** auto-disabled sources require an explicit human re-enable (F0.2) after fix; alerts deduplicate (one line per ongoing condition, not one per run) to prevent alert fatigue.
- **Data:** `sources` health fields, run logs · **Depends on:** F1/F2/F4/F6 existing · **Proof:** seeded-failure test (dead endpoint → alert within one cycle, run continues).
- **Phase:** 1 (minimal run-summary), hardened in Phase 4.

---

## 7. Architecture & Module Map

| Module | Serves flows | Key tech | Notes |
|---|---|---|---|
| `src/discovery/` | F1 | httpx/requests, feedparser, per-source adapters | One adapter per source type; adapters are isolated so one failure never kills a run |
| `src/scoring/` | F2 | Claude API, JSON Schema validation | Prompts versioned in `prompts/`; model + prompt IDs recorded per assessment |
| `src/tailoring/` | F4, F10 drafting | Claude API, claim validator | `validate_claims.py` enforces I3 before anything reaches a queue |
| `src/prefill/` | F6 | Playwright (visible browser), computer-use fallback | Contains **no submit action** by design (I1); per-ATS flows in `playwright_flows/` |
| `src/tracking/` | F8, F9, F11 inputs | SQLite, digest generator | The audit spine; metrics computed here |
| `src/gates/` | F3, F5, F7, F8, F10 surfaces | queue queries + `transitions.py` guard | The only writer of `applications.state`; CANDIDATE-ONLY transitions reachable solely from review surfaces |
| `src/common/` | all | db, models, llm client, alerts, pacing | Pacing (I6) and denylist (I5) live here so every module inherits them |
| `review/` | F3, F5, F7, F8 | v1: spreadsheet export/import + CLI; later Streamlit (§15 D1) | A well-structured spreadsheet is the approved v1 surface |
| `scripts/` | F0, F1+F2 (nightly), F6 (session), F9 (digest) | cron entry points | Each script is idempotent and resumable |

**Stack** (accepted from brief §7): Python 3.11+, Playwright, Claude API with structured JSON outputs, cron (default — §15 D2) for scheduling, SQLite + versioned local folders for storage, OS keychain / gitignored `.env` for credentials, optional Streamlit later.

---

## 8. Repository Layout (planned)

```
hitl-job-agent/
├── PROJECT_BIBLE.md              ← this document
├── config/
│   ├── search_profile.yaml       ← §16 seed
│   ├── criteria.md               ← priorities, dealbreakers, weights (versioned)
│   ├── sources.yaml              ← registry incl. permanent LinkedIn denylist entry
│   └── settings.yaml             ← model IDs, pacing defaults, schedule, thresholds
├── library/                      ← HUMAN-OWNED source of truth (F0.1)
│   ├── master_resume.md
│   ├── accomplishments.yaml
│   └── voice_guide.md
├── materials/<application-id>/v<N>/   ← immutable generated/edited versions
├── data/
│   ├── app.db                    ← SQLite (postings, assessments, applications…)
│   └── screenshots/              ← pre-fill evidence, named by application id
├── src/  (discovery/ scoring/ tailoring/ prefill/ tracking/ gates/ common/)
├── review/                       ← queue surfaces (spreadsheet/CLI; dashboard later)
├── scripts/  (bootstrap.py, run_nightly.py, prefill_session.py, weekly_digest.py)
├── tests/                        ← §14; failing-first per phase
└── .env.example                 ← names only, never values; .env gitignored
```

---

## 9. Invariants — Security, Privacy & Compliance

Each invariant is testable and has a named enforcement point. **These are requirements, not guidelines.**

| ID | Invariant | Enforcement | Proof |
|---|---|---|---|
| **I1** | **No-submit:** the automation layer contains no code path that activates a submit control | Design of `src/prefill/`; code review on every change | Static test (selector/AST audit) + runtime halt-at-review proof with screenshot |
| **I2** | **Gate ordering:** no record advances past an uncleaned gate | `transitions.py` sole writer; approval fields required; DB CHECKs | Illegal-transition test matrix |
| **I3** | **Library-only claims:** no experience, credential, or metric outside `accomplishments.yaml` appears in any generated material | Claim-citation requirement + `validate_claims.py` before queueing | Planted-fabrication tests; G2 human review as backstop |
| **I4** | **Version traceability:** every submission records exact approved materials versions | `approved_version_ids` required for `PREFILLED`/`SUBMITTED`; versions immutable | Immutability + traceability tests |
| **I5** | **LinkedIn exclusion:** no automated interaction with LinkedIn, ever | Permanent denylist entry checked in source loader and pre-fill dispatcher | Denylist test; config with LinkedIn source refuses to load |
| **I6** | **Human-like pacing:** conservative rate limits + jitter on all fetching and form work; nightly caps | `common/pacing.py` inherited by all adapters | Pacing unit tests; run logs |
| **I7** | **Local-first privacy:** all personal data on the Candidate's machine/personal cloud; API calls carry only task-necessary content; no third-party PII beyond voluntarily received recruiter contacts | Storage design; prompt builders whitelist fields | Payload-audit test on prompt builders |
| **I8** | **Credential hygiene:** secrets only in OS keychain or gitignored `.env`; never in code or repo | `.env.example` names-only; pre-commit secret scan | Scanner run in CI/pre-commit |
| **I9** | **Human-send-only outreach:** outreach module has no transport capability | No mail/send API in module; `sent_by_human` settable only from review surface | Absence-of-transport audit |

---

## 10. Risk Register & Stop Conditions

| Risk | Likelihood | Impact | Mitigation (flow) |
|---|---|---|---|
| ATS layout changes break scripted pre-fill | High over time | Medium | Computer-use fallback + `PREFILL_FAILED` alerting (F6, F12); fixture tests catch drift early |
| LLM errors or off-tone content | Medium | High if unreviewed | I3 claim validator (F4) + mandatory human Gate 2 (F5); voice guide |
| Employers screen out generic AI applications | Rising | High | Voice guide + human editing at G2 + deliberate fewer-better bias (§1); metrics watch response rate, not volume |
| Source rot (APIs close, feeds die) | Medium | Low-Medium | Per-source isolation + auto-disable + alerts (F12); source expansion is routine (F0.2) |
| Dedup misses → duplicate applications | Low | High (reputational) | Dedup key + fuzzy fallback (F1); pre-submit duplicate check against log at F6 queue build |
| Scoring miscalibrated → trust collapse in shortlist | Medium early | Medium | Precision metric + F11 calibration loop; `DECLINED` reasons captured |
| Automation used where ToS prohibits | — | High | I5 (LinkedIn manual-only); F0.2 reviews each new source's terms before enabling `[human decision]` |
| Fabricated claim reaches an employer | Low (by design) | Severe | I3 + G2; treated as a sev-1 defect: root-cause before next tailoring run |

**Stop conditions** (require the Candidate; the agent halts rather than proceeding): creating accounts; accepting any platform's terms; entering payment or spending money (including API budgets); sending any communication; clicking submit; deleting real data; enabling any source whose ToS status is unreviewed; any action on an account the Candidate does not own.

---

## 11. Metrics & Instrumentation

Success is **outcome quality, not activity volume**. Raw application count is explicitly rejected as a success measure. All metrics are computable from the `applications` log alone (proven by the F9 digest test).

| Metric | Definition | Fields |
|---|---|---|
| **Response rate** | apps reaching `ACKNOWLEDGED`+ (excl. auto-ack) ÷ `SUBMITTED` | `state_history` |
| **Interview conversion** | apps reaching `INTERVIEWING`+ ÷ `SUBMITTED` | `state_history` |
| **Candidate time per application** | review-session minutes attributed across G1/G2/G3 touches ÷ submissions (v1: session timer in review surface) | session log |
| **Shortlist precision** | `APPLY_NOW` items the Candidate shortlists ÷ `APPLY_NOW` items reviewed | `tier_at_g1`, g1 decision |
| **Supporting** | response rate by tier and by source; time-to-first-response; stale rate; pre-fill success rate (scripted vs fallback vs manual) | `assessments`, `sources`, `prefill_method` |

---

## 12. Operating Rhythm (steady state)

| When | Flows | Candidate time |
|---|---|---|
| **Nightly (unattended)** | F1 discovery → F2 scoring; F12 health summary | 0 |
| **Every 1–2 days** | F3 Gate 1 · F5 Gate 2 · F8 status upkeep | 15–20 min |
| **2–3× per week (batched)** | F6 pre-fill session → F7 review & submit each in one sitting | ~5 min/application |
| **Weekly** | F9 digest → F11 calibration; F10 outreach block | 30–45 min |

The time the system recovers is deliberately redirected to what it cannot do: networking, referrals, relationships, interview preparation (F10 supports; never substitutes).

---

## 13. Roadmap & Build Order

Each phase ends in a usable system; value starts in week one. Build order within a phase is dependency order; every item lands with failing-first tests (§14).

### Phase 1 — Minimum viable pipeline (1–2 weeks part-time)
Flows: **F0 → F0.1** (minimal: resume + criteria) **→ F0.2** (2–3 source types) **→ F1 → F2 → F3 → F8** (manual log) **→ F12** (run summary). Spike (day 1–2): verify Greenhouse/Lever public posting endpoints and one board API/RSS against real target companies — assumption **A3** is unverified until this runs. Tailoring and form completion remain manual. Gate 1 runs from a spreadsheet/CLI queue.
**Acceptance:** nightly run produces a deduplicated, scored, ranked shortlist from ≥2 live sources; a timed Gate 1 session clears the queue in ≤20 min; every decision is in the log; bootstrap is idempotent; one seeded source failure alerts without killing the run.

### Phase 2 — Tailoring engine + review workflow (largest per-application time savings)
Flows: **F0.1 hardened** (full accomplishment library + voice guide) **→ F4 → F5 → F10 drafting**.
**Acceptance:** for a shortlisted role, a complete draft bundle (summary, emphasis reordering, cover letter, screening answers) exists within one nightly cycle; the planted-fabrication test suite passes (I3); Gate 2 approve/rework loop works end-to-end; approved versions are immutable and traceable (I4).

### Phase 3 — Pre-fill automation for the top ATS platforms
Flows: **F6 → F7**, scripted for the 2–3 platforms most frequent in the real Phase 1–2 pipeline (§15 D5), computer-use fallback for the rest.
**Acceptance:** a batched session pre-fills N approved applications, each halting at the final review screen with a screenshot; the no-submit static test and runtime halt proof pass (I1); zero automated submissions by construction; the Candidate submits each personally (F7) in one sitting.

### Phase 4 — Operate, calibrate, expand
Flows: **F9 full** (reminders, deadlines, digest) **→ F11 calibration → F12 hardened → F0.2 source expansion → optional dashboard**. **Dashboard rule:** the Streamlit review surface is a major UI change — it requires a `flow-prototype` approval pass with the Candidate before production build; the spreadsheet remains the fallback surface.
**Acceptance:** weekly digest computes §11 metrics correctly against the live log; a criteria/prompt version change shows before/after precision; follow-up reminders fire on cadence.

---

## 14. Verification Plan & Proof Gates

Claims are reported in four separate buckets — **automated proof** (tests), **static proof** (audits/linters), **runtime proof** (transcripts, screenshots), and **unverified claims** — and a passing gate never substitutes for the Candidate's own review.

**Standing gates (every phase):**
- **Foundation execution:** `bootstrap.py` runs twice idempotently; migrations replay deterministically on a fresh DB.
- **Transition integrity:** the illegal-transition matrix passes; CANDIDATE-ONLY transitions are unreachable from system code.
- **Invariant suite:** I1–I9 each have at least one automated or static check wired into the test run; I1 additionally requires human code review on every `src/prefill/` change.
- **Runtime evidence:** each phase's acceptance criteria are demonstrated with a fresh transcript (nightly-run log, Gate session timing, halt-at-review screenshot) — not asserted from memory.
- **Build-state truth:** progress reporting is reconstructed from the repo and log (tests passing, transcripts present), never hand-narrated.

**Failing-first test seeds per phase:**
- **P1:** source-fixture normalization; dedup determinism (same crawl twice → 0 new rows); malformed-LLM-output rejection; dealbreaker forces `SKIP`; seeded dead source alerts.
- **P2:** planted uncited metric → draft rejected; fact-absent-from-library never appears across fixture postings; approved-version write refused; rework loop round-trips notes.
- **P3:** no-submit selector/AST audit; recorded ATS fixtures end at review screen; fallback triggers on layout change; duplicate-application pre-check blocks a known-submitted posting.
- **P4:** digest metrics against a seeded log with known answers; reminder cadence; criteria-version traceability across a change.

---

## 15. Open Decisions & Assumptions

| ID | Item | Default / status |
|---|---|---|
| **D1** | Review surface upgrade (Streamlit) | Spreadsheet/CLI through Phase 3; decide after Phase 3 retro; requires flow-prototype approval first |
| **D2** | Scheduler | cron (default); APScheduler only if a long-lived process emerges; n8n only if already operated |
| **D3** | Which board APIs are usable | Phase 1 spike decides; many boards restrict access — plan assumes nothing beyond ATS endpoints + RSS until proven |
| **D4** | Comp floor, metro, remote footprint, dealbreaker specifics | `[blocking for F2 quality, not for F0/F1]` Candidate fills §16 placeholders at F0 |
| **D5** | Which 2–3 ATS get scripted pre-fill | Decided from real Phase 1–2 pipeline frequency (expected: Greenhouse, Lever, +1) |
| **D6** | Claude model pin + API budget cap | Set in `settings.yaml` at F0; budget is a stop-condition item (Candidate approves spend) |
| **A1** | Brief §7 stack accepted as-is | Accepted |
| **A2** | Personal cloud backup optional; if used, encrypted | Candidate choice |
| **A3** | Greenhouse/Lever expose readable posting endpoints | **Instrument built & proven; live verification BLOCKED in the current environment** — see §17. Egress to `boards-api.greenhouse.io` and `api.lever.co` is denied by this environment's network policy (403). The spike (`scripts/spike_discovery.py`) is ready to run where egress is permitted. |

---

## 16. Seed Configuration — Regulated Life-Sciences Leadership

`config/search_profile.yaml` (seed — Candidate finalizes `TODO` fields at F0):

```yaml
target_titles:
  - Director / Senior Director / VP — Regulatory Affairs CMC
  - Head of Regulatory CMC | Regulatory CMC Lead
  - Director / Senior Director / VP — Quality (QA, Quality Systems)
  - Head of Quality | Quality & Compliance leadership
  - CMC Program / Technical Operations leadership
keywords:
  include: [CMC, regulatory affairs, cell therapy, gene therapy, CGT, ATMP,
            biologics, IND, BLA, MAA, GMP, quality systems, CAPA, tech transfer,
            comparability, analytical development, sterile / aseptic]
  exclude: [clinical operations only, medical device only, TODO]
seniority: [Director, Senior Director, Executive Director, VP]
geography:
  metro: TODO            # Candidate's metro area
  remote: US-remote acceptable
  relocation: TODO
compensation_floor: TODO  # annual base, USD
work_arrangement: [remote, hybrid]
```

`config/criteria.md` skeleton: **Priorities** (e.g., CGT/ATMP modality; stage where CMC leadership is decisive — IND-to-BLA; scope: team + agency-facing; comp at/above floor) · **Dealbreakers** (below-Director level; relocation if excluded; non-regulated industry; TODO) · **Preferences with weights** (modality fit, stage fit, remote quality, mission) — each versioned so F2 assessments stay traceable.

**Discovery seeds (F0.2):** target-company list across cell & gene therapy, biologics platforms, CDMOs, and late-stage biotech in scope; their Greenhouse/Lever endpoints; one life-sciences board feed (spike-verified). **LinkedIn: manual-only forever (I5)** — the agent still drafts materials and outreach the Candidate uses there by hand.

`library/accomplishments.yaml` — entry format (values are the Candidate's own, entered at F0.1; the agent never invents them):

```yaml
- id: acc-001
  statement: ""        # what was accomplished, in Candidate's words
  metric: ""           # the quantified result, exactly as defensible
  context: ""          # company/program/modality/stage
  evidence_note: ""    # where this is documented (review, filing, appraisal)
  verified_at: null    # date the Candidate personally verified this entry
```

---

## 17. Phase 1 Discovery Spike — Findings (A3)

Status: **A3 remains UNVERIFIED — blocked by environment network policy, not by design.**

The spike is built as a proper instrument, not a one-off curl: `scripts/spike_discovery.py`
(+ `src/jobagent/discovery/spike.py`) probes each candidate endpoint **once, read-only,
under pacing (I6)**, runs the payload through the real adapters + normalizer, and reports
reachability/parseability. It never writes to `app.db` and never enables a source.

**What ran:**
- **Instrument self-test (offline, no network):** `--fixtures tests/fixtures/spike` →
  3/5 candidates parsed across greenhouse + lever + rss, 6 postings normalized,
  `A3 verified: True`, exit 0. Proves the tool correctly distinguishes readable from
  unreadable endpoints. Covered by `tests/test_spike.py` (6 tests).
- **Live probe (this environment):** all endpoints returned
  `URLError: Tunnel connection failed: 403 Forbidden`. The agent egress proxy denies
  `boards-api.greenhouse.io` and `api.lever.co` by organization network policy
  (confirmed via the proxy status log). Per proxy rules, policy denials are not retried
  or routed around. `A3 verified: False`, exit 1.

**Conclusion:** the readable-endpoint assumption cannot be confirmed *from this container*
because outbound access to the job-board hosts is blocked. To land A3, run the spike in an
environment whose network policy permits egress to those hosts (see the remote-environment
network-policy docs), or widen this environment's policy:
```bash
python3 scripts/spike_discovery.py            # confirm/correct tokens in config/spike_candidates.yaml first
```
Candidate tokens in `config/spike_candidates.yaml` are seeds (D3) — confirm them before the run.

**Still Candidate-gated after A3 lands:** *enabling* any verified source for automated
nightly runs is a ToS decision (stop condition §10). The spike verifies; it does not enable.

---

**Build status:** Phase 1 ✓ (F0–F3, F8, F12) and Phase 2 ✓ (F0.1 hardened, F4, F5, F10
drafting) are built and tested (63 tests). The discovery spike instrument ✓ is proven;
live A3 verification is pending an egress-permitted environment. Phase 3 (F6/F7 pre-fill —
no submit path, I1) and Phase 4 (F9/F11 + hardening) remain.

*End of foundation pack v0.1. Update this Bible when A3 lands and as phases complete.*
