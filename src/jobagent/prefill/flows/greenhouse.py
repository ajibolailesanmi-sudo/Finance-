"""Greenhouse application form flow (fields: first_name/last_name/email/phone,
resume + cover_letter file inputs, an additional-information textarea).

Fills the known fields and halts. Contains no submit action (I1)."""
from __future__ import annotations

from .base import register


@register
class GreenhouseFlow:
    platform = "greenhouse"

    def fill_form(self, driver, profile, documents, answers) -> None:
        # Required fields (raise if the layout changed).
        driver.fill("first_name", profile.first_name)
        driver.fill("last_name", profile.last_name)
        driver.fill("email", profile.email)
        if documents.get("resume"):
            driver.upload("resume", documents["resume"])
        # Optional fields (skip gracefully if absent).
        if profile.phone:
            driver.fill_optional("phone", profile.phone)
        if documents.get("cover_letter"):
            driver.upload_optional("cover_letter", documents["cover_letter"])
        if answers:
            driver.fill_optional("additional_information", answers)
        # Stop here: the filled form IS the review screen. No submit.
