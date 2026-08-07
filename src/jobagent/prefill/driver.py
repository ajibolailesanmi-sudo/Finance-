"""Form drivers + the no-submit guard (I1).

FormDriver is the ONLY interface the ATS flows are written against. It exposes
navigation and field entry — and deliberately no submit method. guard_no_submit
is called by every click so that even a buggy or hostile flow cannot activate a
submit control: the driver raises SubmitControlError instead.

Two implementations:
  * FakeDriver   — offline, backed by a fixture HTML form; used by tests and the
                   runtime halt-at-review proof. Produces a review-screen capture.
  * PlaywrightDriver — real, visible (never headless) browser for attended use.
                       Import-guarded so Playwright is only needed when used.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Protocol, runtime_checkable

# A control is a submit control if its label/selector matches any of these.
# 'Continue', 'Next', 'Review', 'Save', 'Add' are navigation, NOT submit.
# 'submit' is matched as a substring (catches ids like 'submit_app', 'btn-submit').
SUBMIT_PATTERNS = re.compile(
    r"(submit|send\s+application|apply\s+now|finish\s+and\s+submit|"
    r"complete\s+application)",
    re.I,
)


class SubmitControlError(RuntimeError):
    """Raised when any code attempts to activate a submit control (I1)."""


class UnknownFieldError(RuntimeError):
    """A flow targeted a field that does not exist on the form (layout mismatch)."""


def guard_no_submit(target: str, label: str = "") -> None:
    """Refuse to act on a submit control. Called by every driver click (I1)."""
    for probe in (label, target):
        if probe and SUBMIT_PATTERNS.search(probe):
            raise SubmitControlError(
                f"refused to activate a submit control (I1): {probe!r}"
            )


@runtime_checkable
class FormDriver(Protocol):
    # NOTE: there is intentionally NO submit()/apply()/finish() method here.
    def goto(self, url: str) -> None: ...
    def fill(self, selector: str, value: str) -> None: ...
    def fill_optional(self, selector: str, value: str) -> None: ...
    def select(self, selector: str, value: str) -> None: ...
    def upload(self, selector: str, path: str) -> None: ...
    def upload_optional(self, selector: str, path: str) -> None: ...
    def click(self, selector: str, *, label: str = "") -> None: ...
    def screenshot(self, path: str) -> str: ...


# --------------------------------------------------------------------------- #
#  Offline fixture-backed driver                                              #
# --------------------------------------------------------------------------- #
class _FormFieldParser(HTMLParser):
    """Collect field names/ids, file inputs, required fields, and button labels."""

    def __init__(self) -> None:
        super().__init__()
        self.fields: set[str] = set()
        self.file_fields: set[str] = set()
        self.required: set[str] = set()
        self.buttons: list[tuple[str, str]] = []   # (label, type)
        self._btn_type: str | None = None
        self._capture_btn = False
        self._btn_text = ""

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        key = a.get("name") or a.get("id")
        if tag in ("input", "select", "textarea"):
            itype = a.get("type", "text").lower()
            if itype in ("submit", "button") and tag == "input":
                self.buttons.append((a.get("value", ""), itype))
                return
            if key:
                self.fields.add(key)
                if itype == "file":
                    self.file_fields.add(key)
                if "required" in a:
                    self.required.add(key)
        elif tag == "button":
            self._capture_btn = True
            self._btn_type = a.get("type", "submit").lower()
            self._btn_text = ""

    def handle_data(self, data):
        if self._capture_btn:
            self._btn_text += data

    def handle_endtag(self, tag):
        if tag == "button" and self._capture_btn:
            self.buttons.append((self._btn_text.strip(), self._btn_type or "submit"))
            self._capture_btn = False
            self._btn_type = None


@dataclass
class FakeDriver:
    """A deterministic, offline driver backed by a fixture HTML form."""

    html_path: str
    headless: bool = True   # tests run headless; real runs must be visible
    filled: dict[str, str] = field(default_factory=dict)
    uploaded: dict[str, str] = field(default_factory=dict)
    clicked: list[str] = field(default_factory=list)
    _current_url: str = ""

    def __post_init__(self) -> None:
        p = _FormFieldParser()
        p.feed(Path(self.html_path).read_text(encoding="utf-8"))
        self._fields = p.fields
        self._file_fields = p.file_fields
        self._required = p.required
        self._buttons = p.buttons

    # -- navigation / entry -------------------------------------------------
    def goto(self, url: str) -> None:
        self._current_url = url

    def fill(self, selector: str, value: str) -> None:
        if selector not in self._fields:
            raise UnknownFieldError(f"no field {selector!r} on this form")
        self.filled[selector] = value

    def fill_optional(self, selector: str, value: str) -> None:
        """Fill only if the field exists; a missing optional field is not an error."""
        if selector in self._fields:
            self.filled[selector] = value

    def select(self, selector: str, value: str) -> None:
        self.fill(selector, value)

    def upload(self, selector: str, path: str) -> None:
        if selector not in self._file_fields:
            raise UnknownFieldError(f"no file field {selector!r} on this form")
        self.uploaded[selector] = path

    def upload_optional(self, selector: str, path: str) -> None:
        if selector in self._file_fields:
            self.uploaded[selector] = path

    def click(self, selector: str, *, label: str = "") -> None:
        guard_no_submit(selector, label)                       # I1
        labels = {b[0].lower() for b in self._buttons}
        if label and label.lower() not in labels and selector.lower() not in labels:
            raise UnknownFieldError(f"no clickable control {label or selector!r}")
        self.clicked.append(label or selector)

    # -- review / evidence --------------------------------------------------
    def unfilled_required(self) -> set[str]:
        return self._required - set(self.filled) - set(self.uploaded)

    def has_submit_button(self) -> bool:
        return any(SUBMIT_PATTERNS.search(b[0]) for b in self._buttons)

    def screenshot(self, path: str) -> str:
        """Write a review-screen capture (offline stand-in for a PNG)."""
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        lines = [f"REVIEW SCREEN CAPTURE — {self._current_url}", "=" * 48,
                 "filled fields:"]
        for k, v in sorted(self.filled.items()):
            shown = v if len(v) < 60 else v[:57] + "..."
            lines.append(f"  {k}: {shown}")
        for k, v in sorted(self.uploaded.items()):
            lines.append(f"  {k}: [file] {v}")
        lines.append(f"submit control present but NOT activated: {self.has_submit_button()}")
        lines.append(f"unfilled required fields: {sorted(self.unfilled_required()) or 'none'}")
        out.write_text("\n".join(lines), encoding="utf-8")
        return str(out)


# --------------------------------------------------------------------------- #
#  Real browser driver (attended, never headless)                            #
# --------------------------------------------------------------------------- #
class PlaywrightDriver:
    """Visible-browser driver for attended pre-fill sessions.

    Never headless — the Candidate watches the run land on the review screen.
    Playwright is imported lazily so it is only a dependency when actually used.
    """

    def __init__(self, page, *, headless: bool):
        if headless:
            raise ValueError("pre-fill must run in a visible browser, never headless (F6)")
        self.headless = headless
        self._page = page

    @classmethod
    def launch(cls, executable_path: str | None = None):  # pragma: no cover - needs display
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=False, executable_path=executable_path)
        page = browser.new_page()
        drv = cls(page, headless=False)
        drv._pw, drv._browser = pw, browser
        return drv

    @staticmethod
    def _resolve(selector: str) -> str:
        """Bare field key -> a CSS selector matching by name or id."""
        if re.search(r"[#.\[\]\s>]", selector):
            return selector                      # already a CSS selector
        return f'[name="{selector}"], #{selector}'

    def goto(self, url: str) -> None:            # pragma: no cover - needs display
        self._page.goto(url, wait_until="domcontentloaded")

    def fill(self, selector: str, value: str) -> None:   # pragma: no cover
        self._page.fill(self._resolve(selector), value)

    def fill_optional(self, selector: str, value: str) -> None:  # pragma: no cover
        sel = self._resolve(selector)
        if self._page.query_selector(sel):
            self._page.fill(sel, value)

    def select(self, selector: str, value: str) -> None:  # pragma: no cover
        self._page.select_option(self._resolve(selector), value)

    def upload(self, selector: str, path: str) -> None:   # pragma: no cover
        self._page.set_input_files(self._resolve(selector), path)

    def upload_optional(self, selector: str, path: str) -> None:  # pragma: no cover
        sel = self._resolve(selector)
        if self._page.query_selector(sel):
            self._page.set_input_files(sel, path)

    def click(self, selector: str, *, label: str = "") -> None:  # pragma: no cover
        guard_no_submit(selector, label)         # I1 — even the real driver refuses submit
        self._page.click(self._resolve(selector))

    def screenshot(self, path: str) -> str:      # pragma: no cover - needs display
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._page.screenshot(path=path, full_page=True)
        return path
