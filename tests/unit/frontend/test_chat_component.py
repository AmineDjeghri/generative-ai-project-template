"""Component tests for the Chat widget, with the backend HTTP call stubbed out.

These exercise the widget's own logic — the send flow, the input guard, the HTTP error branch and
the request it builds — without a running backend.
"""

from typing import Any
import asyncio

import pytest
import httpx
from nicegui import ui
from nicegui.testing.user import User

from genai_template_frontend.components import chat as chat_module


class FakeResponse:
    """The subset of an HTTP response that the Chat widget uses."""

    def __init__(self, payload: dict[str, Any], error: Exception | None = None) -> None:
        self.payload = payload
        self.error = error

    def raise_for_status(self) -> None:
        """Raise the injected transport error, if one was configured."""
        if self.error is not None:
            raise self.error

    def json(self) -> dict[str, Any]:
        """Return the canned backend payload."""
        return self.payload


class FakeBackend:
    """An asynchronous backend substitute recording requests without a real server."""

    def __init__(self) -> None:
        self.payload: dict[str, Any] = {}
        self.error: Exception | None = None
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.timeout: httpx.Timeout | None = None

    async def __aenter__(self):
        """Open the simulated asynchronous client."""
        return self

    async def __aexit__(self, *args):
        """Close the simulated client without external resources."""
        pass

    async def post(
        self, url: str, json: dict[str, Any] | None = None, **kwargs: Any
    ) -> FakeResponse:
        """Record the request and return the configured response."""
        self.calls.append((url, json or {}))
        return FakeResponse(self.payload, self.error)


@pytest.fixture
def backend(monkeypatch: pytest.MonkeyPatch) -> FakeBackend:
    """Replace the Chat widget's HTTP call so no backend is needed."""
    stub = FakeBackend()

    def client(**kwargs):
        stub.timeout = kwargs.get("timeout")
        return stub

    monkeypatch.setattr(chat_module.httpx, "AsyncClient", client)
    return stub


def input_value(user: User) -> Any:
    """Return the value of the single text input on the simulated page."""
    return next(iter(user.find(kind=ui.input).elements)).value


@pytest.mark.asyncio
@pytest.mark.parametrize("submit", ["button", "enter"])
async def test_send_message_posts_to_the_backend_and_renders_the_reply(
    chat_user: User,
    backend: FakeBackend,
    submit: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A message sent through the UI reaches the backend and its reply is rendered."""
    monkeypatch.setattr(chat_module.settings, "BACKEND_REQUEST_TIMEOUT_SECONDS", 17)
    monkeypatch.setattr(chat_module.settings, "BACKEND_CONNECT_TIMEOUT_SECONDS", 2)
    backend.payload = {"response": "hi there"}
    await chat_user.open("/")
    await chat_user.should_see("No messages yet. Say something!")

    chat_user.find(kind=ui.input).type("hello")
    if submit == "button":
        chat_user.find(kind=ui.button).click()
    else:
        chat_user.find(kind=ui.input).trigger("keydown.enter")

    await chat_user.should_see("hello", retries=30)
    await chat_user.should_see("hi there", retries=30)
    assert backend.calls == [(f"{chat_module.settings.BACKEND_URL}/api/chat", {"message": "hello"})]
    assert input_value(chat_user) == ""
    assert backend.timeout.read == backend.timeout.write == backend.timeout.pool == 17
    assert backend.timeout.connect == 2


@pytest.mark.asyncio
async def test_blank_input_is_rejected(chat_user: User, backend: FakeBackend) -> None:
    """Whitespace-only input warns instead of reaching the backend."""
    await chat_user.open("/")

    chat_user.find(kind=ui.input).type("   ")
    chat_user.find(kind=ui.button).click()

    await chat_user.should_see("Message cannot be empty!")
    assert backend.calls == []
    await chat_user.should_see("No messages yet. Say something!")


@pytest.mark.asyncio
async def test_backend_http_error_is_shown(chat_user: User, backend: FakeBackend) -> None:
    """An error status from the backend renders the error bubble instead of crashing the page."""
    backend.error = httpx.HTTPError("500 Server Error")
    await chat_user.open("/")

    chat_user.find(kind=ui.input).type("hello")
    chat_user.find(kind=ui.button).click()

    await chat_user.should_see("Error: Could not connect to the backend.", retries=30)


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [{}, {"response": None}, {"response": []}])
async def test_malformed_backend_reply_is_shown_as_error(chat_user, backend, payload):
    backend.payload = payload
    await chat_user.open("/")
    chat_user.find(kind=ui.input).type("hello")
    chat_user.find(kind=ui.button).click()
    await chat_user.should_see("Error: Could not connect to the backend.", retries=30)


@pytest.mark.asyncio
async def test_slow_backend_leaves_ui_responsive_and_prevents_duplicate_send(
    chat_user, backend, monkeypatch
):
    started = asyncio.Event()
    finish = asyncio.Event()
    original_post = backend.post

    async def slow_post(*args, **kwargs):
        started.set()
        await finish.wait()
        return await original_post(*args, **kwargs)

    backend.payload = {"response": "done"}
    monkeypatch.setattr(backend, "post", slow_post)
    await chat_user.open("/")
    chat_user.find(kind=ui.input).type("hello")
    chat_user.find(kind=ui.button).click()
    await asyncio.wait_for(started.wait(), timeout=2)
    try:
        chat_user.find(kind=ui.input).type("next message")
        chat_user.find(kind=ui.button).click()
        await asyncio.sleep(0)
        assert input_value(chat_user) == "next message"
    finally:
        finish.set()
    await chat_user.should_see("done", retries=30)
    assert len(backend.calls) == 1
