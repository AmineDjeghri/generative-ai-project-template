# Application images: `make docker-compose` builds the backend and frontend targets.
# PYTHON_VERSION: keep it equal to the CI Python (`UV_PYTHON` in quality-and-tests.yml); Renovate
# proposes updates in its "python runtime" group.
ARG PYTHON_VERSION=3.14.8
FROM python:${PYTHON_VERSION}-slim AS base

# uv, and make to run the project's make targets
COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /uvx /usr/local/bin/
RUN apt-get update && apt-get install -y --no-install-recommends make ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# The environment lives outside /app
WORKDIR /app
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Only what the install needs (.dockerignore keeps everything else, including .env, out)
COPY Makefile pyproject.toml uv.lock README.md ./
COPY makefiles/ makefiles/
COPY backend/ backend/
COPY frontend/ frontend/

# One image per application
FROM base AS backend
RUN make install-backend UV_SYNC_FLAGS="--locked --no-editable"
CMD ["python", "-m", "genai_template_backend.app"]

FROM base AS frontend
RUN make install-frontend UV_SYNC_FLAGS="--locked --no-editable"
CMD ["python", "-m", "genai_template_frontend.main"]
