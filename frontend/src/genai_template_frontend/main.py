"""Main entry point for the chat application."""

from nicegui import ui, app
from starlette.responses import PlainTextResponse, Response

from genai_template_frontend.components.chat import Chat
from genai_template_frontend.frontend_settings import settings


@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)


@app.get("/robots.txt")
async def robots():
    return PlainTextResponse("User-agent: *\nDisallow:\n")


@ui.page("/")
async def chat_page():
    # Main page container
    with ui.column().classes(
        "w-full h-screen no-wrap items-center justify-center q-pa-md bg-grey-2"
    ):
        conversation_component = Chat()
        conversation_component.build()  # Build and add the chat UI to this column


if __name__ in {"__main__", "__mp_main__"}:
    ui.run(
        title="Generative AI project template",
        show=False,
        reload=settings.logging_level == "DEBUG",
    )
