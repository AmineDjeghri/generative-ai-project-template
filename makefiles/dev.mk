# Development targets
# This file contains targets for running and developing the application

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

run-ollama: ## Run Ollama server
	@echo "${YELLOW}Running ollama...${NC}"
	@ollama serve

chat-ollama: ## Chat with Ollama model
	@echo "${YELLOW}Running ollama...${NC}"
	@ollama run ${OLLAMA_MODEL_NAME}

pre-commit-install: ## Install pre-commit hooks
	@echo "${YELLOW}=========> Installing pre-commit...${NC}"
	$(UV) run pre-commit install

pre-commit: pre-commit-install ## Run pre-commit on all files
	@echo "${YELLOW}=========> Running pre-commit...${NC}"
	$(UV) run pre-commit run --all-files
