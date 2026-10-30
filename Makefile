.PHONY: docker-compose docker-compose-cuda docker-compose-rebuild download-ollama-models install-backend install-backend-cuda install-dev-cuda install-frontend install-ollama install-prod install-prod-cuda test-integration-llm test-smoke-ollama
.DEFAULT_GOAL := help

# Main Makefile
# This file includes all modular makefiles from the makefiles/ directory
# Each makefile is organized by functionality for better maintainability

# Include common variables and settings
include makefiles/common.mk

# Include all modular makefiles
include makefiles/install.mk
include makefiles/check_format.mk
include makefiles/run.mk
include makefiles/test.mk
include makefiles/clean.mk
include makefiles/ci.mk
include makefiles/build.mk
include makefiles/release.mk
include makefiles/docker.mk
include makefiles/ollama.mk

.PHONY: all help

all: help
	@printf '%b\n' "${GREEN}all complete${NC}" >&2

help: ## List commands grouped by test requirements
	@awk '\
	  BEGIN { \
	    FS = ":.*## "; \
	    titles[1] = "Self-contained tests"; \
	    titles[2] = "All suites and real-service integration"; \
	    titles[3] = "Artifact smoke and hardware checks"; \
	    titles[4] = "Quality gates"; titles[5] = "Other commands" \
	  } \
	  /^[a-zA-Z0-9_.-]+:.*## / { \
	    name = $$1; group = 5; \
	    if (name ~ /^test-(local|unit|component|app|tooling|coverage|report)$$/) group = 1; \
	    else if (name ~ /^test-(all|integration)/) group = 2; \
	    else if (name ~ /^(check-image$$|image-test$$|test-smoke-|test-hardware-)/) group = 3; \
	    else if (name ~ /^(check($$|-)|pre-commit($$|-)|lint$$|format|code-quality|docs-build$$)/) group = 4; \
	    rows[group] = rows[group] sprintf("  %-34s %s\n", name, $$2) \
	  } \
	  END { \
	    for (group = 1; group <= 5; group++) \
	      if (rows[group] != "") printf "\n%s:\n%s", titles[group], rows[group] \
	  }' Makefile makefiles/*.mk
	@printf '\nRun a target with: make <target>\n'
