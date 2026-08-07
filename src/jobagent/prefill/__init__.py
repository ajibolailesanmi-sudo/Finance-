"""F6 pre-fill (action) + the drivers that run employer forms.

I1 — the automation layer contains NO code path that activates a submit control.
This is enforced two ways, belt-and-suspenders:
  1. The FormDriver interface has no submit/apply-final method to call.
  2. Every driver.click() passes through guard_no_submit(), which raises on any
     target that looks like a submit control.
The flows navigate up to the review screen and stop. The physical submit is a
human action (F7), recorded from the review surface — never from this package.
"""
