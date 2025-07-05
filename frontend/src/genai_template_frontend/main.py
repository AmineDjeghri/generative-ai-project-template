"""Main entry point for the JYM application."""

from nicegui import ui, app
from starlette.responses import FileResponse, PlainTextResponse

from genai_template_frontend.components.chat import Chat


@app.get("/favicon.ico")
async def favicon():
    favicon_path = "resources/images/gradwave.ico"
    return FileResponse(favicon_path)


@app.get("/robots.txt")
async def robots():
    return PlainTextResponse("User-agent: *\nDisallow:\n")


def get_backend_url():
    # Use env or fallback
    import os

    return os.environ.get("BACKEND_URL", "http://localhost:8000")


@ui.page("/")
async def chat_page():
    # Main page container
    with ui.column().classes(
        "w-full h-screen no-wrap items-center justify-center q-pa-md bg-grey-2"
    ):
        conversation_component = Chat()
        conversation_component.build()  # Build and add the chat UI to this column


if __name__ in {"__main__", "__mp_main__"}:
    ui.run(title="Generative AI project template", show=False)  # Use NiceGUI's FastAPI integration
