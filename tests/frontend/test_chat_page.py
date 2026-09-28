"""Page-level tests for the real "/" page built from the frontend main file.

The page must render with no backend running at all — that is the state a fresh checkout is in.
"""

import pytest
from nicegui import ui
from nicegui.testing.user import User

from genai_template_frontend.frontend_settings import settings


@pytest.mark.asyncio
async def test_chat_page_renders_without_backend(page_user: User) -> None:
    """The page builds its empty state, with one input and one send button, and no backend."""
    await page_user.open("/")

    await page_user.should_see("No messages yet. Say something!")
    assert len(page_user.find(kind=ui.input).elements) == 1
    assert len(page_user.find(kind=ui.button).elements) == 1


@pytest.mark.asyncio
async def test_send_with_unreachable_backend_shows_the_error(
    page_user: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A refused connection surfaces as the error message, not as a crash."""
    monkeypatch.setattr(settings, "BACKEND_URL", "http://127.0.0.1:9")
    await page_user.open("/")

    page_user.find(kind=ui.input).type("hello")
    page_user.find(kind=ui.button).click()

    # The widget waits 0.5 s ("bot thinking") before reporting the failure.
    await page_user.should_see("hello", retries=30)
    await page_user.should_see("Error: Could not connect to the backend.", retries=30)
