# Testing targets
# This file contains all testing-related targets

N ?= 4

######## Tests ########
test: ## Run all tests with pytest (non-integration parallel via pytest-xdist, integration serial). Usage: make test [N=<num_workers>] (default: 4)
	# pytest runs from the root directory
	@echo "${YELLOW}Running tests with $(N) worker(s)...${NC}"
	@$(UV) run pytest tests -m "not integration" --numprocesses=$(N) $(ARGS)
	@echo "${YELLOW}Running integration tests (serial — live external services)...${NC}"
	@$(UV) run pytest tests -m integration $(ARGS)

test-ollama: ## Test Ollama API endpoint
	curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{"model": "${OLLAMA_MODEL_NAME}", "prompt": "Hello", "stream": false}'

test-inference-llm: ## Test LLM inference endpoint
	# llm that generate answers (used in chat, rag and promptfoo)
	@echo "${YELLOW}=========> Testing LLM client...${NC}"
	@$(UV) run pytest tests/test_llm.py -k test_inference_llm --disable-warnings
