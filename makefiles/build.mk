# Build and deployment targets
# This file contains targets for building packages and deploying documentation

.PHONY: build-package deploy-doc-local deploy-doc-gh

build-package: ## Build wheels & sdists for jym-backend and jym-frontend
	@echo "${YELLOW}=========> Building python packages (jym-backend, jym-frontend)...${NC}"
	@rm -rf dist
	@$(UV) build --package jym-backend --package jym-frontend
	@ls -lh dist

deploy-doc-local: ## Deploy documentation locally
	@echo "${YELLOW}Deploying documentation locally...${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs serve

deploy-doc-gh: ## Deploy documentation to GitHub Pages
	@echo "${YELLOW}Deploying documentation in github actions..${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs gh-deploy
