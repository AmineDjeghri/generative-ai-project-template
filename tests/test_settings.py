from genai_template_backend.backend_settings import ApplicationSettings, get_logger


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


def test_get_logger():
    """Test that get_logger returns a loguru logger bound to the app namespace."""
    logger = get_logger()
    assert logger is not None
    assert hasattr(logger, "debug")
    assert hasattr(logger, "info")
    assert hasattr(logger, "warning")
    assert hasattr(logger, "error")
