from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

import httpx

from tryon_api import settings, logger


class FashnClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        poll_interval: Optional[float] = None,
        timeout_seconds: Optional[int] = None,
    ) -> None:
        self.api_key = api_key or settings.FASHN_API_KEY
        self.base_url = (base_url or settings.FASHN_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.FASHN_MODEL_NAME
        self.poll_interval = poll_interval or settings.FASHN_POLL_INTERVAL
        self.timeout_seconds = timeout_seconds or settings.FASHN_TIMEOUT_SECONDS

        if not self.api_key:
            raise ValueError("FASHN_API_KEY is not set. Please configure it in your environment.")
        logger.debug(
            f"[fashn] Initialized client base_url={self.base_url} model_name={self.model_name} poll={self.poll_interval}s timeout={self.timeout_seconds}s"
        )

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def try_on(
        self, model_image: str, garment_image: str, inputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run a try-on task and poll until completion.

        Returns the final status payload from FASHN which contains the `output` list of image URLs.
        """
        payload: Dict[str, Any] = {
            "model_name": self.model_name,
            "inputs": {
                "model_image": model_image,
                "garment_image": garment_image,
            },
        }
        if inputs:
            payload["inputs"].update(inputs)

        logger.debug("[fashn] Submitting try-on request to /run ...")
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            try:
                run_resp = await client.post(
                    f"{self.base_url}/run", json=payload, headers=self._headers()
                )
                run_resp.raise_for_status()
            except Exception as e:
                logger.exception(f"[fashn] /run request failed: {e}")
                raise
            run_data = run_resp.json()
            prediction_id = run_data.get("id")
            if not prediction_id:
                logger.error(f"[fashn] Unexpected response from /run: {run_data}")
                raise RuntimeError(f"Unexpected response from FASHN /run: {run_data}")
            logger.info(f"[fashn] Prediction started id={prediction_id}")

            # Poll status until completion
            while True:
                try:
                    status_resp = await client.get(
                        f"{self.base_url}/status/{prediction_id}", headers=self._headers()
                    )
                    status_resp.raise_for_status()
                except Exception as e:
                    logger.exception(f"[fashn] /status polling failed for id={prediction_id}: {e}")
                    raise
                status_data = status_resp.json()
                status = status_data.get("status")

                if status == "completed":
                    output = status_data.get("output", [])
                    logger.info(
                        f"[fashn] Prediction completed id={prediction_id} outputs={len(output)}"
                    )
                    return status_data
                elif status in {"starting", "in_queue", "processing"}:
                    logger.debug(f"[fashn] id={prediction_id} status={status}")
                    await asyncio.sleep(self.poll_interval)
                else:
                    err = status_data.get("error")
                    logger.error(f"[fashn] Prediction failed id={prediction_id}: {err}")
                    raise RuntimeError(f"FASHN prediction failed: {err}")


def is_configured() -> bool:
    return bool(settings.FASHN_API_KEY)
