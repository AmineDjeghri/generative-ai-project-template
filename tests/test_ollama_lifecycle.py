"""Check the Compose service lifecycle using fake executables and no network or models."""

import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import time

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize("compose", ["docker-compose.yml", "docker-compose-cuda.yml"])
def test_ollama_keeps_serving_after_model_provisioning(tmp_path, compose):
    configuration = yaml.safe_load((ROOT / compose).read_text())
    command = configuration["services"]["ollama"]["command"]
    binary = tmp_path / "bin"
    binary.mkdir()
    servers = tmp_path / "servers"
    commands = {
        "make": (
            "#!/bin/sh\nexec /usr/bin/make --no-print-directory -f "
            + shlex.quote(str(ROOT / "makefiles/ollama.mk"))
            + " download-ollama-models\n"
        ),
        # Avoid loading login-shell profiles in the isolated model-downloader test.
        "bash": '#!/bin/sh\nexec /bin/bash -c "$2"\n',
        "uname": "#!/bin/sh\nprintf 'Linux\\n'\n",
        "curl": (
            f"#!{sys.executable}\nfrom pathlib import Path\nimport os\n"
            "raise SystemExit(0 if Path(os.environ['OLLAMA_TEST_SERVERS']).exists() else 1)\n"
        ),
        "ollama": (
            f"#!{sys.executable}\nimport os\nfrom pathlib import Path\nimport sys\nimport time\n"
            "if sys.argv[1] == 'serve':\n"
            "    with Path(os.environ['OLLAMA_TEST_SERVERS']).open('a') as stream:\n"
            "        stream.write(str(os.getpid()) + '\\n')\n"
            "    while True:\n"
            "        time.sleep(1)\n"
        ),
    }
    for name, contents in commands.items():
        executable = binary / name
        executable.write_text(contents)
        executable.chmod(0o755)
    process = subprocess.Popen(
        ["/bin/sh", "-c", command],
        cwd=tmp_path,
        env={
            **os.environ,
            "PATH": f"{binary}:/usr/bin:/bin",
            "OLLAMA_TEST_SERVERS": str(servers),
        },
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    try:
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if servers.exists() and len(servers.read_text().splitlines()) == 2:
                assert process.poll() is None
                break
            if process.poll() is not None:
                pytest.fail(f"Ollama container command exited: {process.stderr.read()}")
            time.sleep(0.05)
        else:
            pytest.fail("Compose did not start its persistent server after downloading models")
    finally:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        process.communicate(timeout=5)
