########### Docker & deployment
docker-compose: ## Run docker-compose services
	@echo "${YELLOW}Running docker-compose...${NC}"
	docker-compose up

docker-compose-cuda: ## Run docker-compose with CUDA support
	@echo "${YELLOW}Running docker-compose...${NC}"
	docker-compose -f docker-compose-cuda.yml up

docker-compose-rebuild: ## Rebuild and run docker-compose images
	@echo "${YELLOW}Running docker-compose dev mode (building images first)...${NC}"
	docker-compose up --build
