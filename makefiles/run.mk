# Run targets
# This file contains targets for running the application

.PHONY: run-frontend run-backend run-frontend-backend run-app run-ollama chat-ollama pre-commit-install pre-commit

run-frontend: ## Run the frontend (NiceGUI)
	@printf '%b\n' "${CYAN}Running frontend...${NC}" >&2
	@$(UV) run --project frontend frontend/src/genai_template_frontend/main.py
	@printf '%b\n' "${GREEN}run-frontend complete${NC}" >&2

run-backend: ## Run the backend (FastAPI)
	@printf '%b\n' "${CYAN}Running backend...${NC}" >&2
	@$(UV) run --no-sync --project backend backend/src/genai_template_backend/app.py
	@printf '%b\n' "${GREEN}run-backend complete${NC}" >&2

run-frontend-backend: ## Run frontend and backend together
	@printf '%b\n' "${CYAN}=========> run-frontend-backend...${NC}" >&2
	@make run-frontend run-backend -j2
	@printf '%b\n' "${GREEN}run-frontend-backend complete${NC}" >&2

run-app: ## Run the full application (Ollama + frontend + backend)
	@printf '%b\n' "${CYAN}=========> run-app...${NC}" >&2
	@make run-ollama run-frontend-backend -j2
	@printf '%b\n' "${GREEN}run-app complete${NC}" >&2
