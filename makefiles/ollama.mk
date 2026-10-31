# Ollama
OLLAMA_MODEL_NAME ?= qwen3.5:0.8b
OLLAMA_EMBEDDING_MODEL_NAME ?= all-minilm:l6-v2


######## Ollama
install-ollama: ## Install Ollama (macOS/Linux)
	@printf '%b\n' "${CYAN}=========> Installing ollama first...${NC}" >&2
	@if [ "$$(uname)" = "Darwin" ]; then \
	    echo "Detected macOS. Installing Ollama with Homebrew..."; \
	    brew install --cask ollama; \
	elif [ "$$(uname)" = "Linux" ]; then \
		echo "Detected Linux. Installing Ollama with curl..."; \
	    if command -v ollama >/dev/null 2>&1; then \
	        printf '%b\n' "${GREEN}Ollama is already installed.${NC}"; \
	    else \
	        curl -fsSL https://ollama.com/install.sh | sh; \
	    fi; \
	else \
	    printf '%b\n' "${RED}Unsupported OS. Please install Ollama manually.${NC}"; \
	    exit 1; \
	fi
	@printf '%b\n' "${GREEN}install-ollama complete${NC}" >&2



download-ollama-models: install-ollama ## Download Ollama models (LLM and embedding)
	@printf '%b\n' "${CYAN}Downloading local models :...${NC}" >&2
	@printf '%b\n' "${YELLOW}Downloading LLM model : ${OLLAMA_MODEL_NAME}...${NC}"
	@printf '%b\n' "${YELLOW}Downloading Embedding model :  ${OLLAMA_EMBEDDING_MODEL_NAME} ...${NC}"
	@bash -lc 'set -euo pipefail; \
	log=$$(mktemp); \
	nohup ollama serve > "$$log" 2>&1 & pid=$$!; \
	cleanup() { kill "$$pid" >/dev/null 2>&1 || true; rm -f "$$log"; }; \
	trap cleanup EXIT; \
	printf "%s\n" "Waiting for Ollama to be ready..."; \
	for i in $$(seq 1 30); do \
	  if curl -sf http://127.0.0.1:11434/api/tags >/dev/null; then \
	    break; \
	  fi; \
	  sleep 2; \
	  if [ "$$i" -eq 30 ]; then \
	    printf "%b\n" "${RED}Ollama did not become ready in time${NC}"; \
	    cat "$$log" || true; \
	    exit 1; \
	  fi; \
	done; \
	ollama pull "${OLLAMA_EMBEDDING_MODEL_NAME}"; \
	ollama pull "${OLLAMA_MODEL_NAME}"'
	@printf '%b\n' "${GREEN}download-ollama-models complete${NC}" >&2

run-ollama: install-ollama ## Start Ollama server
	@printf '%b\n' "${CYAN}Running ollama...${NC}" >&2
	@ollama serve
	@printf '%b\n' "${GREEN}run-ollama complete${NC}" >&2


chat-ollama: install-ollama ## Run Ollama chat with default model
	@printf '%b\n' "${CYAN}Running ollama...${NC}" >&2
	@ollama run ${OLLAMA_MODEL_NAME}
	@printf '%b\n' "${GREEN}chat-ollama complete${NC}" >&2
