"""A full integration gate must reject skipped, empty and filtered runs."""

import json
from pathlib import Path

import pytest

pytest_plugins = ["pytester"]

PLUGIN_SOURCE = Path(__file__).resolve().parents[3] / "scripts/integration_results.py"


SKIPPED_TEST = (
    "import pytest\n@pytest.mark.skip(reason='service unavailable')\ndef test_live():\n    pass\n"
)


@pytest.mark.parametrize(
    "body,arguments,expected",
    [
        ("def test_live():\n    pass\n", [], "complete"),
        (
            SKIPPED_TEST,
            [],
            "incomplete",
        ),
        ("def test_live():\n    assert False\n", [], "incomplete"),
        ("def test_live():\n    pass\n", ["-k", "missing"], "incomplete"),
        ("", [], "incomplete"),
        ("def test_live():\n    pass\n", ["-n", "2"], "complete"),
        (
            "def test_first():\n    pass\ndef test_second():\n    pass\n"
            "def test_third():\n    pass\ndef test_fourth():\n    pass\n",
            ["-n", "2"],
            "complete",
        ),
        (
            "def test_live():\n    pass\ndef test_other():\n    pass\n",
            ["-n", "2", "-k", "test_live"],
            "incomplete",
        ),
        (
            SKIPPED_TEST,
            ["-n", "2"],
            "incomplete",
        ),
        ("raise RuntimeError('service configuration unavailable')\n", [], "incomplete"),
    ],
)
def test_only_executed_successful_integration_is_complete(
    pytester, monkeypatch, body, arguments, expected
):
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    (pytester.path / "result_plugin.py").write_text(PLUGIN_SOURCE.read_text())
    pytester.makeini("[pytest]\nmarkers =\n    integration: real service\n")
    pytester.makepyfile(test_service="import pytest\npytestmark = pytest.mark.integration\n" + body)
    result = pytester.runpytest_subprocess("-p", "result_plugin", "-q", *arguments)
    report = json.loads((pytester.path / "reports/integration.json").read_text())
    assert report["status"] == expected
    if expected == "complete":
        assert report["passed"] == body.count("def test_")
    assert (result.ret == 0) == (expected == "complete")


def test_collection_never_claims_execution(pytester, monkeypatch):
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    (pytester.path / "result_plugin.py").write_text(PLUGIN_SOURCE.read_text())
    pytester.makepyfile("def test_live():\n    raise AssertionError('must not execute')\n")
    result = pytester.runpytest_subprocess("-p", "result_plugin", "--collect-only", "-q")
    assert result.ret == 0
    assert not (pytester.path / "reports/integration.json").exists()
