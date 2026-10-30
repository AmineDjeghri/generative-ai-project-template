########### Docker & deployment
docker-compose: ## Run docker-compose services
	@printf '%b\n' "${CYAN}Running docker-compose...${NC}" >&2
	@docker-compose up
	@printf '%b\n' "${GREEN}docker-compose complete${NC}" >&2

docker-compose-cuda: ## Run docker-compose with CUDA support
	@printf '%b\n' "${CYAN}Running docker-compose...${NC}" >&2
	@docker-compose -f docker-compose-cuda.yml up
	@printf '%b\n' "${GREEN}docker-compose-cuda complete${NC}" >&2

docker-compose-rebuild: ## Rebuild and run docker-compose images
	@printf '%b\n' "${CYAN}Running docker-compose dev mode (building images first)...${NC}" >&2
	@docker-compose up --build
	@printf '%b\n' "${GREEN}docker-compose-rebuild complete${NC}" >&2
