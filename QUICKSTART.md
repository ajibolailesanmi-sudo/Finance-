# Phase 1 Quickstart — HITL Job Application Agent

The authoritative design is [`PROJECT_BIBLE.md`](./PROJECT_BIBLE.md). This is the
runbook for the Phase 1 pipeline: **F0 → F0.1 → F0.2 → F1 → F2 → F3 → F8 → F12**.

Phase 1 runs **fully offline** — no live board fetches, no API spend. Both are
Candidate-gated stop conditions (see the Bible §10). Scoring uses an offline
mock scorer until a model is pinned and spend is authorized (D6).

## Setup
```bash
python3 -m pip install -r requirements.txt   # pyyaml, jsonschema, pytest
python3 scripts/bootstrap.py                  # F0 — idempotent; safe to run twice
```

## Discovery spike (A3) — verify real endpoints are readable
```bash
# Offline self-test of the instrument (no network):
python3 scripts/spike_discovery.py --fixtures tests/fixtures/spike
# Live probe (needs an environment whose network policy permits egress to
# boards-api.greenhouse.io / api.lever.co; confirm tokens in config/spike_candidates.yaml):
python3 scripts/spike_discovery.py
```
See PROJECT_BIBLE.md §17 for the current A3 status.

## Run the pipeline
```bash
# F1 discovery -> F2 scoring. --fixtures runs offline against saved payloads.
python3 scripts/run_nightly.py --fixtures <dir>   # <dir>/<source_id>.txt payloads
# (omit --fixtures for a live paced fetch, only after confirming each source's ToS)

# F3 Gate 1 — the human shortlist gate (spreadsheet/CLI surface)
python3 scripts/gate1_review.py list              # ranked SCORED queue
python3 scripts/gate1_review.py export            # -> review/gate1_queue.csv
#   ... fill the `decision` column: SHORTLISTED / DECLINED ...
python3 scripts/gate1_review.py import            # applies decisions (candidate)

# F8 status upkeep (post-submit) + STALE suggestions
python3 scripts/status_update.py show <app_id>
python3 scripts/status_update.py stale
```

## Phase 2 — tailoring + Gate 2 (offline, no egress)
```bash
# F4 tailoring: generate a materials bundle per SHORTLISTED role. Every metric is
# validated against the accomplishment library (I3); violating drafts are flagged,
# not queued. Refuses an empty/unverified library (F0.1).
python3 scripts/tailor_run.py --library library/accomplishments.yaml

# F5 Gate 2 — the human materials gate
python3 scripts/gate2_review.py list
python3 scripts/gate2_review.py show <app_id>
python3 scripts/gate2_review.py approve <app_id>            # locks versions, -> APPROVED
python3 scripts/gate2_review.py rework <app_id> --notes "…" # bounce back to F4
```
Populate `library/accomplishments.yaml` with verified entries first — the shipped
file is a blank template, so F4 refuses it by design (see `tests/fixtures/library_demo/`
for a populated example).

## Tests
```bash
python3 -m pytest -q        # 40 tests: invariants I2/I4/I5/I6/I7, dedup, health, gates
```

## What Phase 1 does NOT do yet
- **Tailoring** (F4/F5) — Phase 2.
- **Pre-fill / submission** (F6/F7) — Phase 3. There is no submit code path (I1).
- **Live scoring** — the real LLM client is inert until spend is approved (D6).
- **Live discovery against real companies** — endpoints in `config/sources.yaml`
  are seeds; assumption **A3** is unverified until the spike runs them for real.

## Layout
`config/` seeds · `library/` Candidate source-of-truth · `src/jobagent/` package
(`common` `discovery` `scoring` `gates` `tracking` `health`) · `scripts/` entry
points · `tests/` failing-first suite · `data/app.db` (gitignored).
