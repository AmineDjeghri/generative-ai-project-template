"""Read the release tag and require a wheel and sdist for every released package."""

import argparse
from pathlib import Path
import tomllib

from packaging.utils import canonicalize_name
from packaging.version import Version


def project_metadata(project: Path) -> dict:
    """Read package metadata without importing application settings."""
    return tomllib.loads((project / "pyproject.toml").read_text())["project"]


def release_tag() -> str:
    """Preserve semantic-release's version spelling when addressing Git tags."""
    return f"v{project_metadata(Path('.'))['version']}"


def release_artifacts(projects: list[Path]) -> list[Path]:
    """Require matching package versions and exactly one wheel plus sdist per package."""
    version = project_metadata(Path("."))["version"]
    package_version = str(Version(version))
    files = []
    for project in projects:
        metadata = project_metadata(project)
        if metadata["version"] != version:
            raise ValueError(f"{project}/pyproject.toml must have version {version}")
        name = canonicalize_name(metadata["name"]).replace("-", "_")
        wheels = sorted(Path("dist").glob(f"{name}-{package_version}-*.whl"))
        sdist = Path("dist") / f"{name}-{package_version}.tar.gz"
        if len(wheels) != 1 or not wheels[0].is_file() or not sdist.is_file():
            raise ValueError(
                f"Expected one wheel and one sdist for {name} {package_version}; "
                "run make build-package"
            )
        files.extend([wheels[0], sdist])
    return files


def main() -> None:
    """Expose metadata checks to Make without shell parsing of TOML or ls output."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["tag", "files"])
    parser.add_argument("projects", nargs="*", type=Path, default=[Path(".")])
    arguments = parser.parse_args()
    try:
        if arguments.command == "tag":
            print(release_tag())
        else:
            print("\n".join(map(str, release_artifacts(arguments.projects))))
    except (KeyError, OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
