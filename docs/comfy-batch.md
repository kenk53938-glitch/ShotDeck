# ComfyUI / WAN integration

ShotDeck supports direct queueing from the Production dashboard and a CSV/Python fallback.

## Recommended workflow

1. Upload and approve still images in ShotDeck.
2. Add a motion prompt and duration to each approved shot.
3. Generate WAN previews at **768×432, 24 fps**.
4. Review each preview in ShotDeck.
5. Approve good previews.
6. Queue approved previews through the upscale workflow at **1920×1080, 24 fps**.

ComfyUI processes queued jobs sequentially. ShotDeck does not launch parallel GPU renders.

## Export API workflows

In ComfyUI, open each proven workflow and choose **File → Export (API)**.

Configure `.env`:

```env
COMFY_URL=http://127.0.0.1:8188
COMFY_I2V_WORKFLOW_PATH=C:\\ComfyUI\\workflows\\wan_i2v_api.json
COMFY_UPSCALE_WORKFLOW_PATH=C:\\ComfyUI\\workflows\\upscale_api.json

COMFY_IMAGE_NODE=12
COMFY_IMAGE_INPUT=image
COMFY_PROMPT_NODE=27
COMFY_PROMPT_INPUT=text
COMFY_OUTPUT_NODE=58
COMFY_OUTPUT_INPUT=filename_prefix

# Optional mappings when the workflow exposes these values directly
COMFY_SEED_NODE=42
COMFY_SEED_INPUT=seed
COMFY_WIDTH_NODE=
COMFY_WIDTH_INPUT=width
COMFY_HEIGHT_NODE=
COMFY_HEIGHT_INPUT=height
COMFY_FPS_NODE=
COMFY_FPS_INPUT=fps
COMFY_DURATION_NODE=
COMFY_DURATION_INPUT=duration
```

Node IDs are workflow-specific. ShotDeck fails with a visible error when a required node or workflow is missing.

## Status polling

ShotDeck submits to:

```text
POST http://127.0.0.1:8188/prompt
```

The Production dashboard polls:

```text
GET http://127.0.0.1:8188/history/{prompt_id}
```

Completed output is attached as a new PREVIEW or FINAL Take. Execution messages containing errors, exceptions, CUDA failures, or out-of-memory details are shown on the job card.

## CSV fallback

The exported CSV contains exactly:

```csv
shot_id,image_name,motion_prompt,duration
```

Run:

```bash
python scripts/comfy_batch.py approved-shots.csv wan_i2v_api.json
```

The fallback script is intentionally simple. Update its node IDs to match the exported workflow before use.

## Troubleshooting

**ComfyUI is not reachable**

- Confirm ComfyUI is running.
- Open `http://127.0.0.1:8188` in a browser.
- Confirm `COMFY_URL` in `.env`.

**Workflow node is missing**

- Re-export the workflow in API format.
- Open the JSON and confirm each configured node ID and input name.

**CUDA out of memory**

- Keep previews at 768×432.
- Queue sequentially.
- Reduce frames or duration before changing the final upscale workflow.

**Render completes but no output is attached**

- Inspect the `/history/{prompt_id}` response.
- Confirm the installed output node reports a `videos`, `gifs`, or `images` collection with a filename.
