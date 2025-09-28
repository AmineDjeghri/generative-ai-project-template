from __future__ import annotations

from typing import Any, Dict, Literal, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pydantic import AliasChoices

from tryon_api import logger
from tryon_api.ai.fashn_client import FashnClient, is_configured as fashn_configured
from tryon_api.ai.comfyui_client import ComfyUIClient, is_configured as qwen_configured

router = APIRouter()


class TryOnBody(BaseModel):
    """Request body for /tryon with explicit parameter names.

    Backwards compatible aliases:
    - person_image_url <- model_image
    - garment_image_url <- garment_image
    - person_image_b64 <- model_image_b64
    - garment_image_b64 <- garment_image_b64
    - images_b64 stays the same
    """

    person_image_url: Optional[str] = Field(
        None,
        description="URL/path of the person image",
        validation_alias=AliasChoices("person_image_url", "model_image"),
    )
    garment_image_url: Optional[str] = Field(
        None,
        description="URL/path of the garment image",
        validation_alias=AliasChoices("garment_image_url", "garment_image"),
    )
    person_image_b64: Optional[str] = Field(
        None,
        description="Base64 data URL of the person image",
        validation_alias=AliasChoices("person_image_b64", "model_image_b64"),
    )
    garment_image_b64: Optional[str] = Field(
        None,
        description="Base64 data URL of the garment image",
        validation_alias=AliasChoices("garment_image_b64", "garment_image_b64"),
    )
    # Extra provider-specific inputs for FASHN (e.g., category, mode, etc.)
    inputs: Optional[Dict[str, Any]] = None


def _resolve_fashn_images(body: TryOnBody) -> Tuple[str, str]:
    """Return the resolved model and garment image strings (URL or base64)."""
    resolved_model = body.person_image_b64 or body.person_image_url
    resolved_garment = body.garment_image_b64 or body.garment_image_url
    if not resolved_model or not resolved_garment:
        msg = "model_image/garment_image (URL) or model_image_b64/garment_image_b64 are required for provider=fashn"
        logger.error(f"[tryon:fashn] {msg}")
        raise HTTPException(status_code=422, detail=msg)
    return resolved_model, resolved_garment


@router.post("/tryon")
async def try_on(
    body: TryOnBody,
    provider: Literal["fashn", "comfyui"] = Query("comfyui", description="Which provider to use"),
) -> Dict[str, Any]:
    """Run a try-on task via the selected provider.

    - provider=qwen: calls a ComfyUI server (Qwen Image Edit workflow). Requires QWEN_ENABLED and COMFYUI_SERVER_URL.
      Provide a `workflow` JSON in the body; this endpoint will submit and return output image URLs.

    - provider=fashn: calls FASHN API. Requires FASHN_API_KEY in env.
      Provide `model_image` and `garment_image` URLs in the body. Optional `inputs` for advanced params.

    """
    logger.debug("[tryon] Received request")
    logger.debug(f"[tryon] provider={provider}")
    if provider == "fashn":
        logger.debug(
            f"[tryon:fashn] person_image_url={body.person_image_url} garment_image_url={body.garment_image_url} inputs_keys={(list((body.inputs or {}).keys()))}"
        )
        if not fashn_configured():
            msg = "FASHN provider not configured: missing FASHN_API_KEY"
            logger.error(f"[tryon:fashn] {msg}")
            raise HTTPException(status_code=400, detail=msg)
        resolved_model, resolved_garment = _resolve_fashn_images(body)

        client = FashnClient()
        try:
            result = await client.try_on(
                model_image=resolved_model,
                garment_image=resolved_garment,
                inputs=body.inputs or {},
            )
        except Exception as e:
            logger.exception(f"[tryon:fashn] try-on failed: {e}")
            raise HTTPException(status_code=500, detail=str(e)) from e

        output = result.get("output", [])
        logger.debug(f"[tryon:fashn] completed with {len(output)} outputs")
        return {
            "provider": provider,
            "output": output,
            "raw": result,
        }

    elif provider == "comfyui":
        if not qwen_configured():
            msg = "ComfyUI provider not configured: enable QWEN_ENABLED and set COMFYUI_SERVER_URL"
            logger.error(f"[tryon:comfyui] {msg}")
            raise HTTPException(status_code=400, detail=msg)

        client = ComfyUIClient()
        logger.debug(
            f"[tryon:comfyui] received person_image_b64={bool(body.person_image_b64)} person_image_url={bool(body.person_image_url)} "
            f"garment_image_b64={bool(body.garment_image_b64)} garment_image_url={bool(body.garment_image_url)}"
        )
        try:
            result = await client.try_on(
                person_image_b64=body.person_image_b64,
                person_image_url=body.person_image_url,
                garment_image_b64=body.garment_image_b64,
                garment_image_url=body.garment_image_url,
            )
        except ValueError as e:
            msg = str(e)
            logger.error(f"[tryon:comfyui] validation error: {msg}")
            raise HTTPException(status_code=422, detail=msg)
        except Exception as e:
            logger.exception(f"[tryon:comfyui] workflow failed: {e}")
            raise HTTPException(status_code=500, detail=str(e)) from e

        output = result.get("output", [])
        logger.debug(f"[tryon:comfyui] completed with {len(output)} outputs")
        return {
            "provider": provider,
            "output": output,
            "raw": result,
        }

    else:
        msg = f"Unsupported provider '{provider}'. Supported: ['fashn', 'comfyui']"
        logger.error(f"[tryon] {msg}")
        raise HTTPException(status_code=400, detail=msg)
