ARG PYTHON_VERSION=3.14.8
FROM python:${PYTHON_VERSION}-slim AS base
COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /uvx /usr/local/bin/
RUN apt-get update && apt-get install -y --no-install-recommends make ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
COPY Makefile pyproject.toml uv.lock README.md ./
COPY makefiles/ makefiles/
COPY backend/ backend/
COPY frontend/ frontend/

FROM base AS backend
RUN make install-backend UV_SYNC_FLAGS="--locked --no-editable"
CMD ["python", "-m", "genai_template_backend.app"]

FROM base AS frontend
RUN make install-frontend UV_SYNC_FLAGS="--locked --no-editable"
CMD ["python", "-m", "genai_template_frontend.main"]
