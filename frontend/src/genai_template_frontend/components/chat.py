import asyncio
import datetime

import requests
from nicegui import ui

from genai_template_frontend.utils import settings, logger


class Chat:
    def __init__(self):
        self.messages = []
        self.text_input = None
        self.scroll_area = None
        self._render_chat_messages_fn = None  # To hold the refreshable function instance

    async def _send_message_and_reply(self):
        user_text = self.text_input.value.strip()
        if not user_text:
            ui.notify("Message cannot be empty!", type="warning")
            return

        self.messages.append(
            {
                "role": "user",
                "text": user_text,
                "timestamp": datetime.datetime.now().strftime("%H:%M"),
            }
        )
        self.text_input.value = ""
        self._render_chat_messages_fn.refresh()

        await asyncio.sleep(0.5)  # Simulate bot thinking
        try:
            response = requests.post(
                f"{settings.BACKEND_URL}/api/chat", json={"message": user_text}
            )
            response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
            bot_reply_text = response.json().get("response", "Sorry, I could not get a response.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Could not connect to backend: {e}")
            bot_reply_text = "Error: Could not connect to the backend."

        bot_timestamp = datetime.datetime.now().strftime("%H:%M")
        self.messages.append(
            {
                "role": "bot",
                "text": bot_reply_text,
                "timestamp": bot_timestamp,
            }
        )
        self._render_chat_messages_fn.refresh()

    def build(self):
        with ui.column().classes("w-full max-w-2xl mx-auto"):
            # Chat interface container (card)
            with ui.card().classes("w-full max-w-lg shadow-lg rounded-borders"):
                # Messages area (scroll_area)
                self.scroll_area = ui.scroll_area().classes(
                    "flex-grow h-96 p-4 border rounded-borders bg-grey-1 q-mb-md"
                )
                with self.scroll_area:
                    # This column will be populated by the refreshable function
                    messages_ui_container = ui.column().classes("w-full items-stretch space-y-2")

                # Input area (row with input and button)
                with ui.row().classes("w-full items-center q-px-sm q-pb-sm"):
                    self.text_input = (
                        ui.input(placeholder="Type your message...")
                        .classes("flex-grow")
                        .props("outlined dense rounded")
                        .on("keydown.enter", self._send_message_and_reply)
                    )
                    ui.button(icon="send", on_click=self._send_message_and_reply).props(
                        "flat round dense color=primary"
                    )

                # Define the refreshable function for rendering messages
                @ui.refreshable
                def render_chat_messages_impl():
                    messages_ui_container.clear()
                    with messages_ui_container:
                        if not self.messages:
                            ui.label("No messages yet. Say something!").classes(
                                "text-center text-grey-6 q-pa-md"
                            )
                        for msg_data in self.messages:
                            with ui.chat_message(
                                sent=msg_data["role"] == "user",
                                stamp=msg_data["timestamp"],
                                avatar="https://robohash.org/user?set=set2"
                                if msg_data["role"] == "user"
                                else "https://robohash.org/bot?set=set2",
                            ):
                                ui.html(msg_data["text"])

                self._render_chat_messages_fn = render_chat_messages_impl  # Store the function
                self._render_chat_messages_fn()  # Initial render
