# QA Report — Anjali Rao (EB-2 NIW) — FICTIONAL SAMPLE

**Reviewer:** QA Editor (final gate before attorney review)
**Date:** 2026-07-20
**Scope reviewed:** `00-source-cv.md`, `01-intake.md`, `02-strategy.md`,
`03-evidence-map.md`, `04-petition-letter.md`, `05-rec-letter-chen.md`,
`05-rec-letter-vasquez.md`, `06-rfe-risk-report.md`, and
`reference/evidence-standards.md` / `reference/eb2-niw-framework.md`.

> This report is drafting/analysis support, **not legal advice**. It does not
> replace the RFE-risk review (`06-rfe-risk-report.md`) and does not itself
> authorize filing.

Two mechanical edits were made directly to `04-petition-letter.md` during this
pass (both logged in §5 below); no substantive gap was papered over.

---

## 1. Citation integrity — every `(Exhibit N)` reference checked against `03-evidence-map.md`

**Result: PASS — no dangling or mismatched references found.**

I extracted every `Exhibit N` / `Exhibits N, N…` token from `04-petition-letter.md`
(lines 69–353) and checked each against the 26-row index in `03-evidence-map.md`
§1. Every number cited — 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21,
22, 24, 25 — resolves to a real, matching row in the index (same description, same
Dhanasar prong assignment, same status). No exhibit number is cited in the letter
that is absent from the index, and no citation contradicts the index's description
(e.g., "Exhibit 6" is consistently the Boston Water & Sewer adoption letter in both
documents; "Exhibit 24" is consistently the NOAA/NWS/FEMA-type source in both).

Exhibits 17–20, 23, and 26 exist in the index but are **not** cited in the NIW
letter — that is correct, not an omission: the evidence map itself flags 17 (employer
blog) as non-independent, 18–20/23 (awards, membership, salary) as EB-1A-only/
low-value for NIW, and 26 (H-1B notice) as background-only. No fix needed.

---

## 2. Anti-fabrication sweep

**Result: PASS on the petition letter itself, with one finding on the recommendation
letters that should go back to the writer/recommenders.**

- **`[GAP]` / `[CONFIRM]` markers are fully surfaced, not dropped.** Every material
  factual claim in `04-petition-letter.md` that lacks a corroborating exhibit is
  hedged with "reports," "claimed," or "asserted, not documented," and followed by
  an explicit `[GAP — needs: ...]` block naming the missing exhibit. `[CONFIRM: ...]`
  markers (filing date, address, MIT Tech Review's actual subject, Chennai entity
  name/language, signature block) are present and specific, not generic. The
  Conclusion (§VI) restates — correctly — that **none of the three Dhanasar prongs
  is yet met on the documentary record.** This matches the evidence map's and the
  RFE-risk report's own bottom line. Nothing has been silently resolved in the
  letter's favor.
- **No invented facts, quotes, credentials, or citations found in the petition
  letter.** The *Dhanasar* pin cites (26 I&N Dec. at 889–891) and the *Matter of
  Chawathe*, 25 I&N Dec. 369, 375–76 (AAO 2010) preponderance cite are accurate,
  standard authorities for the propositions stated, and track the language in
  `reference/eb2-niw-framework.md` — these are legal authorities an attorney is
  expected to independently verify, not client-record facts, so they are outside
  the evidence-standards prohibition on fabricating *factual* corroboration.
- **Numbers never appear "bare."** Citation counts (1,240 / h-17 / 310), the GitHub
  star count (2,300), the NSF figure ($400k), and the "costliest disaster"
  statistic are each explicitly flagged in the letter as unsourced/uncorroborated
  and tied to a specific missing exhibit (Exs. 4, 9, 15, 24) — consistent with the
  evidence map's un-sourced-statistics list (`03` §5).
- **Finding — recommendation letters contain unbracketed narrative specifics that
  are not traceable to the intake/CV record** (`05-rec-letter-chen.md`, lines
  63–79). The draft has Prof. Chen assert, without a `[NEEDS RECOMMENDER INPUT]`
  bracket: that he "supervised her weekly," "read every draft of her early
  papers," that she "pushed the lab toward the problem... at a time when it was
  not a fashionable topic," and the two-point character narrative about her
  caring whether predictions would be "used" and doing "unglamorous engineering."
  None of this granular detail appears in `00-source-cv.md` or `01-intake.md` —
  it is plausible color for a PhD-advisor letter, but it is invented narrative
  presented as fact rather than flagged for the recommender's confirmation. The
  letter's blanket disclaimer ("must read it in full, correct anything
  inaccurate... nothing has been fabricated") is not a substitute for bracketing
  claims specific enough that they could simply be wrong (frequency of meetings,
  committee membership, the "unfashionable topic" framing). **Recommendation:**
  either bracket these specific claims as `[NEEDS RECOMMENDER INPUT: confirm...]`
  or strip them to generic, safely-true statements ("I supervised her doctoral
  research and am familiar with her early work") before this draft goes to Prof.
  Chen for signature. This is a writer-level fix, not one I have made directly,
  since I cannot know which parts (if any) Prof. Chen would actually confirm.
- The Vasquez letter, by contrast, correctly brackets its one comparably specific
  claim (which paper she cited and where) as `[NEEDS RECOMMENDER INPUT: ...]` —
  this is the right pattern and should be the model for fixing the Chen letter.
- Both recommendation letters carry the required "prepared with AI drafting
  assistance... requires genuine review" disclosures and correctly label
  independence status (Chen = dependent, Vasquez = independent) consistent with
  the strategy memo and evidence map.

---

## 3. Cross-document consistency

**Result: one real inconsistency found and corrected at the mechanical level (see
§5); everything else checked out.**

- **Chronology inconsistency (flagged, now surfaced in the letter).** `00-source-cv.md`
  line 16 and `01-intake.md` line 45 both state "Years in field: 8 (since Ph.D.
  start)," while the same CV lists B.Tech, IIT Bombay, **2015** and Ph.D., Michigan,
  **2020**. Taken together these do not reconcile: "8 years since Ph.D. start"
  measured from today (2026-07-20) places the Ph.D.'s start around 2018 — which
  would (a) leave an unexplained ~3-year gap between the 2015 B.Tech and a 2018
  Ph.D. start, and (b) compress the Ph.D. itself into roughly two years before its
  stated 2020 completion, atypically short for a research doctorate. This is the
  same issue the RFE-risk report already caught (`06-rfe-risk-report.md`, finding
  #8, "Minor," recommending the dates be pinned and experience stated as a date
  range) — but **the petition letter as originally drafted repeated the CV's "eight
  years since beginning her Ph.D." language as if it were unproblematic** (old §I),
  which would have let an unreconciled discrepancy ride into a filed document. I
  edited the letter (see §5) to drop the specific "eight years" figure and insert a
  `[CONFIRM]` marker directing the client to supply exact, consistent dates. This is
  a **substantive gap, not a cosmetic one** — the underlying dates themselves must
  come from the client/attorney, not from me — but flagging it clearly, rather than
  letting it pass silently, was within QA's mandate.
- **Names, titles, employer:** "Anjali Rao, Ph.D." / "Dr. Anjali Rao," "Senior
  Research Scientist, HydroAI Labs" are consistent across the CV, intake, strategy
  memo, evidence map, petition letter, and both recommendation letters.
- **Education:** Ph.D., Computer Science, University of Michigan, 2020, and
  B.Tech, Computer Science, IIT Bombay, 2015, are stated identically everywhere,
  including Prof. Chen's own letter ("she completed at Michigan in 2020"), which is
  an independent cross-check consistent with the CV.
- **Other figures** (19 publications; 1,240 citations / h-17 / 310-citation top
  paper; 2,300 GitHub stars; the $400k NSF figure) are stated identically in
  every document in which they appear — the discrepancy is confined to the
  chronology point above.
- **Recommenders and independence labeling:** Chen (Michigan, PhD advisor,
  dependent) and Vasquez (Stanford, independent) are labeled consistently across
  `01`, `02`, `03`, `04`, and their own letter headers.
- **Unnamed entities stay unnamed everywhere:** the NGO and the Chennai pilot
  entity are correctly left unnamed/unspecified in the CV, intake, strategy,
  evidence map, and petition letter alike — no document invents a name to fill the
  gap.
- **Salary, awards, and membership** (client-reported $195k salary; ICML workshop
  Best Paper 2021; Rackham Predoctoral Fellowship 2019; regular IEEE/ACM
  membership) are correctly **omitted** from the NIW petition letter, consistent
  with the strategy memo's and evidence map's guidance that these items are
  EB-1A-only or too weak to help NIW — this is a consistent, intentional omission,
  not a discrepancy.

---

## 4. Standard alignment

**Result: PASS.**

- The letter correctly states the **preponderance of the evidence** ("more likely
  than not") standard up front and correctly cites *Matter of Chawathe* for it,
  expressly disclaiming a "beyond a reasonable doubt" standard — matching
  `evidence-standards.md` §"Burden of proof" verbatim in substance.
- The letter is organized around, and correctly states, all **three Dhanasar
  prongs** (substantial merit & national importance; well positioned; balance of
  waiving the job offer), with quoted language ("has both substantial merit and
  national importance," "well positioned to advance the proposed endeavor," "on
  balance, it would be beneficial to the United States to waive the requirements
  of a job offer") that matches `reference/eb2-niw-framework.md` and the real
  *Dhanasar* holding. It does not conflate NIW with the EB-1A Kazarian framework or
  import a "final merits"/"top of the field" test that does not belong in a
  Dhanasar analysis (a documented common failure mode per the framework).
- Base EB-2 eligibility (advanced degree) is correctly addressed as a threshold
  question **before** the waiver analysis (§II), per the framework's "Step 0."
- Prong 1 in particular is careful to argue **national importance from the
  endeavor's broader implications**, not from where Dr. Rao happens to work —
  the correct framing per *Dhanasar* at 889 and the framework's "common failure
  modes" list — though see the RFE-risk report's separate, still-open concern
  (finding #4) that the Chennai reference partially undercuts this by leaning on a
  *foreign* jurisdiction to help prove *U.S.* national importance. That is a
  legal-strategy point already correctly flagged in `06-rfe-risk-report.md`; I did
  not re-litigate it here since it is a strategic framing choice for the writer/
  attorney, not a QA-level fabrication or inconsistency issue.
- Prong 3 is treated as a genuine balancing argument, not a formality, consistent
  with the framework's explicit warning against exactly that failure mode.

---

## 5. Prose & formatting — mechanical edits made directly to `04-petition-letter.md`

Per my mandate to fix mechanical issues but send substantive gaps back rather than
paper over them, I made three edits, described here for the record:

1. **§I (the endeavor / background).** Removed the unqualified "approximately
   eight years since beginning her Ph.D." claim (which silently repeated the
   CV's internally-inconsistent chronology, see §3 above) and replaced it with a
   `[CONFIRM: ...]` marker spelling out the discrepancy and instructing that no
   specific "years in the field" figure be stated anywhere in the package until
   the client supplies reconciled dates. **This is a flag, not a resolution** —
   the actual dates must still come from the client/attorney.
2. **§IV (Prong 2 introduction).** Tightened an informal, conclusory turn of
   phrase — "This is the prong where the case lives" — to "This prong is the
   center of gravity for the petition," for a more consistent, formal register
   matching the rest of the letter. No substantive change.
3. **§VI (Conclusion).** The conclusion previously opened with "For the
   foregoing reasons..." and then, a few paragraphs later, repeated the same
   phrase inside a block-quoted "final request" paragraph that also embedded an
   internal caveat — "(This request is contingent on closing the documented gaps
   above; it is not supportable on the present record.)" — inside what read like
   filing-ready closing language. That mixed a template sentence meant only for
   the eventual filed version with an internal QA caveat in a way that risked the
   caveat being cut along with the rest of the blockquote by someone skimming for
   "the filing text." I restructured this into (a) a plain-prose paragraph stating
   the current gap status, and (b) a clearly labeled "Model closing paragraph for
   the filed version" plus a separately labeled "QA note (not filing language)"
   so the two purposes cannot be confused. No substantive wording of either the
   eventual filing paragraph or the caveat was changed — only their structure and
   labeling.

No other prose issues rose to the level of a needed edit; the letter's
extensive, repeated "reports"/"asserted, not documented" hedging is intentional
and appropriate given the state of the file, and I have left that voice intact.

---

## 6. Translation & sourcing

**Result: PASS.**

- **Ex. 7 (Chennai pilot documentation)** is flagged for certified translation in
  three places — `03-evidence-map.md` (row 7 and §5), the petition letter (§IV(b)),
  and the RFE-risk report (#12) — each correctly citing 8 CFR § 103.2(b)(3) and
  correctly noting the language is not yet confirmed. Consistent across the
  package.
- No other exhibit in the index is currently known to be non-English; the
  evidence map appropriately notes this should be re-confirmed once each document
  is actually obtained.
- Every statistic used in the letter (citation counts, GitHub stars, the NSF
  dollar figure, the "costliest disaster" claim) is tied to a named missing
  exhibit rather than asserted bare — see §2 above. No un-sourced statistic
  appears as an established fact anywhere in `04-petition-letter.md`.

---

## 7. Summary of findings requiring further action (not fixed by QA — return to writer/attorney)

| # | Finding | Disposition |
|---|---|---|
| 1 | Chronology of B.Tech (2015) / Ph.D. (2020) / "8 years since Ph.D. start" cannot be reconciled on the current record | **[CONFIRM]** now flagged directly in the letter (§5 above); needs client-supplied exact dates, then must be corrected consistently across `00`, `01`, and `04`. |
| 2 | Prof. Chen's draft letter contains specific, unbracketed narrative claims (weekly supervision, reading every draft, committee membership, the "unfashionable topic" story) not traceable to the intake record | Send back to recommendation-letter-writer to bracket as `[NEEDS RECOMMENDER INPUT: ...]` or generalize, following the Vasquez letter's model, before it goes to Prof. Chen for genuine review/signature. |
| 3 | All three Dhanasar prongs remain evidentially unmet; the ★ decisive exhibits (adoption letters Exs. 6–8, independent letters Exs. 10/12, citation report Ex. 4, national-importance source Ex. 24, PhD diploma Ex. 2) do not yet exist | Already correctly and repeatedly flagged by the writer and by `06-rfe-risk-report.md`; this QA pass confirms the flagging is accurate and undiminished, not a new finding. |
| 4 | Structural risks identified in `06-rfe-risk-report.md` (single-adopter concentration on Boston; Chennai used to support *U.S.* national importance; thin independent-expert pillar) remain open | These are legal-strategy judgments for the attorney, not QA-level fabrication/consistency defects; I did not attempt to resolve them here. |

---

## 8. Ship / do-not-ship recommendation

**DO NOT SHIP for filing.**

The petition letter passes every QA integrity check that is within scope today:
citations resolve, gaps are surfaced rather than hidden, cross-document facts
match (after the one chronology flag above), and the legal standard is argued
correctly. The package is honest about its own incompleteness, and that
discipline should be preserved through the next revision cycle. But by the
drafting team's own — accurate — admission in `03-evidence-map.md`,
`04-petition-letter.md` §VI, and `06-rfe-risk-report.md` §1, **every Dhanasar
prong is currently supported only by client assertion**, no independent
corroborating exhibit has yet been produced, and base EB-2 eligibility itself
(the Ph.D. diploma, Exhibit 2) is not yet in the file. A package in this state
cannot be filed under any circumstance, regardless of how well the drafting is
disciplined about flagging that fact.

**Path to ship:** obtain, at minimum, the exhibits already marked ★ decisive
(Exs. 2, 4, 6, 7, 8, 10, 12, 24), resolve the two findings in §7 above (#1 and
#2), and route the revised package back through this QA pass before it goes to
the attorney for final sign-off.

---

> Prepared with AI drafting assistance. **Requires review and approval by a
> licensed U.S. immigration attorney before filing.** Not legal advice.
