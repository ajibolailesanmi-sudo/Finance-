"""I1 — no-submit guarantee: static/AST audit + guard + interface shape."""
import ast
import re
from pathlib import Path

import pytest

from jobagent.prefill import driver as drv
from jobagent.prefill.driver import FakeDriver, SubmitControlError, FormDriver, guard_no_submit

PREFILL_DIR = Path(drv.__file__).parent
FORMS = Path(__file__).parent / "fixtures" / "forms"


# ---- static source audit ---------------------------------------------------
# Action patterns that would activate a submit control. The guard's *pattern
# definitions* (mere mentions of the word "submit") are not actions and are fine.
_BANNED_ACTIONS = [
    r"\.submit\s*\(",                       # form.submit() / element.submit()
    r"press\(\s*['\"]Enter['\"]",           # Enter-to-submit
    r"keyboard\.press\(\s*['\"]Enter",
    r"click\([^)]*\bsubmit\b[^)]*\)",       # clicking a submit-named control
    r"requests?\.(post|put)\(",             # posting the form ourselves
    r"urlopen\(",
]


def _py_files():
    return list(PREFILL_DIR.rglob("*.py"))


def test_no_submit_action_in_prefill_sources():
    offenders = []
    for f in _py_files():
        for i, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            for pat in _BANNED_ACTIONS:
                if re.search(pat, line):
                    offenders.append(f"{f.name}:{i}: {line.strip()}")
    assert offenders == [], "submit-activating action found in src/prefill (I1):\n" + "\n".join(offenders)


def test_formdriver_interface_has_no_submit_method():
    banned = {"submit", "apply", "finish", "send", "complete_application"}
    methods = {m for m in dir(FormDriver) if not m.startswith("_")}
    assert not (methods & banned), f"FormDriver exposes a submit-like method (I1): {methods & banned}"


def test_ast_no_submit_named_calls():
    """No call to a method literally named submit/apply/finish anywhere in prefill."""
    banned = {"submit", "apply_now", "finish_and_submit"}
    for f in _py_files():
        tree = ast.parse(f.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                assert node.func.attr not in banned, f"{f.name}: calls .{node.func.attr}() (I1)"


# ---- runtime guard ---------------------------------------------------------
def test_guard_refuses_submit_labels():
    for bad in ("Submit Application", "submit_app", "Send application", "Apply now"):
        with pytest.raises(SubmitControlError):
            guard_no_submit(bad, bad)


def test_guard_allows_navigation_labels():
    for ok in ("Continue", "Next", "Review", "Save", "Add another"):
        guard_no_submit(ok, ok)   # must not raise


def test_driver_click_refuses_submit_button():
    d = FakeDriver(str(FORMS / "greenhouse_form.html"))
    with pytest.raises(SubmitControlError):
        d.click("#submit_app", label="Submit Application")
    # The submit button exists on the form but the driver won't press it.
    assert d.has_submit_button() and d.clicked == []
