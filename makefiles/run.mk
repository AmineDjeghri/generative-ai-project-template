# Run targets
# This file contains targets for running the application

.PHONY: run-frontend run-backend run-frontend-backend run-app run-app-with-ollama run-ollama chat-ollama pre-commit-install pre-commit

run-frontend: ## Run the frontend (NiceGUI)
	@printf '%b\n' "${CYAN}Running frontend...${NC}" >&2
	@$(UV) run --no-sync --project frontend frontend/src/genai_template_frontend/main.py
	@printf '%b\n' "${GREEN}run-frontend complete${NC}" >&2

run-backend: ## Run the backend (FastAPI)
	@printf '%b\n' "${CYAN}Running backend...${NC}" >&2
	@$(UV) run --no-sync --project backend backend/src/genai_template_backend/app.py
	@printf '%b\n' "${GREEN}run-backend complete${NC}" >&2

run-frontend-backend: ## Run frontend and backend together
	@printf '%b\n' "${CYAN}=========> run-frontend-backend...${NC}" >&2
	@$(MAKE) run-frontend run-backend -j2
	@printf '%b\n' "${GREEN}run-frontend-backend complete${NC}" >&2

run-app: ## Check configuration, then run backend and frontend
	@$(UV) run --no-sync python scripts/check_config.py local
	@$(MAKE) run-frontend-backend

run-app-with-ollama: ## Download missing local models, then run Ollama and the application
	@$(UV) run --no-sync python scripts/check_config.py local-ollama --model "$(OLLAMA_MODEL_NAME)" --embedding-model "$(OLLAMA_EMBEDDING_MODEL_NAME)"
	@set -e; \
	pid=; \
	trap 'if [ -n "$$pid" ]; then kill "$$pid" 2>/dev/null || true; wait "$$pid" 2>/dev/null || true; fi' EXIT; \
	trap 'exit 130' INT; trap 'exit 143' TERM; \
	if ! ollama list >/dev/null 2>&1; then \
	    ollama serve & pid=$$!; \
	fi; \
	for attempt in $$(seq 1 30); do \
	    if ollama list >/dev/null 2>&1; then break; fi; \
	    [ "$$attempt" -lt 30 ] || { echo "Ollama did not become ready."; exit 1; }; \
	    sleep 1; \
	done; \
	$(MAKE) download-ollama-models; \
	$(MAKE) run-frontend-backend
