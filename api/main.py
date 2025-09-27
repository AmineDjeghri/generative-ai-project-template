from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router
from pathlib import Path
import os
from dotenv import load_dotenv

env_file = os.environ.get("ENV_FILE")
if env_file:
    load_dotenv(env_file)

app = FastAPI()

# Create artifacts directory if it doesn't exist
ARTIFACTS_DIR = Path("artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

# CORS middleware (allow frontend dev origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
