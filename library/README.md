# F0.1 — your source of truth

These files are **yours**. The agent reads them; it never writes them and never
invents their content — that's the whole point of the library-only-claims rule
(I3). Fill them in, then run `python3 scripts/check_library.py` to see what's
still blocking each flow.

| File | What it is | Blocks |
|---|---|---|
| `library/master_resume.md` | Your canonical resume, your words | F2 scoring quality |
| `library/accomplishments.yaml` | The **only** source of quantified claims for generated materials | F4 tailoring (refuses if empty) |
| `library/voice_guide.md` | How you actually write | F4/F10 tone (Phase 2+) |
| `config/criteria.md` | Priorities, dealbreakers, weighted preferences | F2 scoring (D4) |
| `config/search_profile.yaml` | Titles, keywords, geos, comp floor | F1 discovery scope (D4) |
| `config/applicant.yaml` | Name/email/phone for forms (PII, gitignored) | F6 pre-fill |

## accomplishments.yaml — the important one

Every generated résumé line, cover-letter claim, and screening answer can only
use metrics that appear here. An entry is **usable** only when it has a real
`statement`, a real `metric`, and a `verified_at` date you set after personally
confirming it. Entries without `verified_at` are ignored — the agent won't build
claims on unverified facts.

```yaml
accomplishments:
  - id: acc-001
    statement: "Led the CMC regulatory strategy for a gene therapy program from IND to BLA"
    metric: "3 successful IND filings"          # the quantified result, exactly as defensible
    context: "Cell & gene therapy, clinical-stage biotech"
    evidence_note: "regulatory filing records"  # where this is documented
    verified_at: "2026-01-15"                    # the day you confirmed it — omit until then
```

A fuller worked example lives in `tests/fixtures/library_demo/accomplishments.yaml`
(fictional — for shape only, not your data). The linter (`scripts/bootstrap.py`,
`scripts/check_library.py`) will tell you if the file is malformed.

## Quick start

```bash
cp config/applicant.example.yaml config/applicant.yaml   # then fill it (stays local)
$EDITOR library/accomplishments.yaml                     # add verified entries
$EDITOR config/criteria.md config/search_profile.yaml    # resolve the TODO markers
python3 scripts/check_library.py                         # readiness report
```
