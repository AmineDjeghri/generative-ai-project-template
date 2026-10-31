N ?= 4
INTEGRATION_PATHS = tests/integration

.PHONY: check test-local test-all test-unit test-component test-integration test-integration-check test-integration-llm test-integration-ollama test-smoke-ollama test-hardware-cuda test-ollama test-inference-llm

check: ## Run static checks, comprehensive software validation and strict docs
	@$(MAKE) pre-commit
	@$(MAKE) test-all
	@$(MAKE) docs-build

test-local: test-unit test-component ## Run self-contained unit and UI component tests without live services

test-all: ## Run every software suite: self-contained tests, then parallel real-service integration
	$(if $(strip $(ARGS)),$(error test-all requires the full suite; use a focused target for ARGS))
	@$(MAKE) test-local
	@$(MAKE) test-integration

test-unit: ## Run settings and isolated logic tests (N=4 workers)
	@$(UV) run pytest tests/unit/backend tests/unit/tooling -m 'not integration' --numprocesses=$(N) $(ARGS)

test-component: ## Run NiceGUI component/page simulations without a browser or real backend
	@$(UV) run pytest tests/unit/frontend --numprocesses=$(N) $(ARGS)

test-integration-check: ## Collect real LLM/Ollama/API integration tests without endpoint probes
	@$(UV) run pytest $(INTEGRATION_PATHS) -m integration --collect-only -q $(ARGS)

test-integration: ## Run real LLM/Ollama/API tests in parallel (N=4); requires live services and models
	@$(UV) run python -m pytest -p scripts.integration_results --junitxml=reports/integration.xml -ra $(INTEGRATION_PATHS) -m integration --numprocesses=$(N) $(ARGS)

test-integration-llm: ## Run real inference client tests in parallel (N=4) against INFERENCE_*
	@$(UV) run python -m pytest -p scripts.integration_results --junitxml=reports/integration.xml -ra tests/integration/test_llm.py -m integration --numprocesses=$(N) $(ARGS)

test-integration-ollama: ## Run Ollama tests in parallel (N=4); requires a running server and installed model
	@$(UV) run python -m pytest -p scripts.integration_results --junitxml=reports/integration.xml -ra tests/integration/test_ollama.py -m integration --numprocesses=$(N) $(ARGS)

test-smoke-ollama: ## Warm the installed model with one bounded chat request to localhost:11434
	@curl --fail-with-body --show-error --silent --max-time 180 -X POST http://localhost:11434/api/chat -H 'Content-Type: application/json' -d '{"model": "${OLLAMA_MODEL_NAME}", "messages": [{"role": "user", "content": "Reply with only hello."}], "stream": false, "think": false, "options": {"num_predict": 16}}'

test-hardware-cuda: ## Run the CUDA hardware check explicitly (requires a CUDA device)
	@$(UV) run pytest tests/hardware/test_cuda.py -m hardware $(ARGS)

# Compatibility names; use the canonical integration and smoke commands above.
test-ollama: test-smoke-ollama
test-inference-llm: test-integration-llm
