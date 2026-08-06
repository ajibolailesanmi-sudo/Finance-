<!--
criteria.md (F0.1) — priorities, dealbreakers, weighted preferences.
Versioned: every F2 assessment records the criteria_version it was scored under
(§5.2), so a change never silently rescores history (F11).

criteria_version: criteria-v1
-->

# Screening Criteria — v1 (SEED)

> The Candidate owns this file. F2 sends it to the model verbatim as the scoring
> rubric. Fill the `TODO`s (D4) to raise F2 quality; F0/F1 run without them.

## Priorities (what makes a role APPLY_NOW)
- **Modality fit:** CGT / ATMP (cell & gene therapy) or advanced biologics.
- **Stage fit:** programs where CMC leadership is decisive — IND-through-BLA.
- **Scope:** owns a team *and* is agency-facing (FDA/EMA interactions).
- **Compensation:** at or above the floor in `search_profile.yaml`.

## Dealbreakers (any hit forces tier = SKIP)
- Below Director level.
- Requires relocation when relocation is excluded (see search profile).
- Non-regulated industry (no GxP/agency context).
- TODO: Candidate-specific dealbreakers.

## Preferences (weighted; used to rank within a tier)
| Preference | Weight |
|---|---|
| Modality fit (CGT/ATMP > biologics > other regulated) | high |
| Stage fit (IND→BLA decisiveness) | high |
| Remote quality (true remote > hybrid) | medium |
| Mission / therapeutic area resonance | medium |
