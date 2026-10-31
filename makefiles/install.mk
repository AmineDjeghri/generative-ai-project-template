# Installation targets
# This file contains all installation-related targets

.PHONY: install-uv install-dev

install-uv: ## Install uv
	@printf '%b\n' "${CYAN}=========> installing uv ${NC}" >&2
ifeq ($(OS),Windows_NT)
	@powershell -NoProfile -ExecutionPolicy Bypass -Command "\
		$$ErrorActionPreference = 'Stop'; \
		$$uv = Get-Command uv -ErrorAction SilentlyContinue; \
		if ($$uv) { \
		  Write-Host 'uv exists at' $$uv.Source -ForegroundColor Green; \
		  uv --version; \
		} else { \
		  Write-Host 'Installing uv' -ForegroundColor Yellow; \
		  irm https://astral.sh/uv/install.ps1 | iex; \
		}"
else
	@if command -v uv >/dev/null 2>&1; then \
		printf '%b\n' "${GREEN}uv exists at $$(command -v uv) ${NC}"; \
		$(UV) --version; \
	else \
		printf '%b\n' "${YELLOW}Installing uv${NC}"; \
		curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$$HOME/.local/bin" sh; \
	fi
endif
	@printf '%b\n' "${GREEN}install-uv complete${NC}" >&2

install-dev: ## Install all dev dependencies (CPU)
	@printf '%b\n' "${CYAN}=========> install-dev...${NC}" >&2
	@printf '%b\n' "${YELLOW}=========> Installing dependencies...\n  \
	 Development dependencies (dev & docs) will be installed by default in install-dev.${NC}"
	@$(UV) sync --all-packages --all-groups --extra cpu
	@printf '%b\n' "${GREEN}Dependencies installed.${NC}"
	@printf '%b\n' "${GREEN}install-dev complete${NC}" >&2

install-dev-cuda: ## Install all dev dependencies (CUDA)
	@printf '%b\n' "${CYAN}=========> install-dev-cuda...${NC}" >&2
	@printf '%b\n' "${YELLOW}=========> Installing dependencies...\n  \
	 Development dependencies (dev & docs) will be installed by default in install-dev.${NC}"
	@$(UV) sync --all-packages --all-groups --extra cuda
	@printf '%b\n' "${GREEN}Dependencies installed.${NC}"
	@printf '%b\n' "${GREEN}install-dev-cuda complete${NC}" >&2

install-prod: ## Install prod dependencies only
	@printf '%b\n' "${CYAN}=========> Installing dependencies (PROD)...${NC}" >&2
	@$(UV) sync --all-packages --extra cpu
	@printf '%b\n' "${GREEN}Dependencies installed.${NC}"
	@printf '%b\n' "${GREEN}install-prod complete${NC}" >&2

install-prod-cuda: ## Install prod dependencies only (CUDA)
	@printf '%b\n' "${CYAN}=========> Installing dependencies (PROD)...${NC}" >&2
	@$(UV) sync --all-packages --extra cuda
	@printf '%b\n' "${GREEN}Dependencies installed.${NC}"
	@printf '%b\n' "${GREEN}install-prod-cuda complete${NC}" >&2

install-frontend: ## Install frontend dependencies
	@printf '%b\n' "${CYAN}=========> Installing frontend dependencies...${NC}" >&2
	@cd frontend && $(UV) sync
	@printf '%b\n' "${GREEN}Dependencies installed.${NC}"
	@printf '%b\n' "${GREEN}install-frontend complete${NC}" >&2

install-backend: ## Install backend dependencies (CPU)
	@printf '%b\n' "${CYAN}=========> Installing backend dependencies...${NC}" >&2
	@cd backend && $(UV) sync --extra cpu
	@printf '%b\n' "${GREEN}Dependencies installed.${NC}"
	@printf '%b\n' "${GREEN}install-backend complete${NC}" >&2

install-backend-cuda: ## Install backend dependencies (CUDA)
	@printf '%b\n' "${CYAN}=========> Installing backend dependencies...${NC}" >&2
	@cd backend && $(UV) sync --extra cuda
	@printf '%b\n' "${GREEN}Dependencies installed.${NC}"
	@printf '%b\n' "${GREEN}install-backend-cuda complete${NC}" >&2
