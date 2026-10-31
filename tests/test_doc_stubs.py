"""Keep API reference generation aligned with single packages and uv workspaces."""

from contextlib import contextmanager
import io
from pathlib import Path
import runpy
import sys
from types import SimpleNamespace

import mkdocs_gen_files
import pytest


ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize("members", [["."], ["backend", "frontend"]])
def test_api_reference_includes_every_package(tmp_path, monkeypatch, members):
    monkeypatch.chdir(tmp_path)
    configuration = "[project]\nname = 'example'\nversion = '1.0.0'\n"
    if members != ["."]:
        configuration += f"\n[tool.uv.workspace]\nmembers = {members!r}\n"
    (tmp_path / "pyproject.toml").write_text(configuration)
    expected = {}
    for index, member in enumerate(members):
        package = f"example_{index}"
        source = tmp_path / member / "src" / package
        source.mkdir(parents=True)
        (source / "__init__.py").write_text('"""Package."""\n')
        (source / "seqly_helpers.py").write_text('"""Ordinary module."""\n')
        expected[f"package/{package}/seqly_helpers.md"] = f"::: {package}.seqly_helpers\n"

    captured = {}

    @contextmanager
    def capture(path, mode):
        stream = io.StringIO()
        yield stream
        captured[str(path)] = stream.getvalue()

    monkeypatch.setitem(
        sys.modules,
        "mkdocs_gen_files",
        SimpleNamespace(Nav=mkdocs_gen_files.Nav, open=capture),
    )
    runpy.run_path(str(ROOT / "scripts/gen_doc_stubs.py"))
    summary = captured.pop("package/SUMMARY.md")
    assert captured == expected
    for index in range(len(members)):
        assert f"example_{index}/seqly_helpers.md" in summary
