"""Shared configuration for self-contained tests and integration collection."""

import os


os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"


def pytest_configure(config):
    """Provide synthetic settings for self-contained tests and credential-free collection."""
    if config.option.collectonly or config.option.markexpr in {
        "not integration",
        "not integration and not hardware",
        "hardware",
    }:
        os.environ.setdefault("INFERENCE_BASE_URL", "http://127.0.0.1:9")
        os.environ.setdefault("INFERENCE_API_KEY", "unused-test-value")
        os.environ.setdefault("INFERENCE_DEPLOYMENT_NAME", "test/model")
