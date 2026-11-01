# GPU inference runs in Ollama; the Python applications use the same images.
.PHONY: docker-compose docker-compose-cuda docker-compose-rebuild docker-compose-cuda-rebuild

docker-compose: ## Build and run the application stack
	@$(UV) run --no-sync python scripts/check_config.py docker
	@docker compose up --build

docker-compose-cuda: ## Build and run with NVIDIA GPU access for Ollama
	@$(UV) run --no-sync python scripts/check_config.py docker --cuda
	@docker compose -f docker-compose.yml -f docker-compose-cuda.yml up --build

docker-compose-rebuild: docker-compose ## Build and run the application stack

docker-compose-cuda-rebuild: docker-compose-cuda ## Build and run the GPU application stack
