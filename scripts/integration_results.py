"""Fail incomplete integration runs and record a concise, credential-free result."""

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pytest
from _pytest.terminal import TerminalReporter


@dataclass(eq=False)
class IntegrationResults:
    """Track execution on the controller, including reports from xdist workers."""

    directory: Path = field(default_factory=Path.cwd)
    passed: set[str] = field(default_factory=set)
    failed: set[str] = field(default_factory=set)
    skipped: set[str] = field(default_factory=set)
    deselected: set[str] = field(default_factory=set)

    def pytest_runtest_logreport(self, report: pytest.TestReport) -> None:
        """Treat skipped setup/call reports and failing teardown as incomplete validation."""
        if report.skipped:
            self.skipped.add(report.nodeid)
        elif report.failed:
            self.failed.add(report.nodeid)
        elif report.when == "call":
            self.passed.add(report.nodeid)

    def pytest_deselected(self, items: list[pytest.Item]) -> None:
        """Detect filters that omit integration cases while ignoring ordinary unit cases."""
        for item in items:
            if (
                item.get_closest_marker("integration")
                or item.get_closest_marker("live")
                or "/integration/" in item.nodeid
            ):
                self.deselected.add(item.nodeid)

    @pytest.hookimpl(optionalhook=True)
    def pytest_testnodedown(self, node: Any, error: object) -> None:
        """Merge worker selection results so filtered parallel runs cannot pass as complete."""
        self.deselected.update(getattr(node, "workeroutput", {}).get("integration_deselected", []))

    def pytest_sessionfinish(self, session: pytest.Session, exitstatus: int) -> None:
        """Require executed integration tests and publish counts without test payloads."""
        if session.config.option.collectonly:
            return
        if hasattr(session.config, "workerinput"):
            worker_output = getattr(session.config, "workeroutput", None)
            if isinstance(worker_output, dict):
                worker_output["integration_deselected"] = sorted(self.deselected)
            return
        complete = bool(self.passed) and not (
            exitstatus or self.failed or self.skipped or self.deselected
        )
        result = {
            "status": "complete" if complete else "incomplete",
            "passed": len(self.passed),
            "failed": len(self.failed),
            "skipped": len(self.skipped),
            "deselected": len(self.deselected),
        }
        directory = self.directory / "reports"
        directory.mkdir(exist_ok=True)
        (directory / "integration.json").write_text(json.dumps(result, indent=2) + "\n")
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with Path(summary).open("a") as stream:
                stream.write(
                    f"\nIntegration validation: **{result['status']}**. "
                    f"Passed: {result['passed']}; failed: {result['failed']}; "
                    f"skipped: {result['skipped']}; deselected: {result['deselected']}.\n"
                )
        if not complete and not exitstatus:
            session.exitstatus = pytest.ExitCode.TESTS_FAILED

    def pytest_terminal_summary(self, terminalreporter: TerminalReporter) -> None:
        """Make partial integration execution visible in local and CI output."""
        if terminalreporter.config.option.collectonly:
            return
        terminalreporter.write_sep(
            "=",
            "Integration execution: "
            f"{len(self.passed)} passed, {len(self.failed)} failed, "
            f"{len(self.skipped)} skipped, {len(self.deselected)} deselected. "
            "Zero executed tests or any skipped/deselected integration case is incomplete.",
        )


def pytest_configure(config: pytest.Config) -> None:
    """Enable strict integration reporting only when this plugin is explicitly selected."""
    config.pluginmanager.register(IntegrationResults(), "integration-results")
