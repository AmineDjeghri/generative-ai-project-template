"""Check configuration errors and ensure Make stops before starting services."""

import os
from pathlib import Path
import runpy
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[3]
CHECK = runpy.run_path(str(ROOT / "scripts/check_config.py"))["check_settings"]
MODELS = {"OLLAMA_MODEL_NAME": "chat", "OLLAMA_EMBEDDING_MODEL_NAME": "embed"}


def configuration(url="http://localhost:11434"):
    return {
        "INFERENCE_DEPLOYMENT_NAME": "ollama/chat",
        "INFERENCE_BASE_URL": url,
        "INFERENCE_API_KEY": "unused",  # pragma: allowlist secret
    }


def test_context_checks_preserve_config_and_hide_credentials():
    environment = configuration("http://user:private-value@localhost:11434")
    before = environment.copy()
    errors = CHECK(environment, "docker", MODELS)
    assert any("INFERENCE_BASE_URL=http://ollama:11434" in error for error in errors)
    assert "private-value" not in " ".join(errors)
    assert environment == before
    assert CHECK(configuration(), "local", MODELS) == []
    assert CHECK(configuration("http://ollama:11434"), "local", MODELS)
    environment = configuration("https://remote.example")
    environment.update(
        EMBEDDINGS_DEPLOYMENT_NAME="openai/embed",
        EMBEDDINGS_BASE_URL="https://cloud.example",
        EMBEDDINGS_API_KEY="unused",  # pragma: allowlist secret
    )
    assert CHECK(environment, "docker", MODELS) == []
    assert CHECK(environment, "local", MODELS) == []
    environment["EMBEDDINGS_BASE_URL"] = "http://127.0.0.1:8001"
    assert any("EMBEDDINGS_BASE_URL" in error for error in CHECK(environment, "docker", MODELS))


def test_local_ollama_checks_models_and_installation(monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda _: "/fake/ollama")
    assert CHECK(configuration(), "local-ollama", MODELS) == []
    assert CHECK(configuration("https://remote.example"), "local-ollama", MODELS)
    wrong_models = {**MODELS, "OLLAMA_MODEL_NAME": "different"}
    assert any(
        "does not match" in error for error in CHECK(configuration(), "local-ollama", wrong_models)
    )
    monkeypatch.setattr(shutil, "which", lambda _: None)
    assert any(
        "install-ollama" in error for error in CHECK(configuration(), "local-ollama", MODELS)
    )


def test_make_preflight_failure_prevents_startup(tmp_path):
    shutil.copyfile(ROOT / "Makefile", tmp_path / "Makefile")
    shutil.copytree(ROOT / "makefiles", tmp_path / "makefiles")
    (tmp_path / "scripts").mkdir()
    shutil.copyfile(ROOT / "scripts/check_config.py", tmp_path / "scripts/check_config.py")
    (tmp_path / ".env").write_text(
        "INFERENCE_DEPLOYMENT_NAME=ollama/chat\n"
        "INFERENCE_BASE_URL=http://ollama:11434\n"
        "INFERENCE_API_KEY=unused\n"  # pragma: allowlist secret
    )
    executable = tmp_path / "uv"
    executable.write_text(
        '#!/bin/sh\nif [ "$4" = scripts/check_config.py ]; then\n'
        'shift 3\nexec "$TEST_PYTHON" "$@"\nfi\necho unexpected-startup >> "$CALLS"\nexit 99\n'
    )
    executable.chmod(0o755)
    docker = tmp_path / "docker"
    docker.write_text(
        f"#!{sys.executable}\n"
        "import json, os, sys\n"
        "with open(os.environ['CALLS'], 'a') as log: log.write(' '.join(sys.argv[1:]) + '\\n')\n"
        "if sys.argv[1] == 'info': sys.exit(0)\n"
        "if 'config' not in sys.argv: sys.exit(99)\n"
        f"print(json.dumps({{'services': {{'backend': {{'environment': configuration()}}}}}}))\n"
    )
    docker.chmod(0o755)
    calls = tmp_path / "calls"
    environment = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith(("INFERENCE_", "EMBEDDINGS_", "OLLAMA_"))
    }
    environment.update(
        PATH=f"{tmp_path}:{os.environ['PATH']}", TEST_PYTHON=sys.executable, CALLS=str(calls)
    )
    for target in ("run-app", "run-app-with-ollama", "docker-compose", "docker-compose-cuda"):
        result = subprocess.run(
            ["make", target, f"UV={executable}"],
            cwd=tmp_path,
            env=environment,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert result.returncode != 0
        assert "Startup configuration check failed" in result.stderr
    recorded = calls.read_text()
    assert "unexpected-startup" not in recorded
    assert "up --build" not in recorded
