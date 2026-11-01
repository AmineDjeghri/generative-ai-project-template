# Generative AI Project Template

[![python](https://img.shields.io/badge/python-3.14.8-blue?logo=python)](https://www.python.org/downloads/release/python-3148/)
[![Debian](https://img.shields.io/badge/Debian-A81D33?logo=debian&logoColor=fff)](https://www.debian.org/)
[![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=F0F0F0)](https://www.apple.com/macos/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-FFD21E?logo=huggingface&logoColor=000)](https://huggingface.co/)
[![OpenAI](https://img.shields.io/badge/OpenAI-%23412991?logo=openai&logoColor=white)](https://openai.com/)
[![NiceGUI](https://img.shields.io/badge/NiceGUI-526CFE?logo=nicegui&logoColor=fff)](https://nicegui.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009485.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Style: Ruff](https://img.shields.io/badge/style-ruff-41B5BE?style=flat)](https://github.com/astral-sh/ruff)
[![MkDocs](https://img.shields.io/badge/MkDocs-526CFE?logo=materialformkdocs&logoColor=fff)](https://www.mkdocs.org/)
[![mkdocs-material](https://img.shields.io/badge/Material_for_MkDocs-526CFE?logo=materialformkdocs&logoColor=white)](https://squidfunk.github.io/mkdocs-material/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/AmineDjeghri/generative-ai-project-template/actions)

<img src="docs/images/logo.svg" alt="Generative AI Project Template logo" width="160" />

A FastAPI backend and NiceGUI frontend for chat, with local Ollama
or cloud models through LiteLLM. Includes uv workspace tooling, tests,
Docker Compose and GitHub releases.

<img src="docs/images/frontend_img.png" alt="Frontend screenshot" width="500" />

## Get started

Requires Make, Bash, Git and uv. uv provisions Python 3.14.8.

```bash
git clone https://github.com/AmineDjeghri/generative-ai-project-template.git
cd generative-ai-project-template
make install-dev
cp .env.example .env
```

Configure `INFERENCE_*` and `EMBEDDINGS_*` in `.env` for your model provider, then start the app:

```bash
make run
```

Open the frontend at <http://localhost:8080> or backend API docs at <http://localhost:8000/docs>.
For local Ollama, install it with `make install-ollama`, then use `make run-with-ollama`
to prepare the models and start both services.

## Other ways to run

| Command                                  | Use                                                            |
|------------------------------------------|----------------------------------------------------------------|
| `make docker-compose`                    | Backend, frontend and Ollama in containers; Compose 2.24+      |
| `make docker-compose-cuda`               | Same stack with GPU access for Ollama; NVIDIA drivers required |
| `make docker-compose-rebuild`            | Rebuild containers after source changes                        |
| `make run-backend` / `make run-frontend` | Start either application separately                            |

Python PyTorch extras are optional for model development; Ollama inference runs outside Python.
See [Setup](docs/developer/1.setup.md) for provider URLs, CUDA variants and timeouts.

## Develop

`make install-dev` installs the Git hooks in a checkout; `make pre-commit-install` reinstalls them.
For offline work, run `make test-local`; before a PR, configure the integration services and run
`make check`. That includes live LLM/Ollama/API tests; [Testing](docs/developer/4.testing.md)
lists the requirements. `make help` lists all targets.

| Task                                 | Guide                                                                                                                                     |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| Install, run or configure providers  | [Setup](docs/developer/1.setup.md)                                                                                                        |
| Add routes, settings or dependencies | [Project structure](docs/developer/2.project-structure.md)                                                                                |
| Prepare a contribution               | [Contributing](CONTRIBUTING.md) and [conventions](docs/developer/3.conventions.md)                                                        |
| Run tests                            | [Testing](docs/developer/4.testing.md)                                                                                                    |
| Publish or retry a release           | [Release](docs/developer/5.release.md)                                                                                                    |
| Start your own project               | [Use this template](https://github.com/aminedjeghri/generative-ai-project-template/generate) and [rename guide](docs/developer/6.fork.md) |

Preview documentation with `make deploy-doc-local`.
