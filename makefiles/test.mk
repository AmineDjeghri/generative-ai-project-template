# Testing targets
# This file contains all testing-related targets

.PHONY: test test-ollama test-inference-llm

test: ## Run tests with pytest
	@echo "${YELLOW}Running tests...${NC}"
	@$(UV) run pytest tests $(ARGS)

test-ollama: ## Test Ollama connection
	curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{"model": "${OLLAMA_MODEL_NAME}", "prompt": "Hello", "stream": false}'

test-inference-llm: ## Test LLM inference
	@echo "${YELLOW}=========> Testing LLM client...${NC}"
	@$(UV) run pytest tests/test_llm.py -k test_inference_llm_raw --disable-warnings
