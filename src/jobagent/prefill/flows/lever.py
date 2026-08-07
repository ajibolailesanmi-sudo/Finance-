"""Lever application form flow (fields: name/email/phone/org, resume file input,
comments textarea).

Fills the known fields and halts. Contains no submit action (I1)."""
from __future__ import annotations

from .base import register


@register
class LeverFlow:
    platform = "lever"

    def fill_form(self, driver, profile, documents, answers) -> None:
        # Required fields.
        driver.fill("name", profile.full_name)
        driver.fill("email", profile.email)
        if documents.get("resume"):
            driver.upload("resume", documents["resume"])
        # Optional fields.
        if profile.phone:
            driver.fill_optional("phone", profile.phone)
        if profile.current_org:
            driver.fill_optional("org", profile.current_org)
        if answers:
            driver.fill_optional("comments", answers)
        # Stop here. No submit.
