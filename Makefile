ENV_FILE_PATH := .env
-include $(ENV_FILE_PATH) # keep the '-' to ignore this file if it doesn't exist.(Used in gitlab ci)

# Colors
GREEN=\033[0;32m
YELLOW=\033[0;33m
NC=\033[0m

UV := "$$HOME/.local/bin/uv" # keep the quotes incase the path contains spaces

# installation
install-uv:
	@echo "${YELLOW}=========> installing uv ${NC}"
	@if [ -f $(UV) ]; then \
		echo "${GREEN}uv exists at $(UV) ${NC}"; \
		$(UV) self update; \
	else \
	     echo "${YELLOW}Installing uv${NC}"; \
		 curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$$HOME/.local/bin" sh ; \
	fi

install-dev:
	@echo "${YELLOW}=========> Installing dependencies...\n  \
	 Development dependencies (dev & docs) will be installed by default in install-dev.${NC}"
	@$(UV) sync --all-packages --extra cpu
	@echo "${GREEN}Dependencies installed.${NC}"

install-dev-cuda:
	@echo "${YELLOW}=========> Installing dependencies...\n  \
	 Development dependencies (dev & docs) will be installed by default in install-dev.${NC}"
	@$(UV) sync --all-packages --extra cuda
	@echo "${GREEN}Dependencies installed.${NC}"

install-frontend:
	@echo "${YELLOW}=========> Installing frontend dependencies...${NC}"
	@cd frontend && $(UV) sync
	@echo "${GREEN}Dependencies installed.${NC}"

install-backend:
	@echo "${YELLOW}=========> Installing backend dependencies...${NC}"
	@cd backend && $(UV) sync --extra cpu
	@echo "${GREEN}Dependencies installed.${NC}"

install-backend-cuda:
	@echo "${YELLOW}=========> Installing backend dependencies...${NC}"
	@cd backend && $(UV) sync --extra cuda
	@echo "${GREEN}Dependencies installed.${NC}"

run-frontend:
	@echo "${YELLOW}Running frontend...${NC}"
	$(UV) run --project frontend frontend/src/genai_template_frontend/main.py

run-backend:
	@echo "${YELLOW}Running backend...${NC}"
	$(UV) run --no-sync --project backend backend/src/genai_template_backend/app.py


run-frontend-backend:
	make run-frontend run-backend  -j2
run-app:
	make run-ollama run-frontend-backend  -j2


#----------------- pre-commit -----------------
pre-commit-install:
	@echo "${YELLOW}=========> Installing pre-commit...${NC}"
	$(UV) run pre-commit install

pre-commit:pre-commit-install
	@echo "${YELLOW}=========> Running pre-commit...${NC}"
	$(UV) run pre-commit run --all-files


####### local CI / CD ########
# uv caching :
prune-uv:
	@echo "${YELLOW}=========> Prune uv cache...${NC}"
	@$(UV) cache prune
# clean uv caching
clean-uv-cache:
	@echo "${YELLOW}=========> Cleaning uv cache...${NC}"
	@$(UV) cache clean

# Github actions locally
install-act:
	@echo "${YELLOW}=========> Installing github actions act to test locally${NC}"
	curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | bash
	@echo -e "${YELLOW}Github act version is :"
	@./bin/act --version

act:
	@echo "${YELLOW}Running Github Actions locally...${NC}"
	@./bin/act --env-file .env --secret-file .secrets


# clear GitHub and Gitlab CI local caches
clear_ci_cache:
	@echo "${YELLOW}Clearing CI cache...${NC}"
	@echo "${YELLOW}Clearing Github ACT local cache...${NC}"
	rm -rf ~/.cache/act ~/.cache/actcache

######## Ollama

OLLAMA_MODEL_NAME ?= "qwen3:0.6b"
OLLAMA_EMBEDDING_MODEL_NAME ?= "all-minilm:l6-v2"
######## Ollama
install-ollama:
	@echo "${YELLOW}=========> Installing ollama first...${NC}"
	@if [ "$$(uname)" = "Darwin" ]; then \
	    echo "Detected macOS. Installing Ollama with Homebrew..."; \
	    brew install --cask ollama; \
	elif [ "$$(uname)" = "Linux" ]; then \
		echo "Detected Linux. Installing Ollama with curl..."; \
	    if command -v ollama >/dev/null 2>&1; then \
	        echo "${GREEN}Ollama is already installed.${NC}"; \
	    else \
	        curl -fsSL https://ollama.com/install.sh | sh; \
	    fi; \
	else \
	    echo "Unsupported OS. Please install Ollama manually."; \
	    exit 1; \
	fi



download-ollama-models: install-ollama
	@echo "Starting Ollama in the background..."
	@make run-ollama &
	@sleep 5
	@echo "${YELLOW}Downloading local models :...${NC}"
	@echo "${YELLOW}Downloading LLM model : ${OLLAMA_MODEL_NAME}...${NC}"
	@echo "${YELLOW}Downloading Embedding model :  ${OLLAMA_EMBEDDING_MODEL_NAME} ...${NC}"
	@ollama pull ${OLLAMA_EMBEDDING_MODEL_NAME}
	@ollama pull ${OLLAMA_MODEL_NAME}

run-ollama:
	@echo "${YELLOW}Running ollama...${NC}"
	@ollama serve


chat-ollama:
	@echo "${YELLOW}Running ollama...${NC}"
	@ollama run ${OLLAMA_MODEL_NAME}

######## Tests ########
test:
    # pytest runs from the root directory
	@echo "${YELLOW}Running tests...${NC}"
	@$(UV) run pytest tests $(ARGS)

test-ollama:
	curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{"model": "${OLLAMA_MODEL_NAME}", "prompt": "Hello", "stream": false}'

test-inference-llm:
	# llm that generate answers (used in chat, rag and promptfoo)
	@echo "${YELLOW}=========> Testing LLM client...${NC}"
	@$(UV) run pytest tests/test_llm.py -k test_inference_llm_raw --disable-warnings


########### Docker & deployment
docker-compose:
	@echo "${YELLOW}Running docker-compose...${NC}"
	docker-compose up

docker-compose-cuda:
	@echo "${YELLOW}Running docker-compose...${NC}"
	docker-compose -f docker-compose-cuda.yml up

docker-compose-rebuild:
	@echo "${YELLOW}Running docker-compose dev mode (building images first)...${NC}"
	docker-compose up --build

# This build the documentation based on current code 'src/' and 'docs/' directories
# This is to run the documentation locally to see how it looks
deploy-doc-local:
	@echo "${YELLOW}Deploying documentation locally...${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs serve

# Deploy it to the gh-pages branch in your GitHub repository (you need to setup the GitHub Pages in github settings to use the gh-pages branch)
deploy-doc-gh:
	@echo "${YELLOW}Deploying documentation in github actions..${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs gh-deploy
