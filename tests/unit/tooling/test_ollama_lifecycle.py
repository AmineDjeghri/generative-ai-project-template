"""Exercise model provisioning without running Docker or downloading models."""

import os
from pathlib import Path
import subprocess

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[3]


@pytest.mark.parametrize("failure", [False, True])
def test_provisioning_targets_server_and_stops_on_failure(tmp_path, failure):
    configuration = yaml.safe_load((ROOT / "docker-compose.yml").read_text())
    script = configuration["services"]["ollama-init"]["command"][0].replace("$$", "$")
    executable = tmp_path / "ollama"
    executable.write_text(
        '#!/bin/sh\nprintf "%s %s %s\\n" "$OLLAMA_HOST" "$1" "$2" >> "$CALLS"\n'
        + ("exit 1\n" if failure else "")
    )
    executable.chmod(0o755)
    calls = tmp_path / "calls"
    result = subprocess.run(
        ["/bin/sh", "-c", script],
        env={
            **os.environ,
            "PATH": f"{tmp_path}:/usr/bin:/bin",
            "CALLS": str(calls),
            "INFERENCE_DEPLOYMENT_NAME": "ollama_chat/team/model:tag",
            "OLLAMA_MODEL_NAME": "unused",
            "OLLAMA_EMBEDDING_MODEL_NAME": "embed",
        },
        capture_output=True,
        text=True,
        timeout=5,
    )
    lines = calls.read_text().splitlines()
    assert lines[0] == "http://ollama:11434 pull team/model:tag"
    assert len(lines) == (1 if failure else 2)
    assert (result.returncode != 0) == failure
    assert (
        configuration["services"]["backend"]["depends_on"]["ollama-init"]["condition"]
        == "service_completed_successfully"
    )


def test_gpu_override_reserves_gpu_for_inference_service():
    configuration = yaml.safe_load((ROOT / "docker-compose-cuda.yml").read_text())
    devices = configuration["services"]["ollama"]["deploy"]["resources"]["reservations"]["devices"]
    assert devices[0]["capabilities"] == ["gpu"]
    assert "backend" not in configuration["services"]
