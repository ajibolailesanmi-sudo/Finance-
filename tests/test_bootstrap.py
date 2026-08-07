"""F0 — bootstrap idempotency + deterministic migration replay."""
from jobagent.common import db as dbm

NOW = "2026-08-06T00:00:00Z"


def test_migrations_apply_once_then_noop():
    conn = dbm.connect(":memory:")
    first = dbm.migrate(conn, NOW)
    assert first == [1, 2]              # applies all pending migrations in order
    second = dbm.migrate(conn, NOW)
    assert second == []                 # nothing to re-apply (idempotent)
    conn.close()


def test_fresh_db_replays_same_schema():
    def schema(conn):
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        return sorted(r[0] for r in rows)

    c1 = dbm.connect(":memory:"); dbm.migrate(c1, NOW)
    c2 = dbm.connect(":memory:"); dbm.migrate(c2, NOW)
    assert schema(c1) == schema(c2)     # deterministic
    for t in ("postings", "assessments", "applications", "sources",
              "state_history", "materials_versions", "posting_sources"):
        assert t in schema(c1)
    c1.close(); c2.close()


def test_bootstrap_script_runs_twice_identically(tmp_path):
    import importlib.util, sys
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent
    spec = importlib.util.spec_from_file_location("bootstrap", root / "scripts" / "bootstrap.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["bootstrap"] = mod
    spec.loader.exec_module(mod)

    db = str(tmp_path / "app.db")
    r1 = mod.run(db, now=NOW)
    r2 = mod.run(db, now=NOW)
    assert r1["migrations_applied"] == [1, 2]
    assert r2["migrations_applied"] == []          # second run applies nothing
    assert r1["sources_synced"] == r2["sources_synced"]
    assert r1["library_entries"] == r2["library_entries"]
