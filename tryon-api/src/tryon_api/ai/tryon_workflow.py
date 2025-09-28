# This needs to be in the API format

COMFYUI_WORKFLOW_API = {
    "3": {
        "inputs": {
            "seed": 528463306808752,
            "steps": 4,
            "cfg": 1,
            "sampler_name": "euler",
            "scheduler": "simple",
            "denoise": 1,
            "model": ["75", 0],
            "positive": ["111", 0],
            "negative": ["110", 0],
            "latent_image": ["88", 0],
        },
        "class_type": "KSampler",
        "_meta": {"title": "KSampler"},
    },
    "8": {
        "inputs": {"samples": ["3", 0], "vae": ["39", 0]},
        "class_type": "VAEDecode",
        "_meta": {"title": "VAE Decode"},
    },
    "37": {
        "inputs": {
            "unet_name": "qwen_image_edit_2509_fp8_e4m3fn.safetensors",
            "weight_dtype": "default",
        },
        "class_type": "UNETLoader",
        "_meta": {"title": "Charger Modèle Diffusion"},
    },
    "38": {
        "inputs": {
            "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
            "type": "qwen_image",
            "device": "default",
        },
        "class_type": "CLIPLoader",
        "_meta": {"title": "Charger CLIP"},
    },
    "39": {
        "inputs": {"vae_name": "qwen_image_vae.safetensors"},
        "class_type": "VAELoader",
        "_meta": {"title": "Charger VAE"},
    },
    "60": {
        "inputs": {"filename_prefix": "ComfyUI", "images": ["8", 0]},
        "class_type": "SaveImage",
        "_meta": {"title": "Enregistrer Image"},
    },
    "66": {
        "inputs": {"shift": 3, "model": ["89", 0]},
        "class_type": "ModelSamplingAuraFlow",
        "_meta": {"title": "ModelSamplingAuraFlow"},
    },
    "75": {
        "inputs": {"strength": 1, "model": ["66", 0]},
        "class_type": "CFGNorm",
        "_meta": {"title": "CFGNorm"},
    },
    "78": {
        "inputs": {"image": "FB_IMG_1751301465107.jpg"},
        "class_type": "LoadImage",
        "_meta": {"title": "Charger Image"},
    },
    "88": {
        "inputs": {"pixels": ["93", 0], "vae": ["39", 0]},
        "class_type": "VAEEncode",
        "_meta": {"title": "VAE Encode"},
    },
    "89": {
        "inputs": {
            "lora_name": "Qwen-Image-Lightning-4steps-V1.0.safetensors",
            "strength_model": 1,
            "model": ["37", 0],
        },
        "class_type": "LoraLoaderModelOnly",
        "_meta": {"title": "LoraLoaderModelOnly"},
    },
    "93": {
        "inputs": {"upscale_method": "lanczos", "megapixels": 1, "image": ["78", 0]},
        "class_type": "ImageScaleToTotalPixels",
        "_meta": {"title": "Redimensionner l'image en fonction du nombre total de pixels"},
    },
    "106": {
        "inputs": {"image": "maillot-algerie-exterieur-2024-2025202411261707026745f226707ad.jpg"},
        "class_type": "LoadImage",
        "_meta": {"title": "Charger Image"},
    },
    "110": {
        "inputs": {
            "prompt": "",
            "clip": ["38", 0],
            "vae": ["39", 0],
            "image1": ["93", 0],
            "image2": ["106", 0],
        },
        "class_type": "TextEncodeQwenImageEditPlus",
        "_meta": {"title": "TextEncodeQwenImageEditPlus"},
    },
    "111": {
        "inputs": {
            "prompt": "put the clothes of the second image onto the person on the first image.",
            "clip": ["38", 0],
            "vae": ["39", 0],
            "image1": ["93", 0],
            "image2": ["106", 0],
        },
        "class_type": "TextEncodeQwenImageEditPlus",
        "_meta": {"title": "TextEncodeQwenImageEditPlus"},
    },
    "112": {
        "inputs": {"width": 1024, "height": 1024, "batch_size": 1},
        "class_type": "EmptySD3LatentImage",
        "_meta": {"title": "EmptySD3LatentImage"},
    },
}
