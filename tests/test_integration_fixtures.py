"""Service probes must be deferred until an explicit integration fixture executes."""

from pathlib import Path
from types import SimpleNamespace

import pytest
import requests


def load_fixtures():
    namespace = {}
    path = Path(__file__).with_name("conftest.py")
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
    )
    monkeypatch.setattr(backend_settings, "settings", settings)

    def unavailable(*args, **kwargs):
        raise requests.ConnectionError("synthetic unavailable service")

    monkeypatch.setattr(requests, "get", unavailable)
    with pytest.raises(pytest.fail.Exception, match="unreachable"):
        load_fixtures()["require_llm"].__wrapped__()


def test_explicit_llm_fixture_fails_when_credentials_are_missing(monkeypatch):
    from genai_template_backend import backend_settings

    settings = SimpleNamespace(
        INFERENCE_API_KEY=SimpleNamespace(get_secret_value=lambda: ""),
        INFERENCE_BASE_URL="http://127.0.0.1:9",
    )
    monkeypatch.setattr(backend_settings, "settings", settings)
    with pytest.raises(pytest.fail.Exception, match="require INFERENCE_API_KEY"):
        load_fixtures()["require_llm"].__wrapped__()
