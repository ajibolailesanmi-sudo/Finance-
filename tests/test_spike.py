"""Discovery spike (A3) instrument — probe logic, pacing, denylist, A3 gate."""
import pytest

from conftest import FIXTURES, NOW

from jobagent.discovery import spike as S


def test_build_endpoint():
    assert S.build_endpoint("greenhouse", "vir").endswith("/boards/vir/jobs?content=true")
    assert S.build_endpoint("lever", "acme").endswith("/postings/acme?mode=json")
    assert S.build_endpoint("rss", "https://x/f.rss") == "https://x/f.rss"
    with pytest.raises(ValueError):
        S.build_endpoint("carrier_pigeon", "x")


def test_probe_ok_from_fixture():
    gh = (FIXTURES / "greenhouse_sample.json").read_text()
    r = S.probe({"platform": "greenhouse", "token": "vir", "company": "Vir", "label": "Vir"},
                fetch=lambda _u: gh, now=NOW)
    assert r.ok and r.raw_count == 2 and r.normalized_count == 2
    assert r.sample_titles and r.error is None


def test_probe_network_error_is_captured_not_raised():
    def boom(_u):
        raise ConnectionError("tunnel 403")
    r = S.probe({"platform": "lever", "token": "acme", "label": "Acme"}, fetch=boom, now=NOW)
    assert not r.ok and "403" in r.error


def test_probe_refuses_denylisted_endpoint():
    r = S.probe({"platform": "rss", "endpoint": "https://www.linkedin.com/jobs/", "label": "LI"},
                fetch=lambda _u: "<rss></rss>", now=NOW)
    assert not r.ok and "Denylist" in (r.error or "")  # I5


def test_run_spike_paces_and_caps():
    calls = {"sleep": 0}
    gh = (FIXTURES / "greenhouse_sample.json").read_text()
    cands = [{"platform": "greenhouse", "token": f"c{i}", "company": "C", "label": f"c{i}"}
             for i in range(5)]
    results = S.run_spike(cands, fetch=lambda _u: gh, now=NOW,
                          sleep=lambda _s: calls.__setitem__("sleep", calls["sleep"] + 1),
                          min_interval=1.0, jitter=0.0, max_probes=3)
    assert len(results) == 3            # capped
    assert calls["sleep"] == 3          # paced before each probe (I6)


def test_a3_gate_requires_two_platforms():
    gh = (FIXTURES / "greenhouse_sample.json").read_text()
    lv = (FIXTURES / "lever_sample.json").read_text()

    def fetch(url):
        return lv if "lever" in url else gh

    two = S.run_spike(
        [{"platform": "greenhouse", "token": "a", "company": "A", "label": "a"},
         {"platform": "lever", "token": "b", "company": "B", "label": "b"}],
        fetch=fetch, now=NOW)
    assert S.summarize(two)["a3_verified"] is True

    one = S.run_spike(
        [{"platform": "greenhouse", "token": "a", "company": "A", "label": "a"}],
        fetch=fetch, now=NOW)
    assert S.summarize(one)["a3_verified"] is False  # only one platform
