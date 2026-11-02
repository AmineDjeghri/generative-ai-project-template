# Check Format targets
# This file contains targets for checking code format

.PHONY: pre-commit-install _pre-commit-install-auto pre-commit-status pre-commit lint format

pre-commit-install: ## Install the git hooks (checks on commit, commit message format)
	@printf '%b\n' "${CYAN}=========> Installing pre-commit...${NC}" >&2
	@$(UV) run pre-commit install --hook-type pre-commit --hook-type commit-msg
	@printf '%b\n' "${GREEN}pre-commit-install complete${NC}" >&2

_pre-commit-install-auto: # Used by install-dev: install the Git hooks in a real checkout only (not in CI or Docker)
	@if [ -z "$$CI" ] && git rev-parse --git-dir >/dev/null 2>&1; then \
	  $(MAKE) --no-print-directory pre-commit-install || printf '%b\n' "${YELLOW}Git hooks not installed (see the error above); fix it, then run: make pre-commit-install${NC}"; \
	fi

pre-commit-status: ## Warn when the Git hooks are not installed (non-fatal; skipped in CI)
	@if [ -z "$$CI" ] && git rev-parse --git-dir >/dev/null 2>&1; then \
	  hooks=$$(git rev-parse --git-path hooks); \
	  if [ -f "$$hooks/pre-commit" ] && [ -f "$$hooks/commit-msg" ]; then \
	    printf '%b\n' "${GREEN}Git hooks installed.${NC}"; \
	  else \
	    printf '%b\n' "${YELLOW}WARNING: Git hooks are not installed, so commits and commit messages go unchecked. Run: make pre-commit-install${NC}"; \
	  fi; \
	fi

pre-commit: ## Run pre-commit checks (install hooks separately, once)
	@printf '%b\n' "${CYAN}=========> Running pre-commit...${NC}" >&2
	@$(UV) run pre-commit run $(if $(strip $(FILES)),--files $(FILES),--all-files) $(ARGS)
	@printf '%b\n' "${GREEN}pre-commit complete${NC}" >&2

lint: ## Lint code with Ruff
	@printf '%b\n' "${CYAN}Linting code...${NC}" >&2
	@$(UV) run ruff check .
	@printf '%b\n' "${GREEN}lint complete${NC}" >&2

format: ## Format code with Ruff
	@printf '%b\n' "${CYAN}Formatting code...${NC}" >&2
	@$(UV) run ruff format .
	@printf '%b\n' "${GREEN}format complete${NC}" >&2
