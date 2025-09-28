from __future__ import annotations

import asyncio
import uuid
import base64
from typing import Any, Dict, List, Optional
import time

import httpx

from tryon_api import settings, logger
from tryon_api.ai.tryon_workflow import COMFYUI_WORKFLOW_API


class ComfyUIClient:
    def __init__(
        self,
        server_url: Optional[str] = None,
        poll_interval: float = 2.0,
        timeout_seconds: int = 180,
    ) -> None:
        self.server_url = (server_url or settings.COMFYUI_SERVER_URL).rstrip("/")
        self.poll_interval = poll_interval
        self.timeout_seconds = timeout_seconds
        logger.debug(
            f"[comfyui] Initialized ComfyUIClient server_url={self.server_url} poll={self.poll_interval}s timeout={self.timeout_seconds}s"
        )

    async def submit_workflow(
        self, workflow: Dict[str, Any], client_id: Optional[str] = None
    ) -> str:
        if not workflow:
            raise ValueError("ComfyUI workflow JSON is required.")
        # Validate that the workflow is in ComfyUI API prompt format
        # Expected: top-level keys are node ids (strings) -> {"class_type": ..., "inputs": {...}}
        # If the user pasted the UI export (contains top-level key 'nodes'), guide them to export API prompt instead.
        if (
            isinstance(workflow, dict)
            and "nodes" in workflow
            and isinstance(workflow["nodes"], list)
        ):
            msg = (
                "Provided JSON looks like a ComfyUI UI workflow export (contains 'nodes'). "
                "Please export the workflow in API prompt format (e.g., 'Save (API format)' or 'Queue Prompt JSON')."
            )
            logger.error(f"[comfyui] {msg}")
            raise ValueError(msg)
        # Light heuristic: ensure at least one node entry has 'class_type'
        if isinstance(workflow, dict):
            has_class_type = any(
                isinstance(v, dict) and "class_type" in v for v in workflow.values()
            )
            if not has_class_type:
                logger.error(
                    "[comfyui] Workflow JSON missing 'class_type' entries; likely not API prompt format"
                )
                raise ValueError(
                    "Workflow JSON must be in ComfyUI API prompt format (mapping of node_id -> {class_type, inputs})."
                )
        client_id = client_id or str(uuid.uuid4())
        # Log images assigned to key LoadImage nodes (best-effort)
        img78 = (
            workflow.get("78", {}).get("inputs", {}).get("image")
            if isinstance(workflow.get("78"), dict)
            else None
        )
        img106 = (
            workflow.get("106", {}).get("inputs", {}).get("image")
            if isinstance(workflow.get("106"), dict)
            else None
        )
        logger.debug(
            f"[comfyui] Submitting workflow to {self.server_url}/prompt client_id={client_id} (node78={img78}, node106={img106})"
        )
        if not img78 or not img106:
            logger.warning(
                "[comfyui] One or both LoadImage nodes (78, 106) have no assigned 'image' before submission"
            )
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            try:
                resp = await client.post(
                    f"{self.server_url}/prompt",
                    json={"prompt": workflow, "client_id": client_id},
                )
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                try:
                    content = e.response.text
                except Exception:
                    content = None
                logger.exception(
                    f"[comfyui] Failed to submit workflow to /prompt: status={getattr(e.response, 'status_code', '?')} body={content}"
                )
                raise
            except Exception as e:
                logger.exception(f"[comfyui] Failed to submit workflow to /prompt: {e}")
                raise
            data = resp.json()
            prompt_id = data.get("prompt_id") or data.get("id")
            if not prompt_id:
                logger.error(f"[comfyui] Unexpected response from /prompt: {data}")
                raise RuntimeError(f"Unexpected response from ComfyUI /prompt: {data}")
            logger.info(f"[comfyui] Submitted workflow prompt_id={prompt_id}")
            return prompt_id

    async def wait_for_result(self, prompt_id: str) -> Dict[str, Any]:
        logger.debug(f"[comfyui] Polling history for prompt_id={prompt_id}")
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            while True:
                try:
                    resp = await client.get(f"{self.server_url}/history/{prompt_id}")
                except Exception as e:
                    logger.exception(f"[comfyui] Error polling /history/{prompt_id}: {e}")
                    raise
                if resp.status_code == 404:
                    logger.debug(
                        f"[comfyui] history not ready for prompt_id={prompt_id}; sleeping {self.poll_interval}s"
                    )
                    await asyncio.sleep(self.poll_interval)
                    continue
                try:
                    resp.raise_for_status()
                except Exception as e:
                    logger.exception(
                        f"[comfyui] /history returned error for prompt_id={prompt_id}: {e}"
                    )
                    raise
                data = resp.json()
                # data structure: { prompt_id: { 'outputs': {...}}}
                item = data.get(prompt_id)
                if item and item.get("outputs"):
                    logger.info(f"[comfyui] History ready for prompt_id={prompt_id}")
                    return item
                await asyncio.sleep(self.poll_interval)

    def build_image_urls(self, history_item: Dict[str, Any]) -> List[str]:
        logger.debug("[comfyui] Building image URLs from history outputs")
        urls: List[str] = []
        outputs = history_item.get("outputs", {})
        cb = str(int(time.time() * 1000))
        for node_id, node_out in outputs.items():
            images = node_out.get("images") or []
            for img in images:
                filename = img.get("filename")
                subfolder = img.get("subfolder", "")
                type_ = img.get("type", "output")
                if filename:
                    # ComfyUI serves images with /view endpoint
                    url = f"{self.server_url}/view?filename={filename}&subfolder={subfolder}&type={type_}&cb={cb}"
                    urls.append(url)
        logger.debug(f"[comfyui] Built {len(urls)} image URLs")
        return urls

    async def image_edit(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        logger.debug("[comfyui] Starting image_edit workflow execution")
        prompt_id = await self.submit_workflow(workflow)
        history_item = await self.wait_for_result(prompt_id)
        image_urls = self.build_image_urls(history_item)
        logger.info(
            f"[comfyui] image_edit completed prompt_id={prompt_id} outputs={len(image_urls)}"
        )
        return {
            "prompt_id": prompt_id,
            "output": image_urls,
            "history": history_item,
        }

    async def upload_images_b64(self, images_b64: List[str]) -> List[str]:
        """Upload base64 images to ComfyUI /upload/image endpoint.

        Returns a list of filenames as recognized by ComfyUI which can be referenced by LoadImage nodes.
        """
        saved_names: List[str] = []
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            for idx, raw in enumerate(images_b64):
                mime: Optional[str] = None
                b64 = raw
                try:
                    # If data URL, extract mime and payload
                    if "," in raw and raw.strip().startswith("data:"):
                        header, payload = raw.split(",", 1)
                        # e.g., data:image/jpeg;base64
                        try:
                            mime = header.split(";")[0].split(":", 1)[1]
                        except Exception:
                            mime = None
                        b64 = payload
                    data = base64.b64decode(b64)
                except Exception as e:
                    logger.exception(f"[comfyui] Failed to decode base64 image at index {idx}: {e}")
                    raise

                # determine extension and content type
                ext = "png"
                ctype = "image/png"
                if mime:
                    mt = mime.lower()
                    if mt in {"image/jpeg", "image/jpg"}:
                        ext, ctype = "jpg", "image/jpeg"
                    elif mt == "image/png":
                        ext, ctype = "png", "image/png"
                    elif mt == "image/webp":
                        ext, ctype = "webp", "image/webp"
                fname = f"upload_{uuid.uuid4().hex}.{ext}"
                logger.debug(
                    f"[comfyui] Uploading image {idx} as {fname} (ctype={ctype}) to {self.server_url}/upload/image"
                )
                files = {"image": (fname, data, ctype)}
                try:
                    resp = await client.post(f"{self.server_url}/upload/image", files=files)
                    resp.raise_for_status()
                except httpx.HTTPStatusError as e:
                    body = None
                    try:
                        body = e.response.text
                    except Exception:
                        body = None
                    logger.exception(
                        f"[comfyui] Upload failed for {fname}: status={getattr(e.response, 'status_code', '?')} body={body}"
                    )
                    raise
                except Exception as e:
                    logger.exception(f"[comfyui] Upload failed for {fname}: {e}")
                    raise

                name = fname
                try:
                    j = resp.json()
                    # Some builds return {"name": "..."}
                    name = j.get("name") or name
                except Exception:
                    pass
                saved_names.append(name)
        logger.debug(f"[comfyui] Uploaded {len(saved_names)} images")
        return saved_names

    async def _url_to_data_url(self, url: str) -> str:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            r = await client.get(url)
            r.raise_for_status()
            mime = r.headers.get("content-type", "image/png")
            b64 = base64.b64encode(r.content).decode("utf-8")
            return f"data:{mime};base64,{b64}"

    async def try_on(
        self,
        person_image_b64: Optional[str] = None,
        person_image_url: Optional[str] = None,
        garment_image_b64: Optional[str] = None,
        garment_image_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """High-level comfyui try-on pipeline.

        - Accepts person/garment as base64 data URLs or http(s) URLs.
        - Uploads to ComfyUI input.
        - Binds to LoadImage nodes (78, 106) in a deep-copied workflow.
        - Verifies accessibility and assignment.
        - Randomizes seed and sets unique SaveImage prefix.
        - Executes and returns outputs.
        """
        # Validate presence
        if not (
            (person_image_b64 or person_image_url) and (garment_image_b64 or garment_image_url)
        ):
            raise ValueError(
                "person_image_(b64/url) and garment_image_(b64/url) are required for provider=comfyui"
            )

        # Prepare images as data URLs
        images_to_use: List[str] = []
        try:
            if person_image_b64 and person_image_b64.startswith("data:"):
                images_to_use.append(person_image_b64)
            elif person_image_url and (
                person_image_url.startswith("http://") or person_image_url.startswith("https://")
            ):
                images_to_use.append(await self._url_to_data_url(person_image_url))
            if garment_image_b64 and garment_image_b64.startswith("data:"):
                images_to_use.append(garment_image_b64)
            elif garment_image_url and (
                garment_image_url.startswith("http://") or garment_image_url.startswith("https://")
            ):
                images_to_use.append(await self._url_to_data_url(garment_image_url))
        except Exception as e:
            logger.exception(f"[comfyui] Failed to fetch/prepare images: {e}")
            raise ValueError(f"Failed to fetch/prepare images: {e}")

        if len(images_to_use) < 2:
            raise ValueError(
                "person_image_(b64/url) and garment_image_(b64/url) are required for provider=comfyui"
            )

        # Upload images
        filenames = await self.upload_images_b64(images_to_use)
        logger.debug(f"[comfyui] Uploaded images: {filenames}")

        # Load workflow (deep copy) and bind
        import copy as _copy

        wf: Dict[str, Any] = _copy.deepcopy(COMFYUI_WORKFLOW_API)

        # Force override and verify
        before_78 = (
            wf.get("78", {}).get("inputs", {}).get("image")
            if isinstance(wf.get("78"), dict)
            else None
        )
        before_106 = (
            wf.get("106", {}).get("inputs", {}).get("image")
            if isinstance(wf.get("106"), dict)
            else None
        )
        if len(filenames) >= 1 and isinstance(wf.get("78"), dict):
            wf["78"].setdefault("inputs", {})["image"] = filenames[0]
        if len(filenames) >= 2 and isinstance(wf.get("106"), dict):
            wf["106"].setdefault("inputs", {})["image"] = filenames[1]
        after_78 = (
            wf.get("78", {}).get("inputs", {}).get("image")
            if isinstance(wf.get("78"), dict)
            else None
        )
        after_106 = (
            wf.get("106", {}).get("inputs", {}).get("image")
            if isinstance(wf.get("106"), dict)
            else None
        )
        logger.debug(
            f"[comfyui] Forced override nodes: 78 {before_78} -> {after_78}, 106 {before_106} -> {after_106}"
        )

        await self.verify_uploaded_images(filenames)
        person_name = filenames[0]
        garment_name = filenames[1]
        self.assert_workflow_uses_images(wf, person_name, garment_name)

        # Execute
        return await self.image_edit(wf)

    async def verify_uploaded_images(self, filenames: List[str]) -> None:
        """Verify that uploaded images are accessible via the ComfyUI /view endpoint as inputs.

        Calls GET /view?filename=<name>&type=input and ensures HTTP 200.
        Raises a ValueError with details if any image is not accessible.
        """
        if not filenames:
            return
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            for name in filenames:
                url = f"{self.server_url}/view?filename={name}&type=input"
                try:
                    resp = await client.get(url)
                except Exception as e:
                    logger.exception(f"[comfyui] Failed to verify uploaded image {name}: {e}")
                    raise ValueError(f"Failed to verify uploaded image {name}: {e}")
                if resp.status_code != 200:
                    logger.error(
                        f"[comfyui] Uploaded image not accessible name={name} status={resp.status_code}"
                    )
                    raise ValueError(
                        f"Uploaded image not accessible: {name} (status {resp.status_code})"
                    )
        logger.debug(
            f"[comfyui] Verified {len(filenames)} uploaded images are accessible (type=input)"
        )

    def assert_workflow_uses_images(
        self, workflow: Dict[str, Any], person: Optional[str], garment: Optional[str]
    ) -> None:
        """Ensure that LoadImage nodes in the workflow are set to the expected filenames.

        Checks node '78' (person) and '106' (garment) when present.
        Raises ValueError if mismatch is detected.
        """
        issues = []
        node78 = workflow.get("78") if isinstance(workflow.get("78"), dict) else None
        node106 = workflow.get("106") if isinstance(workflow.get("106"), dict) else None
        if node78 and person:
            actual = node78.get("inputs", {}).get("image")
            if actual != person:
                issues.append(f"node 78 expected {person} got {actual}")
        if node106 and garment:
            actual = node106.get("inputs", {}).get("image")
            if actual != garment:
                issues.append(f"node 106 expected {garment} got {actual}")
        if issues:
            msg = "; ".join(issues)
            logger.error(f"[comfyui] Workflow image assignment mismatch: {msg}")
            raise ValueError(f"Workflow image assignment mismatch: {msg}")


def is_configured() -> bool:
    return settings.COMFYUI_SERVER_URL
