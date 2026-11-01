import uvicorn
from fastapi import FastAPI
from fastapi import APIRouter

from fastapi.responses import Response

from contextlib import asynccontextmanager

from genai_template_backend.api.routes import chat
from genai_template_backend.backend_settings import settings, logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """This function is called when the server starts."""
    # Startup logic
    logger.info("Application startup.")

    yield
    # Shutdown logic
    logger.info("Application shutdown.")


app = FastAPI(lifespan=lifespan)


router = APIRouter()


# Root endpoint for "/"
@app.get("/")
async def root_index():
    return {"message": "Backend is running. Swagger UI available at /docs"}


# Endpoint for favicon.ico to avoid 404
@app.get("/favicon.ico")
async def favicon():
    return Response(content=b"", media_type="image/x-icon")


@router.get("/")
async def root():
    return {"message": "API is running."}


app.include_router(router, prefix="/api", tags=["root"])
app.include_router(chat.router, tags=["chat"])


if __name__ == "__main__":
    uvicorn.run(
        "genai_template_backend.app:app",
        port=settings.BACKEND_PORT,
        host=settings.BACKEND_HOST,
        reload=settings.logging_level == "DEBUG",
    )
