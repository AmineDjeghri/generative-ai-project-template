# Common variables and settings
# This file contains shared variables used across all makefiles

TEST_DIR = tests

ENV_FILE_PATH := .env
-include $(ENV_FILE_PATH) # keep the '-' to ignore this file if it doesn't exist.(Used in gitlab ci)

# Colors
GREEN=\033[0;32m
YELLOW=\033[0;33m
NC=\033[0m

# UV path detection
ifeq ($(OS),Windows_NT)
UV := uv
else
UV := "$$HOME/.local/bin/uv" # keep the quotes incase the path contains spaces
endif

# Ollama models
OLLAMA_MODEL_NAME ?= "qwen3:0.6b"
OLLAMA_EMBEDDING_MODEL_NAME ?= "all-minilm:l6-v2"
