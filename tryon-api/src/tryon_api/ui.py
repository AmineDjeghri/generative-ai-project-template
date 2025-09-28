from __future__ import annotations

from typing import Any, Dict, Optional

from nicegui import ui
import httpx
import base64

from tryon_api import settings, logger


@ui.page("/")
def main_page() -> None:
    api_base = f"http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}/api"

    logger.debug(f"[ui] Building page with api_base={api_base}")
    ui.label("Try-On Playground").classes("text-2xl font-bold mb-2")
    ui.label("Switch between FASHN API and ComfyUI to generate try-on results.")

    with ui.card().classes("w-full max-w-3xl mt-4"):
        ui.label("Provider").classes("text-md font-medium")
        provider_radio = ui.radio(["fashn", "comfyui"], value="comfyui").classes("mb-4")
        ui_state: Dict[str, str] = {"provider": provider_radio.value}

        # Imperative visibility toggling using a shared dict
        def _on_provider_change(e) -> None:
            ui_state["provider"] = e.value
            fashn_section.visible = e.value == "fashn"
            comfyui_section.visible = e.value == "comfyui"

        provider_radio.on_value_change(_on_provider_change)

        with ui.element("div") as fashn_section:
            ui.label("FASHN Settings").classes("text-lg font-semibold")
            model_image = ui.input("Model Image URL").classes("w-full")
            garment_image = ui.input("Garment Image URL").classes("w-full")
            inputs_json = (
                ui.textarea("Optional FASHN Inputs (JSON)").props("autogrow").classes("w-full")
            )
            ui.markdown(
                "[FASHN Try-On Parameters](https://docs.fashn.ai/guides/tryon-parameters-guide)"
            )

        with ui.element("div") as comfyui_section:
            ui.label("ComfyUI Settings").classes("text-lg font-semibold")
            ui.markdown("Loader for GGUF models: https://github.com/city96/ComfyUI-GGUF")

            # Uploaders for images in order: person, then garment
            ui.label("Upload images for LoadImage nodes (1) Person, (2) Garment").classes(
                "mt-2 text-md"
            )
            state: Dict[str, Optional[str]] = {"person_b64": None, "garment_b64": None}

            def _to_b64(data: bytes, mime: str | None) -> str:
                try:
                    enc = base64.b64encode(data).decode("utf-8")
                except Exception as e:
                    logger.exception(f"[ui] Failed to base64-encode upload: {e}")
                    raise
                prefix = f"data:{mime or 'image/png'};base64,"
                return prefix + enc

            def _on_person_upload(e) -> None:
                content = getattr(e, "content", None)
                mime = getattr(e, "type", None)
                if hasattr(content, "read"):
                    content = content.read()
                if not isinstance(content, (bytes, bytearray)):
                    ui.notify("Invalid uploaded file (person)", type="negative")
                    return
                state["person_b64"] = _to_b64(content, mime)
                ui.notify("Person image uploaded", type="positive")
                # update preview immediately
                person_preview.source = state["person_b64"]

            def _on_garment_upload(e) -> None:
                content = getattr(e, "content", None)
                mime = getattr(e, "type", None)
                if hasattr(content, "read"):
                    content = content.read()
                if not isinstance(content, (bytes, bytearray)):
                    ui.notify("Invalid uploaded file (garment)", type="negative")
                    return
                state["garment_b64"] = _to_b64(content, mime)
                ui.notify("Garment image uploaded", type="positive")
                # update preview immediately
                garment_preview.source = state["garment_b64"]

            with ui.row().classes("gap-4 mt-2"):
                ui.upload(label="Person image", on_upload=_on_person_upload).props(
                    "accept=image/* auto-upload"
                )
                ui.upload(label="Garment image", on_upload=_on_garment_upload).props(
                    "accept=image/* auto-upload"
                )
            with ui.row().classes("gap-4 mt-2"):
                person_preview = ui.image().classes("w-32 h-32 object-cover border")
                garment_preview = ui.image().classes("w-32 h-32 object-cover border")

        # initialize visibility once
        _on_provider_change(type("evt", (), {"value": provider_radio.value}))

        with ui.row().classes("items-center mt-2"):
            btn = ui.button("Run Try-On", color="primary")
            spinner = ui.spinner(size="lg").props("color=primary")
            spinner.visible = False

    async def on_click() -> None:
        logger.debug("[ui] Run Try-On clicked")
        btn.disable()
        spinner.visible = True
        provider = ui_state["provider"]
        logger.debug(f"[ui] Selected provider={provider}")

        try:
            if provider == "fashn":
                if not model_image.value or not garment_image.value:
                    ui.notify(
                        "Please provide both Model Image URL and Garment Image URL for FASHN",
                        type="negative",
                    )
                    return

                body: Dict[str, Any] = {
                    "model_image": model_image.value,
                    "garment_image": garment_image.value,
                }
                if inputs_json.value:
                    try:
                        import json

                        body["inputs"] = json.loads(inputs_json.value)
                    except Exception as e:
                        logger.error(f"[ui] Invalid JSON in FASHN inputs: {e}")
                        ui.notify(f"Invalid JSON in FASHN inputs: {e}", type="negative")
                        return
                logger.debug(
                    f"[ui] Sending FASHN request to {api_base}/tryon with keys={list(body.keys())}"
                )
                async with httpx.AsyncClient(timeout=180) as client:
                    r = await client.post(
                        f"{api_base}/tryon", params={"provider": "fashn"}, json=body
                    )
                    r.raise_for_status()
                    data = r.json()
                    logger.debug(
                        f"[ui] FASHN response received outputs={len(data.get('output', []))}"
                    )
                    for url in data.get("output", []):
                        ui.image(url).classes("w-80 rounded shadow")
                    if not data.get("output"):
                        logger.debug("[ui] FASHN returned no images")
                        ui.notify("FASHN returned no images", type="warning")

            else:  # comfyui
                logger.debug(f"[ui] Sending ComfyUI request to {api_base}/tryon")
                payload: Dict[str, Any] = {}
                # Provide explicit fields for the backend
                if state.get("person_b64"):
                    payload["person_image_b64"] = state["person_b64"]
                if state.get("garment_b64"):
                    payload["garment_image_b64"] = state["garment_b64"]
                if not payload.get("person_image_b64") or not payload.get("garment_image_b64"):
                    ui.notify(
                        "Please upload both Person and Garment images for ComfyUI", type="negative"
                    )
                    return
                # minimal log
                logger.debug("[ui] ComfyUI payload ready (both images present)")
                async with httpx.AsyncClient(timeout=180) as client:
                    r = await client.post(
                        f"{api_base}/tryon", params={"provider": "comfyui"}, json=payload
                    )
                    r.raise_for_status()
                    data = r.json()
                    logger.debug(
                        f"[ui] ComfyUI response received outputs={len(data.get('output', []))}"
                    )
                    for url in data.get("output", []):
                        ui.image(url).classes("w-80 rounded shadow")
                    if not data.get("output"):
                        logger.debug("[ui] ComfyUI returned no images")
                        ui.notify("ComfyUI returned no images", type="warning")

        except httpx.HTTPStatusError as e:
            try:
                detail = e.response.json().get("detail")
            except Exception:
                detail = str(e)
            logger.error(f"[ui] HTTP error: {detail}")
            ui.notify(f"HTTP error: {detail}", type="negative", close_button="OK")
        except Exception as e:
            logger.exception(f"[ui] Unexpected error: {e}")
            ui.notify(f"Error: {e}", type="negative", close_button="OK")
        finally:
            logger.debug("[ui] Run Try-On finished")
            spinner.visible = False
            btn.enable()

    btn.on_click(on_click)


if __name__ in {"__main__", "__mp_main__"}:
    ui.run(title="TRYON UI", host=settings.UI_HOST, port=settings.UI_PORT, reload=settings.DEV_MODE)
