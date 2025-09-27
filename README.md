<img src="./assets/icon.svg" width="200" />
<h1>Generative AI Project Template</h1>


[![python](https://img.shields.io/badge/python-3.12+-blue?logo=python)](https://www.python.org/downloads/release/python-3120/)
[![Debian](https://img.shields.io/badge/Debian-A81D33?logo=debian&logoColor=fff)](https://www.debian.org/)
[![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=F0F0F0)](#)

[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-FFD21E?logo=huggingface&logoColor=000)](#)
[![OpenAI](https://img.shields.io/badge/OpenAI-%23412991?logo=openai&logoColor=white)](https://pytorch.org/get-started/locally/)
[![Microsoft Azure](https://custom-icon-badges.demolab.com/badge/Microsoft%20Azure-0089D6?logo=msazure&logoColor=white)](#)


[![FastAPI](https://img.shields.io/badge/FastAPI-009485.svg?logo=fastapi&logoColor=white)](#)

[![Style: Ruff](https://img.shields.io/badge/style-ruff-41B5BE?style=flat)](https://github.com/charliermarsh/ruff)
[![MkDocs](https://img.shields.io/badge/MkDocs-526CFE?logo=materialformkdocs&logoColor=fff)](#)
[![mkdocs-material](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/juftin/mkdocs-material/66d65cf/src/templates/assets/images/badge.json)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)](#)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](#)

# Try-On App

## Overview

The Try-On App is an innovative application designed to allow users to virtually try on products (such as clothing, accessories, or similar items) using their device. By leveraging advanced technologies such as image processing and possibly machine learning, the app provides a seamless and interactive experience for users to preview how items would look on them before making a purchase or decision.

## Features

- Virtual try-on experience for various products
- User-friendly interface for uploading photos or using live camera
- Realistic overlay and fitting of items on user images
- Support for multiple item categories
- Option to save, share, or download try-on results
- Responsive design for use on desktop and mobile devices

## Project Structure and Technologies

- **Frontend:**
  Built with **React** (see `frontend/`). This is the user-facing web application.

- **API:**
  The backend API is built with **FastAPI** (see `api/`). This serves as the main backend for the app, handling authentication, business logic, and data.

- **Backend (ML/AI):**
  The backend will also implement and serve **machine learning models** (e.g., for generative AI, embeddings, etc.), either locally or via cloud providers.

---

## Environment Variables

### Frontend

The frontend expects the following environment variables (typically in `frontend/.env.dev` or similar):

- `REACT_APP_BACK_API_URL`
  The base URL for the backend API (e.g., `http://localhost:8000`).

- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
  The Stripe publishable key for payment integration.

You may need to add more depending on your deployment (e.g., analytics, Sentry, etc.).

### API

The API backend (in `api/`) expects the following environment variables (see `docker-compose.dev.yml`, `api/main.py`, and `api/routes.py`):

- `BACKEND_HOST` (default: `0.0.0.0`)
  - Host for the FastAPI server.
- `BACKEND_PORT` (default: `8000`)
  - Port for the FastAPI server.
- `FAST_API_SECRET_KEY`
  - Secret key for JWT authentication.
- `SECRET_KEY`
  - Secret key for other cryptographic operations (used in routes).
- `STRIPE_SECRET_KEY`
  - Stripe secret key for payment processing.
- `STRIPE_WEBHOOK_SECRET`
  - Stripe webhook secret for validating Stripe webhooks.
- `FRONT_END_URL`
  - The URL of the frontend app (used for CORS and redirects).

### Backend (ML models)

The backend expects the following environment variables (see `docker-compose.dev.yml` and backend code):

- `BACKEND_HOST` (default: `0.0.0.0`)
  Host for the FastAPI server.
- `BACKEND_PORT` (default: `8000`)
  Port for the FastAPI server.
- `OLLAMA_MODEL_NAME`
  Name of the LLM model to use with Ollama.
- `OLLAMA_EMBEDDING_MODEL_NAME`
  Name of the embedding model to use with Ollama.
- `INFERENCE_DEPLOYMENT_NAME`
  Name of the inference deployment.
- `INFERENCE_BASE_URL`
  Base URL for inference API (e.g., `http://ollama:11434`).
- `INFERENCE_API_KEY`
  API key for inference service.
- `EMBEDDINGS_DEPLOYMENT_NAME`
  Name of the embeddings deployment.
- `EMBEDDINGS_BASE_URL`
  Base URL for embeddings API.
- `EMBEDDINGS_API_KEY`
  API key for embeddings service.
- `UV_PROJECT_ENVIRONMENT`
  Path to the backend virtual environment.
- `PYTHONUNBUFFERED`
  Set to `1` to ensure Python output is not buffered (useful for logging in Docker).

You may also need to set up database URLs, secret keys, and other service credentials as required by your deployment.

---

## 1. Getting started
This project is a monorepo containing two main packages:

- `frontend`: A React application.
- `backend`: A [FastAPI](https://fastapi.tiangolo.com/) application that serves the AI models and business logic.

The project uses `uv` as a package manager and is configured as a workspace, so dependencies for both packages can be installed with a single command.

The following files are used in the contribution pipeline:

- ``.env.example``: example of the .env file.
- ``.env`` : contains the environment variables used by the app.
- ``Makefile``: contains the commands to run the app locally.
- ``Dockerfile``: the dockerfile used to build the project inside a container. It uses the Makefile commands to run the app.
- ``.pre-commit-config.yaml``: pre-commit hooks configuration file
- ``pyproject.toml``: The root `pyproject.toml` defines the `uv` workspace and shared development dependencies.
- `frontend/pyproject.toml`: Dependencies for the frontend application.
- `backend/pyproject.toml`: Dependencies for the backend application, including optional dependencies for `cpu` and `cuda`.
- `.github/workflows/**.yml`: GitHub actions configuration files.
- ``.gitignore``: contains the files to ignore in the project.


### 1.1. Local Prerequisites

- Ubuntu 22.04 or MacOS
- git clone the repository
- UV & Python 3.12 (will be installed by the Makefile)
- Create a ``.env`` file *(take a look at the ``.env.example`` file)*


### 1.2 ⚙️ Steps for Installation
This project uses a `Makefile` to simplify the installation and execution process.

#### Local Installation
1. **For CPU-based environment (or MacOS)**
   To install all dependencies for both `frontend` and `backend` for a CPU environment, run:
   ```bash
   make install-dev
   ```

2. **For NVIDIA GPU (CUDA) environment**
   If you have an NVIDIA GPU and want to use CUDA for acceleration, run:
   ```bash
   make install-dev-cuda
   ```
   This will install the CUDA-enabled version of PyTorch.

#### Using Docker
The project can be fully containerized using Docker. This is the recommended way to run the application as it handles all services and networks.
- The `docker-compose.yml` and `docker-compose-cuda.yml` files define the services.
- To build the main docker image:
  ```bash
  make docker-build
  ```
- To run the entire application stack (frontend, backend, database, Ollama) using Docker Compose:
  ```bash
  make run-app
  ```

#### Running the Application
Once installed (either locally or via Docker), you can run the services.

- **Run Everything:**
  The `make run-app` command is the easiest way to start all services, including the frontend, backend, database, and Ollama.

- **Run Services Individually:**
  - **Run Frontend:** `make run-frontend`
  - **Run Backend:** `make run-backend`

You can then access:
- Frontend (NiceGUI): [http://localhost:8080](http://localhost:8080) (or the configured port)
- Backend (FastAPI): [http://localhost:8000](http://localhost:8000) (or the configured port). Docs [http://localhost:8000/docs](http://localhost:8000/docs)

#### Using Local vs. Cloud LLMs
- **Local model (Ollama)**:
    - Ensure Ollama is running (`make run-ollama` can help).
    - Set your `.env` file to point to the local Ollama endpoint.
    - Download a model: `make download-ollama-model`
    - Test the connection: `make test-ollama`
- **Cloud model (OpenAI, Anthropic, etc.)**:
    - Update your `.env` file with the correct API keys and model names, following the [LiteLLM naming convention](https://docs.litellm.ai/docs/providers).
    - Test the connection: `make test-inference-llm`

### 1.3 ⚙️ Steps for Installation (Contributors and maintainers)
Check the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## 2. Contributing
Check the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.
