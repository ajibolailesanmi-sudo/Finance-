#!/usr/bin/env python3
"""F0.1 readiness check — what's filled, what's left, before you run the pipeline.

Reports the state of the human-owned source of truth (resume, accomplishments,
criteria, search profile, applicant details) so you know exactly which flows are
unblocked. It reads only your files; it never invents content (I3).

    python3 scripts/check_library.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from jobagent.common.library import lint_accomplishments, LibraryError

OK, WARN, TODO = "  ✓", "  !", "  ·"


def _todos(path: Path) -> int:
    if not path.exists():
        return -1
    return path.read_text(encoding="utf-8").count("TODO")


def main() -> int:
    print("F0.1 — source-of-truth readiness\n" + "=" * 40)

    # Accomplishments (gates F4 tailoring)
    acc = ROOT / "library" / "accomplishments.yaml"
    try:
        res = lint_accomplishments(acc)
        usable = res["usable"]
        line = OK if usable else TODO
        print(f"{line} accomplishments.yaml: {res['entries']} entr(y/ies), {usable} usable (verified)")
        if not usable:
            print("       → F4 tailoring REFUSES until >=1 entry has a real statement, metric, and verified_at.")
            print("       → shape/example: library/README.md and tests/fixtures/library_demo/accomplishments.yaml")
    except LibraryError as exc:
        print(f"{WARN} accomplishments.yaml: malformed — {exc}")
        usable = 0

    # Resume (input to F2 scoring)
    resume = ROOT / "library" / "master_resume.md"
    txt = resume.read_text(encoding="utf-8") if resume.exists() else ""
    placeholder = "PLACEHOLDER" in txt or "TODO(F0.1)" in txt
    print(f"{TODO if placeholder else OK} master_resume.md: "
          + ("still the seed placeholder — replace with your real resume" if placeholder else "looks filled in"))

    # Criteria + search profile (D4 — F2 scoring quality)
    for name, path in [("criteria.md", ROOT / "config" / "criteria.md"),
                       ("search_profile.yaml", ROOT / "config" / "search_profile.yaml")]:
        n = _todos(path)
        print(f"{OK if n == 0 else TODO} config/{name}: "
              + ("no TODOs left" if n == 0 else f"{n} TODO(s) to resolve (D4 — improves F2 scoring)"))

    # Applicant profile (F6 pre-fill; PII)
    app = ROOT / "config" / "applicant.yaml"
    if app.exists():
        print(f"{OK} config/applicant.yaml: present")
    else:
        print(f"{TODO} config/applicant.yaml: missing — "
              "`cp config/applicant.example.yaml config/applicant.yaml` and fill (gitignored PII)")

    print("\nWhat's unblocked:")
    print(f"  discovery + scoring (F1/F2): ready (scoring uses the offline mock until D6)")
    print(f"  tailoring (F4): {'READY' if usable else 'blocked — add a verified accomplishment'}")
    print(f"  pre-fill (F6): {'ready' if app.exists() else 'blocked — add config/applicant.yaml'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
