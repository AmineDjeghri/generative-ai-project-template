# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## What this repo is

A template for a generative AI application, managed with uv as one project with two packages:
`backend/` (FastAPI, `genai_template_backend`) and `frontend/` (NiceGUI, `genai_template_frontend`),
plus Ollama, docker-compose, tests, a documentation site (properdocs / MkDocs Material) and
semantic-release. A release bumps the three versions together (root, `backend/`, `frontend/`) and
publishes a GitHub release with both packages' wheels and sdists, plus the documentation on GitHub
Pages; there is no package index. Developer docs: `docs/developer/`.

## Commands

```bash
make install-dev          # .venv with dev and docs tools (install-dev-cuda for CUDA)
make pre-commit-install   # git hooks (checks and commit message format)
make test-all           # required comprehensive software validation
make pre-commit           # static hooks; make test-all remains required
make run-app              # backend + frontend with the configured provider
make run-app-with-ollama  # prepare local Ollama models, then backend + frontend
make docker-compose       # the same in containers (docker-compose-cuda for CUDA)
make build-package        # dist/ wheels + sdists of backend and frontend
make deploy-doc-local     # build and serve the documentation
make release-version      # build packages, semantic-release: versions, CHANGELOG, tag, GitHub release (main/dev, clean, in sync)
make release-assets       # attach dist/ to the GitHub release
make release              # release-version + verified release-assets (manual release)
make deploy-doc-gh        # documentation to GitHub Pages
```

## Rules

- Use the `make` targets; workflows call `make`, never re-implement a step. A manual release and
  a GitHub Actions release run the same targets (`makefiles/release.mk`).
- Never commit, push, tag, create a GitHub release, run `make release*` / `make deploy-doc-gh` or
  `gh workflow run` without asking first.
- `make release-version` must keep its guards: branch `main` or `dev`, clean tree, in sync with
  `origin`, token from `GH_TOKEN`, then `gh auth login`, then a prompt. Never print a credential.
- Versions, tags and `CHANGELOG.md` belong to semantic-release (Conventional Commits,
  `docs/developer/3.conventions.md`): never edit a `project.version` by hand. The three
  `pyproject.toml` versions always stay equal.
- Settings in `backend_settings.py` / `frontend_settings.py`; secrets as `SecretStr`, set by
  environment or `.env`, never in a file of the repository. A new or renamed environment variable
  also goes in `.env.example` (and `.env.example.docker` if the containers read it) and, if CI
  needs it, in the workflow `env:`.
- Logging with each package's loguru logger
  (`from genai_template_backend.backend_settings import logger`, the same for the frontend).
- Unit tests run in parallel (pytest-xdist): no shared state between tests.
- Docs: numbered pages in `docs/developer/`, one purpose line, numbered steps, short tables, no
  long prose. Keep `properdocs.yml` nav and the README table in step.

## Required software validation

`make test-all` is the required comprehensive software check for users, developers and CI.
`make test-local` is only a focused diagnostic command. A local-only pass, integration collection,
or skipped/unavailable integration does not establish full validation. Keep coverage and artifact/runtime
checks explicit alongside software validation. Never execute live authentication/integration without
the user's authorization; if it was not authorized or services are unavailable, report full validation
as incomplete instead of claiming the change fully verified.
