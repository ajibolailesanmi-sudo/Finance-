"""F11 — calibration signal + criteria-version traceability (before/after)."""
from conftest import seed_scenario, seed_app

from jobagent.tracking import calibration as C
from jobagent.tracking import metrics as M


def test_precision_misses_and_upgrades(conn):
    seed_scenario(conn)
    misses = C.precision_misses(conn)   # APPLY_NOW -> DECLINED = app 4
    assert len(misses) == 1 and misses[0]["title"] == "Role4"
    ups = C.upgrades(conn)              # CONSIDER -> SHORTLISTED = app 5
    assert len(ups) == 1 and ups[0]["title"] == "Role5"


def test_criteria_version_before_after_precision(conn):
    """A criteria change never rescores history; each version keeps its precision."""
    # criteria-v1: 1 APPLY_NOW shortlisted, 1 APPLY_NOW declined -> precision 0.5
    seed_app(conn, 10, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED"], criteria_version="criteria-v1")
    seed_app(conn, 11, "APPLY_NOW", ["DISCOVERED", "SCORED", "DECLINED"], criteria_version="criteria-v1")
    # criteria-v2 (after a calibration change): 2 shortlisted, 0 declined -> precision 1.0
    seed_app(conn, 12, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED"], criteria_version="criteria-v2")
    seed_app(conn, 13, "APPLY_NOW", ["DISCOVERED", "SCORED", "SHORTLISTED"], criteria_version="criteria-v2")

    by_ver = M.precision_by_criteria_version(conn)
    assert by_ver["criteria-v1"]["precision"] == 0.5
    assert by_ver["criteria-v2"]["precision"] == 1.0   # improvement visible across the change


def test_build_calibration_shape(conn):
    seed_scenario(conn)
    cal = C.build_calibration(conn)
    assert cal["precision_miss_count"] == 1 and cal["upgrade_count"] == 1
    assert cal["criteria_versions_in_log"] == ["criteria-v1"]
    assert "APPLY_NOW" in cal["response_rate_by_tier"]
