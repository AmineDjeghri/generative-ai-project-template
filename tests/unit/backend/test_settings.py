import pytest
from pydantic import ValidationError

from genai_template_frontend.frontend_settings import ApplicationSettings as FrontendSettings
from genai_template_backend.backend_settings import ApplicationSettings, _initialize_logger


def test_settings():
    """Test that ApplicationSettings can be instantiated."""
    settings = ApplicationSettings()
    assert settings is not None


def test_logging_level_default():
    """Test that logging_level defaults to DEBUG."""
    settings = ApplicationSettings()
    assert settings.logging_level == "DEBUG"


def test_logging_level_from_env(monkeypatch):
    """Test that LOGGING_LEVEL can be set from environment variable."""
    monkeypatch.setenv("LOGGING_LEVEL", "INFO")
    settings = ApplicationSettings()
    assert settings.logging_level == "INFO"


def test_initialize_logger():
    """Test that _initialize_logger returns a loguru logger bound to the app namespace."""
    settings = ApplicationSettings()
    logger = _initialize_logger(settings)
    assert logger is not None
    assert hasattr(logger, "debug")
    assert hasattr(logger, "info")
    assert hasattr(logger, "warning")
    assert hasattr(logger, "error")


@pytest.mark.parametrize(
    "name,value,expected",
    [
        ("INFERENCE_TIMEOUT_SECONDS", "45.5", 45.5),
        ("INFERENCE_RETRY_WAIT_SECONDS", "0", 0),
        ("INFERENCE_MAX_ATTEMPTS", "2", 2),
        ("CHAT_TIMEOUT_SECONDS", "70", 70),
        ("BACKEND_REQUEST_TIMEOUT_SECONDS", "100", 100),
        ("BACKEND_CONNECT_TIMEOUT_SECONDS", "3", 3),
    ],
)
def test_request_settings_from_environment(monkeypatch, name, value, expected):
    monkeypatch.setenv(name, value)
    cls = FrontendSettings if name.startswith("BACKEND_") else ApplicationSettings
    assert getattr(cls(_env_file=None), name) == expected


@pytest.mark.parametrize(
    "name,value",
    [
        ("INFERENCE_TIMEOUT_SECONDS", "0"),
        ("INFERENCE_RETRY_WAIT_SECONDS", "-1"),
        ("INFERENCE_MAX_ATTEMPTS", "0"),
        ("INFERENCE_MAX_ATTEMPTS", "1.5"),
        ("CHAT_TIMEOUT_SECONDS", "-1"),
        ("BACKEND_REQUEST_TIMEOUT_SECONDS", "0"),
        ("BACKEND_CONNECT_TIMEOUT_SECONDS", "-1"),
    ],
)
def test_invalid_request_settings_are_rejected(monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    cls = FrontendSettings if name.startswith("BACKEND_") else ApplicationSettings
    with pytest.raises(ValidationError):
        cls(_env_file=None)
