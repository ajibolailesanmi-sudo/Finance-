"""F3 — Gate 1 queue shows only SCORED, ranked; decisions applied as candidate."""
from conftest import NOW, make_application, add_assessment

from jobagent.tracking import queue as q


def _scored(conn, company, title, tier, fit):
    app = make_application(conn, state="SCORED", company=company, title=title)
    pid = conn.execute("SELECT posting_id FROM applications WHERE id=?", (app,)).fetchone()[0]
    add_assessment(conn, pid, tier=tier, fit=fit)
    return app


def test_queue_only_scored_and_ranked(conn):
    a = _scored(conn, "A", "Dir", "CONSIDER", 70)
    b = _scored(conn, "B", "VP", "APPLY_NOW", 85)
    c = _scored(conn, "C", "Head", "APPLY_NOW", 95)
    # A DISCOVERED (unscored) item must not appear.
    make_application(conn, state="DISCOVERED", company="Z", title="Zzz")

    rows = q.build_gate1_queue(conn)
    ids = [r["app_id"] for r in rows]
    assert ids == [c, b, a]  # APPLY_NOW by fit desc, then CONSIDER
    assert all(r["tier"] in ("APPLY_NOW", "CONSIDER", "SKIP") for r in rows)


def test_decision_advances_only_via_candidate(conn):
    a = _scored(conn, "A", "Dir CMC", "APPLY_NOW", 90)
    q.apply_decision(conn, a, "SHORTLISTED", NOW, note="strong fit")
    row = conn.execute("SELECT state, g1_decided_by, tier_at_g1 FROM applications WHERE id=?", (a,)).fetchone()
    assert row[0] == "SHORTLISTED" and row[1] == "candidate" and row[2] == "APPLY_NOW"
    # It leaves the queue.
    assert a not in [r["app_id"] for r in q.build_gate1_queue(conn)]


def test_csv_round_trip(conn):
    a = _scored(conn, "A", "Dir", "APPLY_NOW", 90)
    b = _scored(conn, "B", "VP", "CONSIDER", 60)
    csv_text = q.to_csv(q.build_gate1_queue(conn))
    # Candidate fills decisions:
    filled = csv_text.replace(",,\r\n", ",,\n")  # normalize (csv writer uses \r\n)
    lines = csv_text.splitlines()
    header = lines[0].split(",")
    di = header.index("decision")
    def fill(line, decision):
        cells = line.split(",")
        cells[di] = decision
        return ",".join(cells)
    body = [lines[0]]
    for line in lines[1:]:
        aid = line.split(",")[0]
        body.append(fill(line, "SHORTLISTED" if aid == str(a) else "DECLINED"))
    summary = q.apply_decisions_csv(conn, "\n".join(body), NOW)
    assert summary["shortlisted"] == 1 and summary["declined"] == 1
