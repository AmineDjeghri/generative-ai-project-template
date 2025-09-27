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

######## Tests ########
test:
    # pytest runs from the root directory
	@echo "${YELLOW}Running tests...${NC}"
	@$(UV) run pytest tests $(ARGS)


# This build the documentation based on current code 'src/' and 'docs/' directories
# This is to run the documentation locally to see how it looks
deploy-doc-local:
	@echo "${YELLOW}Deploying documentation locally...${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs serve

# Deploy it to the gh-pages branch in your GitHub repository (you need to setup the GitHub Pages in github settings to use the gh-pages branch)
deploy-doc-gh:
	@echo "${YELLOW}Deploying documentation in github actions..${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs gh-deploy

# ===== Frontend (React) Local Development =====
frontend-install:
	@echo "${YELLOW}Installing frontend node modules with npm...${NC}"
	cd frontend && npm install
	@echo "${GREEN}Frontend node modules installed.${NC}"

frontend-start:
	@echo "${YELLOW}Starting frontend React app (npm start)...${NC}"
	cd frontend && npm start

# ===== API (FastAPI) Local Development =====
api-install:
	@echo "${YELLOW}Installing API Python dependencies...${NC}"
	cd api && uv sync
	@echo "${GREEN}API dependencies installed.${NC}"

api-start:
	@echo "${YELLOW}Starting API with Uvicorn...${NC}"
	cd api && uvicorn main:app --reload


# ===== Tryon API (FastAPI) Local Development =====
tryon-api-start:
	@echo "${YELLOW}Starting Tryon API with Uvicorn...${NC}"
	$(UV) run python tryon-api/src/tryon_api/app.py

# ===== Tryon UI (NiceGUI standalone) =====
tryon-ui-start:
	@echo "${YELLOW}Starting Tryon UI (NiceGUI standalone)...${NC}"
	$(UV) run python tryon-api/src/tryon_api/ui.py
