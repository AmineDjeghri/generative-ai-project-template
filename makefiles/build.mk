# Build and deployment targets
# This file contains targets for building, Docker, and deploying documentation

.PHONY: docker-compose docker-compose-cuda docker-compose-rebuild docker-compose-cuda-rebuild deploy-doc-local deploy-doc-gh

docker-compose: ## Run docker-compose
	@echo "${YELLOW}Running docker-compose...${NC}"
	docker-compose up

docker-compose-cuda: ## Run docker-compose with CUDA support
	@echo "${YELLOW}Running docker-compose...${NC}"
	docker-compose -f docker-compose-cuda.yml up

docker-compose-rebuild: ## Run docker-compose with rebuild
	@echo "${YELLOW}Running docker-compose dev mode (building images first)...${NC}"
	docker-compose up --build

docker-compose-cuda-rebuild: ## Run docker-compose CUDA with rebuild
	@echo "${YELLOW}Running docker-compose CUDA dev mode (building images first)...${NC}"
	docker-compose -f docker-compose-cuda.yml up --build

deploy-doc-local: ## Deploy documentation locally
	@echo "${YELLOW}Deploying documentation locally...${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs serve

deploy-doc-gh: ## Deploy documentation to GitHub Pages
	@echo "${YELLOW}Deploying documentation in github actions..${NC}"
	@$(UV) run mkdocs build && $(UV) run mkdocs gh-deploy
