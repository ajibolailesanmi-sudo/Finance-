"""§11 metrics against a seeded log with hand-computed known answers."""
from conftest import seed_scenario

from jobagent.tracking import metrics as M


def test_headline_metrics(conn):
    seed_scenario(conn)
    # submissions = apps 1,2,3 = 3
    assert M.submissions(conn) == 3
    # responded (ACK+) = apps 1,2 = 2 -> 2/3
    assert M.response_rate(conn) == round(2 / 3, 4)
    # interviewed = app 1 -> 1/3
    assert M.interview_conversion(conn) == round(1 / 3, 4)


def test_shortlist_precision(conn):
    seed_scenario(conn)
    # APPLY_NOW decided at G1 = apps 1,2,3,4,8 = 5; shortlisted = 1,2,3,8 = 4 -> 0.8
    p = M.shortlist_precision(conn)
    assert p == {"apply_now_reviewed": 5, "apply_now_shortlisted": 4, "precision": 0.8}


def test_prefill_success_rate(conn):
    seed_scenario(conn)
    r = M.prefill_success_rate(conn)
    # attempted = PREFILLED(1,2,3) + PREFILL_FAILED(8) = 4; prefilled = 3 -> 0.75
    assert r["attempted"] == 4 and r["prefilled"] == 3 and r["rate"] == 0.75
    assert r["by_method"] == {"scripted": 3, "computer_use": 1}


def test_response_rate_by_tier(conn):
    seed_scenario(conn)
    t = M.response_rate_by_tier(conn)
    assert t["APPLY_NOW"] == round(2 / 3, 4)   # 2 responded / 3 submitted
    assert t["CONSIDER"] is None               # none submitted
    assert t["SKIP"] is None


def test_stale_rate_zero_when_none(conn):
    seed_scenario(conn)
    assert M.stale_rate(conn) == 0.0


def test_empty_log_is_safe(conn):
    assert M.response_rate(conn) is None       # no divide-by-zero
    assert M.submissions(conn) == 0
