"""Exercise release guards and artifact recovery without Git or GitHub mutations."""

import json
import os
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tomllib

from packaging.version import Version
import pytest


ROOT = Path(__file__).resolve().parents[1]
METADATA = runpy.run_path(str(ROOT / "scripts/release_artifacts.py"))


def write_project(path, name="demo-package", version="2.0.0"):
    path.mkdir(parents=True, exist_ok=True)
    (path / "pyproject.toml").write_text(f'[project]\nname = "{name}"\nversion = "{version}"\n')


def write_artifacts(path, name="demo_package", version="2.0.0"):
    directory = path / "dist"
    directory.mkdir(exist_ok=True)
    normalized = str(Version(version))
    files = [
        directory / f"{name}-{normalized}-py3-none-any.whl",
        directory / f"{name}-{normalized}.tar.gz",
    ]
    for file in files:
        file.touch()
    return files


@pytest.mark.parametrize("version", ["2.0.0", "2.1.0-rc.1"])
@pytest.mark.parametrize("projects", [["."], ["backend", "frontend"]])
def test_release_tag_and_complete_artifacts(tmp_path, monkeypatch, version, projects):
    monkeypatch.chdir(tmp_path)
    write_project(tmp_path, version=version)
    expected = []
    for index, project in enumerate(projects):
        name = f"package-{index}"
        write_project(tmp_path / project, name, version)
        expected.extend(write_artifacts(tmp_path, name.replace("-", "_"), version))
    assert METADATA["release_tag"]() == f"v{version}"
    actual = METADATA["release_artifacts"]([Path(project) for project in projects])
    assert [tmp_path / file for file in actual] == expected


@pytest.mark.parametrize("missing", [0, 1, 2, 3])
def test_partial_workspace_artifacts_are_rejected(tmp_path, monkeypatch, missing):
    monkeypatch.chdir(tmp_path)
    write_project(tmp_path)
    files = []
    for name in ("backend", "frontend"):
        write_project(tmp_path / name, name)
        files.extend(write_artifacts(tmp_path, name))
    files[missing].unlink()
    with pytest.raises(ValueError, match="one wheel and one sdist"):
        METADATA["release_artifacts"]([Path("backend"), Path("frontend")])


def test_mismatched_workspace_versions_are_rejected(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    write_project(tmp_path)
    write_project(tmp_path / "backend", version="1.9.0")
    with pytest.raises(ValueError, match="must have version 2.0.0"):
        METADATA["release_artifacts"]([Path("backend")])


MOCK_COMMAND = r"""
import json
import os
from pathlib import Path
import subprocess
import sys

configuration = json.loads(os.environ["RELEASE_TEST_CASE"])
command = Path(sys.argv[0]).name
arguments = sys.argv[1:]
with Path(os.environ["RELEASE_TEST_CALLS"]).open("a") as stream:
    stream.write(json.dumps([command, *arguments]) + "\n")
if command == "git":
    if arguments == ["rev-parse", "--abbrev-ref", "HEAD"]:
        print(configuration.get("branch", "main"))
    elif arguments == ["status", "--porcelain"]:
        print(" M changed.py" if configuration.get("dirty") else "", end="")
    elif arguments[:1] == ["fetch"]:
        sys.exit(configuration.get("fetch_status", 0))
    elif arguments == ["rev-parse", "HEAD"]:
        print(configuration.get("head", "tested"))
    elif arguments[:1] == ["rev-parse"] and arguments[-1].startswith("origin/"):
        print(configuration.get("origin", configuration.get("head", "tested")))
    elif arguments == ["rev-parse", "HEAD^"]:
        print(configuration.get("parent", "parent"))
    elif arguments == ["rev-parse", "-q", "--verify", "HEAD^2"]:
        sys.exit(0 if configuration.get("merge") else 1)
    elif arguments[:3] == ["rev-parse", "-q", "--verify"]:
        version = arguments[-1].removeprefix("refs/tags/v").removesuffix("^{commit}")
        commit = configuration.get("tags", {}).get(version)
        if commit is None:
            sys.exit(1)
        print(commit)
    elif arguments == ["log", "-1", "--format=%s"]:
        print(configuration.get("subject", "fix: application change"))
    elif arguments[:2] == ["diff", "--name-only"]:
        print(configuration.get("changes", "pyproject.toml\nuv.lock\nCHANGELOG.md"))
    elif arguments[:1] == ["config"]:
        print("Release Fixture")
    elif arguments[:1] == ["add"]:
        sys.exit(configuration.get("add_status", 0))
    else:
        raise RuntimeError(f"Unexpected mock git operation: {arguments}")
elif command == "uv":
    if "semantic-release" in arguments:
        if "--print" in arguments:
            if configuration.get("probe_status", 0):
                print("Synthetic version probe failed", file=sys.stderr)
                sys.exit(configuration["probe_status"])
            print(configuration.get("next_version", "2.0.1"))
        else:
            sys.exit(configuration.get("publish_status", 0))
    elif arguments[:1] == ["lock"]:
        sys.exit(configuration.get("lock_status", 0))
    else:
        python = arguments.index("python")
        sys.exit(subprocess.call([sys.executable, *arguments[python + 1:]]))
elif command == "gh":
    if arguments[:2] == ["release", "view"]:
        sys.exit(configuration.get("view_status", 0))
    if arguments[:2] == ["release", "upload"]:
        sys.exit(configuration.get("upload_status", 0))
elif command == "make":
    sys.exit(configuration.get("build_status", 0) if "build-package" in arguments else 0)
else:
    raise RuntimeError(f"Unexpected mock executable: {command}")
"""


@pytest.fixture
def run_release_recipe(tmp_path):
    scripts = tmp_path / "scripts"
    scripts.mkdir()
    shutil.copyfile(ROOT / "scripts/release_artifacts.py", scripts / "release_artifacts.py")
    write_project(tmp_path)
    binary = tmp_path / "bin"
    binary.mkdir()
    for name in ("git", "uv", "gh", "make"):
        executable = binary / name
        executable.write_text(f"#!{sys.executable}\n" + MOCK_COMMAND)
        executable.chmod(0o755)
    source = (ROOT / "makefiles/release.mk").read_text()
    for name in ("release-version", "release-assets", "release"):
        source = source.replace(f"\n{name}:", f"\nfixture-{name}:")
    makefile = tmp_path / "fixture.mk"
    makefile.write_text(source)

    def run(target="release-version", **configuration):
        calls = tmp_path / "calls.jsonl"
        output = tmp_path / "output"
        calls.unlink(missing_ok=True)
        output.unlink(missing_ok=True)
        env = {
            **os.environ,
            "PATH": str(binary) + os.pathsep + os.environ["PATH"],
            "GH_TOKEN": "synthetic-fixture",
            "GIT_COMMIT_AUTHOR": "Release Fixture",
            "GITHUB_ACTIONS": configuration.pop("actions", "false"),
            "GITHUB_SHA": configuration.pop("sha", ""),
            "GITHUB_OUTPUT": str(output),
            "RELEASE_TEST_CASE": json.dumps(configuration),
            "RELEASE_TEST_CALLS": str(calls),
        }
        result = subprocess.run(
            [
                "/usr/bin/make",
                "--no-print-directory",
                "-j4",
                "-f",
                str(makefile),
                f"fixture-{target}",
                f"UV={binary / 'uv'}",
                f"MAKE={binary / 'make'}",
                "PACKAGE_PROJECTS=.",
            ],
            cwd=tmp_path,
            env=env,
            text=True,
            capture_output=True,
            timeout=20,
        )
        events = [json.loads(line) for line in calls.read_text().splitlines()]
        values = (
            dict(line.split("=", 1) for line in output.read_text().splitlines())
            if output.exists()
            else {}
        )
        return result, events, values

    return run


@pytest.mark.parametrize(
    "configuration",
    [
        {"branch": "feature/example"},
        {"dirty": True},
        {"fetch_status": 1},
        {"origin": "another-commit"},
        {"actions": "true", "sha": "tested", "head": "newer"},
        {
            "actions": "true",
            "sha": "tested",
            "head": "release",
            "tags": {"2.0.0": "release"},
            "parent": "unvalidated",
            "subject": "chore(release): v2.0.0 [skip ci]",
        },
        {
            "actions": "true",
            "sha": "tested",
            "head": "release",
            "tags": {"2.0.0": "release"},
            "parent": "tested",
            "subject": "fix: untested application change",
        },
        {
            "actions": "true",
            "sha": "tested",
            "head": "release",
            "tags": {"2.0.0": "release"},
            "parent": "tested",
            "subject": "chore(release): v2.0.0 [skip ci]",
            "changes": "backend/src/application.py",
        },
        {
            "actions": "true",
            "sha": "tested",
            "head": "release",
            "tags": {"2.0.0": "release"},
            "parent": "tested",
            "subject": "chore(release): v2.0.0 [skip ci]",
            "merge": True,
        },
    ],
)
def test_invalid_release_state_never_versions(run_release_recipe, configuration):
    result, events, _ = run_release_recipe(**configuration)
    assert result.returncode != 0
    assert not any("semantic-release" in event for event in events)


def test_failed_version_probe_is_an_error(run_release_recipe):
    result, _, values = run_release_recipe(probe_status=42)
    assert result.returncode != 0
    assert "Synthetic version probe failed" in result.stderr
    assert "No releasable commit" not in result.stdout
    assert values.get("released") != "true"


def test_no_releasable_commit_does_not_publish(run_release_recipe):
    result, events, values = run_release_recipe(next_version="2.0.0", tags={"2.0.0": "older"})
    assert result.returncode == 0, result.stderr
    assert values["released"] == values["tagged"] == "false"
    assert not any("-v" in event for event in events)


def test_validated_commit_can_release(run_release_recipe):
    result, _, values = run_release_recipe(actions="true", sha="tested")
    assert result.returncode == 0, result.stderr
    assert values["released"] == values["tagged"] == "true"
    assert values["tag"] == "v2.0.1"


def test_generated_release_commit_can_recover_uploads(run_release_recipe):
    result, events, values = run_release_recipe(
        actions="true",
        sha="tested",
        head="release",
        parent="tested",
        tags={"2.0.0": "release"},
        subject="chore(release): v2.0.0 [skip ci]",
    )
    assert result.returncode == 0, result.stderr
    assert values["released"] == "false"
    assert values["tagged"] == "true"
    assert not any("semantic-release" in event for event in events)


def test_prerelease_upload_preserves_tag_spelling(tmp_path, run_release_recipe):
    write_project(tmp_path, version="2.1.0-rc.1")
    write_artifacts(tmp_path, version="2.1.0-rc.1")
    result, events, _ = run_release_recipe(
        "release-assets", tags={"2.1.0-rc.1": "tested"}, view_status=1
    )
    assert result.returncode == 0, result.stderr
    create = next(event for event in events if event[:3] == ["gh", "release", "create"])
    upload = next(event for event in events if event[:3] == ["gh", "release", "upload"])
    assert create[3] == upload[3] == "v2.1.0-rc.1"
    assert "--prerelease" in create
    assert any("2.1.0rc1" in argument for argument in upload)


def test_missing_artifacts_prevent_github_operations(run_release_recipe):
    result, events, _ = run_release_recipe("release-assets")
    assert result.returncode != 0
    assert not any(event[0] == "gh" for event in events)


@pytest.mark.parametrize("build_status", [0, 42])
def test_parallel_release_builds_before_upload(run_release_recipe, build_status):
    result, events, _ = run_release_recipe(
        "release", tags={"2.0.0": "tested"}, build_status=build_status
    )
    commands = [event[-1] for event in events if event[0] == "make"]
    assert commands[:2] == ["release-version", "build-package"]
    assert (result.returncode == 0) == (build_status == 0)
    assert ("release-assets" in commands) == (build_status == 0)


@pytest.mark.parametrize("failure", ["lock_status", "add_status", "build_status"])
def test_release_build_hook_stops_at_first_failure(tmp_path, run_release_recipe, failure):
    run_release_recipe()  # Prepare isolated executable mocks.
    configuration = tomllib.loads((ROOT / "pyproject.toml").read_text())
    command = configuration["tool"]["semantic_release"]["build_command"]
    calls = tmp_path / "hook-calls"
    result = subprocess.run(
        ["/bin/sh", "-c", command],
        cwd=tmp_path,
        env={
            **os.environ,
            "PATH": str(tmp_path / "bin") + os.pathsep + os.environ["PATH"],
            "RELEASE_TEST_CASE": json.dumps({failure: 42}),
            "RELEASE_TEST_CALLS": str(calls),
            "PACKAGE_NAME": "demo-package",
        },
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode != 0
    events = [json.loads(line) for line in calls.read_text().splitlines()]
    expected = {"lock_status": 1, "add_status": 2, "build_status": 3}
    assert len(events) == expected[failure]
