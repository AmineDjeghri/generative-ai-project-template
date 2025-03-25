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

install-prod:install-uv
	@echo "${YELLOW}=========> Installing dependencies...${NC}"
	@$(UV) sync --no-group dev --no-group docs
	@echo "${GREEN}Dependencies installed.${NC}"

install-dev:install-uv
	@echo "${YELLOW}=========> Installing dependencies...\n  \
	 Development dependencies (dev & docs) will be installed by default in install-dev.${NC}"
	@$(UV) sync
	@echo "${GREEN}Dependencies installed.${NC}"

STREAMLIT_PORT ?= 8501
run-frontend:
	@echo "Running frontend"
	cd src; $(UV) run streamlit run main_frontend.py --server.port $(STREAMLIT_PORT) --server.headless True;

run-backend:
	@echo "Running backend"
	cd src; $(UV) run main_backend.py;

run-app:
	make run-frontend run-backend -j2

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
install-ollama:
	@echo "${YELLOW}=========> Installing ollama first...${NC}"
	@if [ "$$(uname)" = "Darwin" ]; then \
	    echo "Detected macOS. Installing Ollama with Homebrew..."; \
	    brew install --force --cask ollama; \
	elif [ "$$(uname)" = "Linux" ]; then \
	    echo "Detected Linux. Installing Ollama with curl..."; \
	    curl -fsSL https://ollama.com/install.sh | sh; \
	else \
	    echo "Unsupported OS. Please install Ollama manually."; \
	    exit 1; \
	fi

#check-ollama-running:
#	@echo "${YELLOW}Checking if Ollama server is running...${NC}"
#	@if ! nc -z 127.0.0.1 11434; then \
#		echo "${YELLOW}Ollama server is not running. Starting it now...${NC}"; \
#		$(MAKE) run-ollama & \
#		sleep 5; \
#	fi

run-ollama:
	@echo "${YELLOW}Running Ollama...${NC}"
	@ollama serve &
	@sleep 5
	@echo "${GREEN}Ollama server is running in background.${NC}"

download-ollama-model:
	@echo "${YELLOW}Downloading local model ${OLLAMA_MODEL_NAME} and ${OLLAMA_EMBEDDING_MODEL_NAME}...${NC}"
	@ollama pull ${OLLAMA_EMBEDDING_MODEL_NAME}
	@ollama pull ${OLLAMA_MODEL_NAME}


chat-ollama:
	@echo "${YELLOW}Running ollama...${NC}"
	@ollama run ${OLLAMA_MODEL_NAME}

######## Tests ########
test:
    # pytest runs from the root directory
	@echo "${YELLOW}Running tests...${NC}"
	@$(UV) run pytest tests

test-ollama:
	curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{"model": "phi3:3.8b-mini-4k-instruct-q4_K_M", "prompt": "Hello", "stream": false}'

test-inference-llm:
	# llm that generate answers (used in chat, rag and promptfoo)
	@echo "${YELLOW}=========> Testing LLM client...${NC}"
	@$(UV) run pytest tests/test_llm_endpoint.py -k test_inference_llm --disable-warnings


run-langfuse:
	@echo "${YELLOW}Running langfuse...${NC}"
	@if [ "$$(uname)" = "Darwin" ]; then \
	    echo "Detected macOS running postgresql with Homebrew..."; \
	    colima start
	    brew services start postgresql@17; \

	elif [ "$$(uname)" = "Linux" ]; then \
	    echo "Detected Linux running postgresql with systemctl..."; \
	else \
	    echo "Unsupported OS. Please start postgres manually."; \
	    exit 1; \
	fi


########### Docker & deployment
CONTAINER_NAME = generativr-ai-project-template
export PROJECT_ROOT = $(shell pwd)
docker-build:
	@echo "${YELLOW}Building docker image...${NC}"
	docker build -t $(CONTAINER_NAME) --progress=plain .
docker-prod: docker-build
	@echo "${YELLOW}Running docker for production...${NC}"
	docker run -it --rm --name $(CONTAINER_NAME)-prod $(CONTAINER_NAME) /bin/bash

# Developing in a container
docker-dev: docker-build
	@echo "${YELLOW}Running docker for development...${NC}"
	# Docker replaces the contents of the /app directory when you mount a project directory
	# need fix :  the .venv directory is unfortunately not retained in the container ( we need to solve it to retain it)
	docker run -it --rm -v $(PROJECT_ROOT):/app -v /app/.venv --name $(CONTAINER_NAME)-dev $(CONTAINER_NAME) /bin/bash

# run docker-compose
docker-compose:
	@echo "${YELLOW}Running docker-compose...${NC}"
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
