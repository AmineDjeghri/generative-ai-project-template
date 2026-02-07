# Generative AI Project Template - Makefile
# This is the main entry point that includes all modular makefiles
#
# Usage: make help

# Include common variables first (colors, UV path, etc.)
include makefiles/common.mk

# Include all modular makefiles
include makefiles/install.mk
include makefiles/dev.mk
include makefiles/test.mk
include makefiles/build.mk
include makefiles/ci.mk
include makefiles/clean.mk
include makefiles/ollama.mk

# Default target
.DEFAULT_GOAL := help

# Help target - displays all available targets with descriptions
.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "Generative AI Project Template - Available Commands"
	@echo "===================================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
	@echo ""
