"""Fixtures for the NiceGUI frontend tests.

The NiceGUI testing harness renders the app in-process (httpx over the ASGI app), so these tests
need neither a browser nor a running backend. ``nicegui.testing.user_plugin`` ships a ``user``
fixture that wraps it, but that fixture is a plain async fixture and cannot be set up under this
workspace's ``asyncio_mode = "strict"``; the wrappers below call ``user_simulation`` directly.
"""

from collections.abc import AsyncIterator
from pathlib import Path

import pytest_asyncio
from nicegui.testing.user import User
from nicegui.testing.user_simulation import user_simulation

from genai_template_frontend.components.chat import Chat

FRONTEND_MAIN = (
    Path(__file__).parents[2] / "frontend" / "src" / "genai_template_frontend" / "main.py"
)


def build_chat() -> None:
    """Render a bare Chat component into the simulated page."""
    Chat().build()


@pytest_asyncio.fixture
async def chat_user() -> AsyncIterator[User]:
    """A simulated browser on a page holding only the Chat component.

    Each test gets a fresh app and a fresh Chat instance, so messages cannot leak between tests.
    """
    async with user_simulation(root=build_chat) as user:
        yield user


@pytest_asyncio.fixture
async def page_user() -> AsyncIterator[User]:
    """A simulated browser on the real "/" page defined in the frontend main file."""
    async with user_simulation(main_file=FRONTEND_MAIN) as user:
        yield user
