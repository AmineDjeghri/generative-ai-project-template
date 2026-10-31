"""Check startup configuration without contacting model providers or changing settings."""

import argparse
import json
import os
import shutil
import subprocess
import sys
from urllib.parse import urlsplit


OLLAMA_PROVIDERS = {"ollama", "ollama_chat"}
LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


def check_settings(environment, mode, models):
    """Return actionable errors without including credentials or configured URLs."""
    errors = []
    local_models = 0
    for prefix in ("INFERENCE", "EMBEDDINGS"):
        deployment = environment.get(f"{prefix}_DEPLOYMENT_NAME") or ""
        if prefix == "EMBEDDINGS" and not deployment:
            continue
        for suffix in ("DEPLOYMENT_NAME", "BASE_URL", "API_KEY"):
            key = f"{prefix}_{suffix}"
            if not environment.get(key):
                errors.append(f"{key} is required; set it in .env or the environment.")
        provider, _, model = deployment.partition("/")
        key = f"{prefix}_BASE_URL"
        try:
            url = urlsplit(environment.get(key) or "")
            port = url.port
            if url.scheme not in {"http", "https"} or not url.hostname:
                raise ValueError
        except ValueError:
            errors.append(f"{key} must be a valid HTTP or HTTPS URL.")
            continue
        if mode == "docker" and url.hostname in LOOPBACK_HOSTS:
            hint = (
                f"Set {key}=http://ollama:11434 for the bundled Ollama service."
                if provider in OLLAMA_PROVIDERS
                else "Use an address reachable from the backend container."
            )
            errors.append(f"{key} points inside the backend container. {hint}")
        if mode != "docker" and url.hostname == "ollama":
            errors.append(
                f"{key} uses the Docker service name. "
                f"For local Ollama, set {key}=http://localhost:11434."
            )
        if provider in OLLAMA_PROVIDERS and not model:
            errors.append(f"{prefix}_DEPLOYMENT_NAME must include an Ollama model name.")
        if mode == "local-ollama" and provider in OLLAMA_PROVIDERS:
            if url.scheme != "http" or url.hostname not in LOOPBACK_HOSTS or port != 11434:
                errors.append(
                    f"{key} must point to local Ollama on port 11434; "
                    "use make run-app for externally managed servers."
                )
                continue
            local_models += 1
            model_key = (
                "OLLAMA_MODEL_NAME" if prefix == "INFERENCE" else "OLLAMA_EMBEDDING_MODEL_NAME"
            )
            expected = models[model_key]
            if model.removesuffix(":latest") != expected.removesuffix(":latest"):
                errors.append(
                    f"{prefix}_DEPLOYMENT_NAME does not match {model_key}. "
                    "Set both to the same model before downloading."
                )
    if mode == "local-ollama":
        cli_host = environment.get("OLLAMA_HOST") or "http://localhost:11434"
        try:
            cli_url = urlsplit(cli_host if "://" in cli_host else f"http://{cli_host}")
            if cli_url.hostname not in LOOPBACK_HOSTS or (cli_url.port or 11434) != 11434:
                raise ValueError
        except ValueError:
            errors.append("OLLAMA_HOST must point to local port 11434 when starting local Ollama.")
        if not local_models:
            errors.append(
                "No local Ollama model is configured; use make run-app for other providers."
            )
        if not shutil.which("ollama"):
            errors.append("Ollama is not installed; run make install-ollama first.")
    if mode != "docker":
        try:
            backend = urlsplit(environment.get("BACKEND_URL", "http://localhost:8000"))
            if backend.scheme not in {"http", "https"} or not backend.hostname:
                raise ValueError
            _ = backend.port
            if backend.hostname == "backend":
                errors.append(
                    "BACKEND_URL uses the Docker service name; use http://localhost:8000 locally."
                )
        except ValueError:
            errors.append("BACKEND_URL must be a valid HTTP or HTTPS URL.")
    return errors


def compose_environment(cuda):
    """Validate the effective Compose configuration without printing its secrets."""
    if not shutil.which("docker"):
        raise RuntimeError("Docker is not installed.")
    if subprocess.run(["docker", "info"], capture_output=True).returncode:
        raise RuntimeError("Docker is unavailable; start Docker and check daemon access.")
    command = ["docker", "compose", "-f", "docker-compose.yml"]
    if cuda:
        command += ["-f", "docker-compose-cuda.yml"]
    result = subprocess.run(
        command + ["config", "--format", "json"], capture_output=True, text=True
    )
    if result.returncode:
        raise RuntimeError(
            "Compose configuration is invalid; run docker compose config --quiet for details."
        )
    return json.loads(result.stdout)["services"]["backend"]["environment"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("local", "local-ollama", "docker"))
    parser.add_argument("--cuda", action="store_true")
    parser.add_argument("--model", default="qwen3.5:0.8b")
    parser.add_argument("--embedding-model", default="all-minilm:l6-v2")
    args = parser.parse_args()
    try:
        if args.mode == "docker":
            environment = compose_environment(args.cuda)
        else:
            from dotenv import dotenv_values

            environment = {**dotenv_values(".env"), **os.environ}
        errors = check_settings(
            environment,
            args.mode,
            {"OLLAMA_MODEL_NAME": args.model, "OLLAMA_EMBEDDING_MODEL_NAME": args.embedding_model},
        )
    except (OSError, RuntimeError, ValueError, KeyError) as error:
        # Do not print subprocess output or configuration values, which may contain secrets.
        errors = (
            [str(error)]
            if isinstance(error, RuntimeError)
            else ["Could not load startup configuration."]
        )
    if errors:
        print("Startup configuration check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Startup configuration check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
