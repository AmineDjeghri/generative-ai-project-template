# Run targets
# This file contains targets for running the application

.PHONY: run-frontend run-backend run-frontend-backend run-app run-ollama chat-ollama pre-commit-install pre-commit

run-frontend: ## Run the frontend (NiceGUI)
	@echo "${YELLOW}Running frontend...${NC}"
	$(UV) run --project frontend frontend/src/genai_template_frontend/main.py

run-backend: ## Run the backend (FastAPI)
	@echo "${YELLOW}Running backend...${NC}"
	$(UV) run --no-sync --project backend backend/src/genai_template_backend/app.py

run-frontend-backend: ## Run frontend and backend together
	make run-frontend run-backend -j2

run-app: ## Run the full application (Ollama + frontend + backend)
	make run-ollama run-frontend-backend -j2
