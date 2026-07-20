# EB-1 / EB-2 Petition Team — Agentic AI System

A team of specialized Claude Code subagents that assist an immigration practice
in drafting and analyzing **EB-1A**, **EB-1B**, and **EB-2 NIW** petition
packages — from intake through a final QA gate. It is a **drafting and analysis
assistant, not a lawyer**: every package requires review and approval by a
licensed U.S. immigration attorney before filing.

## The team

| Agent | Role | Model |
|-------|------|-------|
| `intake-coordinator` | Orchestrator. Gathers the client profile, builds the evidence inventory, routes the case. | sonnet |
| `eligibility-strategist` | Picks the strongest category and builds the strategy with a criterion/prong strength matrix. | opus |
| `evidence-mapper` | Maps evidence to each criterion/prong, builds the exhibit index, finds gaps. | sonnet |
| `petition-letter-writer` | Drafts the main petition/cover letter (the legal argument). | opus |
| `recommendation-letter-writer` | Drafts distinct expert/support letters for recommenders to review and adopt. | opus |
| `rfe-risk-reviewer` | Adversarial red-team: predicts RFE risks and denial grounds. Read-only. | opus |
| `qa-editor` | Final fact-consistency, anti-fabrication, and citation-integrity gate. | sonnet |

## The pipeline

```
intake-coordinator
      ↓
eligibility-strategist   → 02-strategy.md
      ↓
evidence-mapper          → 03-evidence-map.md (+ exhibit index)
      ↓
petition-letter-writer   → 04-petition-letter.md
      ↓                     (in parallel)
recommendation-letter-writer → 05-rec-letter-*.md
      ↓
rfe-risk-reviewer        → RFE-risk report
      ↓
qa-editor                → QA report + ship/do-not-ship
      ↓
★ Licensed attorney review & approval → filing
```

Each case gets its own folder under `petition-system/clients/<client-slug>/`,
with numbered artifacts (`01-intake.md` … `05-*`).

## How to run it

In Claude Code, invoke an agent by describing the task — the `description` field
routes automatically. Examples:

- "Start a new case for this client" → **intake-coordinator**
- "Which category is strongest and why?" → **eligibility-strategist**
- "Map this evidence to the criteria and find the gaps" → **evidence-mapper**
- "Draft the NIW petition letter" → **petition-letter-writer**
- "Draft recommendation letters for these three recommenders" → **recommendation-letter-writer**
- "Red-team this petition for RFE risk" → **rfe-risk-reviewer**
- "Final QA and fact-check the package" → **qa-editor**

You can also run the whole chain: give the intake-coordinator a CV and ask it to
coordinate the pipeline.

## Reference library (`reference/`)

The agents ground themselves in these — edit them to tune the practice's approach:
- `eb1a-framework.md` — 10 criteria + Kazarian two-step.
- `eb1b-framework.md` — threshold requirements + 2-of-6 criteria.
- `eb2-niw-framework.md` — EB-2 base eligibility + Dhanasar three prongs.
- `evidence-standards.md` — burden of proof, corroboration, translations, and the
  hard anti-fabrication / UPL rules.
- `rfe-common-issues.md` — the RFE-reviewer's checklist floor.

## Templates (`templates/`) & intake (`intake/`)
Reusable exhibit index, petition-letter, and recommendation-letter scaffolds,
plus the client intake questionnaire.

## Guardrails baked into every agent
- **No fabrication.** Missing evidence is flagged as a `[GAP]`, never invented.
- **Exhibit-cited.** Every factual claim in a petition ties to a real exhibit.
- **Distinct letters.** Recommendation letters are varied and marked for the
  recommender's genuine review and adoption.
- **Attorney-in-the-loop.** Nothing is filing-ready until a licensed attorney
  reviews and approves. Outputs carry a sign-off line and are not legal advice.
- **Standards shift.** Agents note that USCIS policy and adjudication trends
  change; confirm current Policy Manual guidance at filing time.

> **Disclaimer:** This system supports the work of qualified legal professionals.
> It does not practice law, does not guarantee any immigration outcome, and its
> output is not legal advice to any end client.
