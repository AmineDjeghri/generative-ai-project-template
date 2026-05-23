# Testing targets
# This file contains all testing-related targets

######## Tests ########
test: ## Run all tests with pytest
    # pytest runs from the root directory
	@echo "${YELLOW}Running tests...${NC}"
	@$(UV) run pytest tests $(ARGS)

test-ollama: ## Test Ollama API endpoint
	curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{"model": "${OLLAMA_MODEL_NAME}", "prompt": "Hello", "stream": false}'

test-inference-llm: ## Test LLM inference endpoint
	# llm that generate answers (used in chat, rag and promptfoo)
	@echo "${YELLOW}=========> Testing LLM client...${NC}"
	@$(UV) run pytest tests/test_llm_endpoint.py -k test_inference_llm --disable-warnings
