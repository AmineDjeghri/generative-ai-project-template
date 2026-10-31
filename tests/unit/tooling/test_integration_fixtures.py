"""Service probes must be deferred until an explicit integration fixture executes."""

from pathlib import Path
from types import SimpleNamespace

import pytest
import requests


def load_fixtures():
    namespace = {}
    path = Path(__file__).resolve().parents[2] / "integration" / "conftest.py"
    exec(compile(path.read_text(), str(path), "exec"), namespace)
    return namespace


def test_importing_integration_fixtures_never_probes_services(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Importing integration fixtures made a network request")

    monkeypatch.setattr(requests, "get", forbidden)
    namespace = load_fixtures()
    assert "require_llm" in namespace
    assert "require_ollama" in namespace


def test_explicit_llm_fixture_fails_when_service_is_unreachable(monkeypatch):
    from genai_template_backend import backend_settings

    settings = SimpleNamespace(
        INFERENCE_API_KEY=SimpleNamespace(get_secret_value=lambda: "synthetic"),
        INFERENCE_BASE_URL="http://127.0.0.1:9",
        INFERENCE_DEPLOYMENT_NAME="ollama/test",
    )
    monkeypatch.setattr(backend_settings, "settings", settings)

    def unavailable(*args, **kwargs):
        raise requests.ConnectionError("synthetic unavailable service")

    monkeypatch.setattr(requests, "get", unavailable)
    with pytest.raises(pytest.fail.Exception, match="unreachable") as failure:
        load_fixtures()["require_llm"].__wrapped__()
    assert "INFERENCE_BASE_URL=http://127.0.0.1:9" in str(failure.value)
    assert "INFERENCE_DEPLOYMENT_NAME=ollama/test" in str(failure.value)
    assert "ConnectionError" in str(failure.value)
    assert "synthetic" not in str(failure.value)


def test_explicit_llm_fixture_fails_when_credentials_are_missing(monkeypatch):
    from genai_template_backend import backend_settings

    settings = SimpleNamespace(
        INFERENCE_API_KEY=SimpleNamespace(get_secret_value=lambda: ""),
        INFERENCE_BASE_URL="http://127.0.0.1:9",
        INFERENCE_DEPLOYMENT_NAME="ollama/test",
    )
    monkeypatch.setattr(backend_settings, "settings", settings)
    with pytest.raises(pytest.fail.Exception, match="require INFERENCE_API_KEY"):
        load_fixtures()["require_llm"].__wrapped__()


@pytest.mark.parametrize("fixture", ["require_llm", "require_ollama"])
def test_http_diagnostics_include_safe_url_and_status(monkeypatch, fixture):
    from genai_template_backend import backend_settings

    settings = SimpleNamespace(
        INFERENCE_API_KEY=SimpleNamespace(get_secret_value=lambda: "private-key"),
        INFERENCE_BASE_URL="http://user:password@localhost:11434/api?token=private-query#fragment",  # pragma: allowlist secret
        INFERENCE_DEPLOYMENT_NAME="ollama/test",
    )
    monkeypatch.setattr(backend_settings, "settings", settings)
    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: SimpleNamespace(status_code=503))
    with pytest.raises(pytest.fail.Exception, match="HTTP 503") as failure:
        load_fixtures()[fixture].__wrapped__()
    message = str(failure.value)
    assert "INFERENCE_BASE_URL=http://localhost:11434/api" in message
    assert "INFERENCE_API_KEY=<set>" in message
    for secret in ("user:", "password", "private-key", "private-query", "fragment"):
        assert secret not in message


@pytest.mark.parametrize("variable", ["INFERENCE_BASE_URL", "INFERENCE_DEPLOYMENT_NAME"])
def test_missing_setting_is_named_before_probing(variable):
    settings = SimpleNamespace(
        INFERENCE_API_KEY=SimpleNamespace(get_secret_value=lambda: "unused"),
        INFERENCE_BASE_URL="http://localhost:11434",
        INFERENCE_DEPLOYMENT_NAME="ollama/test",
    )
    setattr(settings, variable, "")
    with pytest.raises(pytest.fail.Exception, match=variable):
        load_fixtures()["_inference_details"](settings)
