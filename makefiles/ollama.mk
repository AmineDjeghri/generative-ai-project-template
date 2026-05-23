# Ollama
OLLAMA_MODEL_NAME ?= "qwen3:0.6b"
OLLAMA_EMBEDDING_MODEL_NAME ?= "all-minilm:l6-v2"


######## Ollama
install-ollama: ## Install Ollama (macOS/Linux)
	@echo "${YELLOW}=========> Installing ollama first...${NC}"
	@if [ "$$(uname)" = "Darwin" ]; then \
	    echo "Detected macOS. Installing Ollama with Homebrew..."; \
	    brew install --cask ollama; \
	elif [ "$$(uname)" = "Linux" ]; then \
		echo "Detected Linux. Installing Ollama with curl..."; \
	    if command -v ollama >/dev/null 2>&1; then \
	        echo "${GREEN}Ollama is already installed.${NC}"; \
	    else \
	        curl -fsSL https://ollama.com/install.sh | sh; \
	    fi; \
	else \
	    echo "Unsupported OS. Please install Ollama manually."; \
	    exit 1; \
	fi



download-ollama-models: install-ollama ## Download Ollama models (LLM and embedding)
	@echo "${YELLOW}Downloading local models :...${NC}"
	@echo "${YELLOW}Downloading LLM model : ${OLLAMA_MODEL_NAME}...${NC}"
	@echo "${YELLOW}Downloading Embedding model :  ${OLLAMA_EMBEDDING_MODEL_NAME} ...${NC}"
	@bash -lc 'set -euo pipefail; \
	nohup ollama serve > /tmp/ollama.log 2>&1 & pid=$$!; \
	trap "kill $$pid >/dev/null 2>&1 || true" EXIT; \
	printf "%s\n" "Waiting for Ollama to be ready..."; \
	for i in $$(seq 1 30); do \
	  if curl -sf http://127.0.0.1:11434/api/tags >/dev/null; then \
	    break; \
	  fi; \
	  sleep 2; \
	  if [ "$$i" -eq 30 ]; then \
	    echo "Ollama did not become ready in time"; \
	    cat /tmp/ollama.log || true; \
	    exit 1; \
	  fi; \
	done; \
	ollama pull "${OLLAMA_EMBEDDING_MODEL_NAME}"; \
	ollama pull "${OLLAMA_MODEL_NAME}"'

run-ollama: install-ollama ## Start Ollama server
	@echo "${YELLOW}Running ollama...${NC}"
	@ollama serve


chat-ollama: install-ollama ## Run Ollama chat with default model
	@echo "${YELLOW}Running ollama...${NC}"
	@ollama run ${OLLAMA_MODEL_NAME}
