.PHONY: install-ollama download-ollama-models
install-ollama: ## Install Ollama
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

download-ollama-models: install-ollama ## Download Ollama models
	@echo "Starting Ollama in the background..."
	@make run-ollama &
	@sleep 5
	@echo "${YELLOW}Downloading local models :...${NC}"
	@echo "${YELLOW}Downloading LLM model : ${OLLAMA_MODEL_NAME}...${NC}"
	@echo "${YELLOW}Downloading Embedding model :  ${OLLAMA_EMBEDDING_MODEL_NAME} ...${NC}"
	@ollama pull ${OLLAMA_EMBEDDING_MODEL_NAME}
	@ollama pull ${OLLAMA_MODEL_NAME}
