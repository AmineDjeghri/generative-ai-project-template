FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir uvicorn
RUN pip install --no-cache-dir uv && uv sync
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
