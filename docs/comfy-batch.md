# ComfyUI / WAN batch integration

ShotDeck supports direct local queueing and a CSV fallback.

## Direct local queue

Export your working WAN workflow from ComfyUI with **File → Export (API)**, then configure `.env`:

```env
COMFY_URL=http://127.0.0.1:8188
COMFY_I2V_WORKFLOW_PATH=C:\\ComfyUI\\workflows\\wan_i2v_api.json
COMFY_UPSCALE_WORKFLOW_PATH=C:\\ComfyUI\\workflows\\upscale_api.json
COMFY_IMAGE_NODE=12
COMFY_IMAGE_INPUT=image
COMFY_PROMPT_NODE=27
COMFY_PROMPT_INPUT=text
COMFY_SEED_NODE=42
COMFY_SEED_INPUT=seed
COMFY_OUTPUT_NODE=58
COMFY_OUTPUT_INPUT=filename_prefix
```

Node IDs are workflow-specific. Use **768×432 at 24 fps** for drafts and **1920×1080 at 24 fps** for approved upscales. Queue sequentially on an 8 GB VRAM GPU.

## CSV fallback

Export approved shots from **Production**, then run:

```bash
python scripts/comfy_batch.py approved-shots.csv wan_i2v_api.json
```

The CSV columns are `shot_id,image_name,motion_prompt,duration,seed,width,height,fps`. Name stills `shot_01.png` through `shot_40.png` so ChatGPT stills, WAN previews, and final clips remain aligned.
