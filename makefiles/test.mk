N ?= 4
INTEGRATION_PATHS = tests/test_llm.py tests/test_ollama_endpoint.py tests/api

.PHONY: check test-local test-all test-unit test-component test-integration test-integration-check test-integration-llm test-integration-ollama test-smoke-ollama test-hardware-cuda test-ollama test-inference-llm

check: ## Run static checks, comprehensive software validation and strict docs
	@$(MAKE) pre-commit
	@$(MAKE) test-all
	@$(MAKE) docs-build

test-local: test-unit test-component ## Run self-contained unit and UI component tests without live services

test-all: ## Run every software suite: self-contained tests, then real-service integration serially
	$(if $(strip $(ARGS)),$(error test-all requires the full suite; use a focused target for ARGS))
	@$(MAKE) test-local
	@$(MAKE) test-integration

test-unit: ## Run settings and isolated logic tests (N=4 workers)
	@$(UV) run pytest tests --ignore=tests/frontend --ignore=tests/api --ignore=tests/test_llm.py --ignore=tests/test_ollama_endpoint.py --ignore=tests/test_cuda.py -m 'not integration' --numprocesses=$(N) $(ARGS)

test-component: ## Run NiceGUI component/page simulations without a browser or real backend
	@$(UV) run pytest tests/frontend --numprocesses=$(N) $(ARGS)

test-integration-check: ## Collect real LLM/Ollama/API integration tests without endpoint probes
	@$(UV) run pytest $(INTEGRATION_PATHS) -m integration --collect-only -q $(ARGS)

test-integration: ## Run real LLM/Ollama/API tests serially; requires configured live services
	@$(UV) run python -m pytest -p scripts.integration_results --junitxml=reports/integration.xml -ra $(INTEGRATION_PATHS) -m integration $(ARGS)

test-integration-llm: ## Run real inference client tests against the configured INFERENCE_* endpoint
	@$(UV) run python -m pytest -p scripts.integration_results --junitxml=reports/integration.xml -ra tests/test_llm.py -m integration $(ARGS)

test-integration-ollama: ## Run the Ollama pytest suite against a running server and configured model
	@$(UV) run python -m pytest -p scripts.integration_results --junitxml=reports/integration.xml -ra tests/test_ollama_endpoint.py -m integration $(ARGS)

test-smoke-ollama: ## Make one generation request to localhost:11434 (requires Ollama and a model)
	@curl --fail-with-body --show-error --silent -X POST http://localhost:11434/api/generate -H 'Content-Type: application/json' -d '{"model": "${OLLAMA_MODEL_NAME}", "prompt": "Hello", "stream": false}'

test-hardware-cuda: ## Run the CUDA hardware check explicitly (requires a CUDA device)
	@$(UV) run pytest tests/test_cuda.py -m hardware $(ARGS)

# Compatibility names; use the canonical integration and smoke commands above.
test-ollama: test-smoke-ollama
test-inference-llm: test-integration-llm
