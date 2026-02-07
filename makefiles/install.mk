# Installation targets
# This file contains all installation-related targets

.PHONY: install-uv install-dev install-dev-cuda install-frontend install-backend install-backend-cuda

install-uv: ## Install uv
	@echo "${YELLOW}=========> installing uv ${NC}"
ifeq ($(OS),Windows_NT)
	@powershell -NoProfile -ExecutionPolicy Bypass -Command "\
		$$ErrorActionPreference = 'Stop'; \
		$$uv = Get-Command uv -ErrorAction SilentlyContinue; \
		if ($$uv) { \
		  Write-Host 'uv exists at' $$uv.Source -ForegroundColor Green; \
		  uv self update; \
		} else { \
		  Write-Host 'Installing uv' -ForegroundColor Yellow; \
		  irm https://astral.sh/uv/install.ps1 | iex; \
		}"
else
	@if command -v uv >/dev/null 2>&1; then \
		echo "${GREEN}uv exists at $$(command -v uv) ${NC}"; \
		$(UV) self update; \
	else \
		echo "${YELLOW}Installing uv${NC}"; \
		curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$$HOME/.local/bin" sh; \
	fi
endif

install-dev: ## Install all dev dependencies (CPU)
	@echo "${YELLOW}=========> Installing dependencies...\n  \
	 Development dependencies (dev & docs) will be installed by default in install-dev.${NC}"
	@$(UV) sync --all-packages --extra cpu
	@echo "${GREEN}Dependencies installed.${NC}"

install-dev-cuda: ## Install all dev dependencies (CUDA)
	@echo "${YELLOW}=========> Installing dependencies...\n  \
	 Development dependencies (dev & docs) will be installed by default in install-dev.${NC}"
	@$(UV) sync --all-packages --extra cuda
	@echo "${GREEN}Dependencies installed.${NC}"

install-frontend: ## Install frontend dependencies
	@echo "${YELLOW}=========> Installing frontend dependencies...${NC}"
	@cd frontend && $(UV) sync
	@echo "${GREEN}Dependencies installed.${NC}"

install-backend: ## Install backend dependencies (CPU)
	@echo "${YELLOW}=========> Installing backend dependencies...${NC}"
	@cd backend && $(UV) sync --extra cpu
	@echo "${GREEN}Dependencies installed.${NC}"

install-backend-cuda: ## Install backend dependencies (CUDA)
	@echo "${YELLOW}=========> Installing backend dependencies...${NC}"
	@cd backend && $(UV) sync --extra cuda
	@echo "${GREEN}Dependencies installed.${NC}"
