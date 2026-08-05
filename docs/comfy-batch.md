# ComfyUI / WAN integration

ShotDeck supports direct queueing from the Production dashboard and a CSV/Python fallback.

## Recommended workflow

1. Upload and approve still images in ShotDeck.
2. Confirm each approved shot has a positive prompt and negative prompt.
3. Keep the separate motion prompt populated when you need the animation CSV export.
4. Generate WAN previews at **768×432, 24 fps**.
5. Review each preview in ShotDeck.
6. Approve good previews.
7. Queue approved previews through the upscale workflow at **1920×1080, 24 fps**.

ComfyUI processes queued jobs sequentially. ShotDeck does not launch parallel GPU renders.

## Export API workflows

In ComfyUI, open each proven workflow and choose **File → Export (API)**.

The supplied WAN 2.2 API workflow uses these nodes:

- `97` — `LoadImage`, input `image`
- `129:93` — `CLIPTextEncode`, positive input `text`
- `129:89` — `CLIPTextEncode`, negative input `text`
- `108` — `SaveVideo`, output prefix input `filename_prefix`

The supplied upscale API workflow uses:

- `1` — `VHS_LoadVideo`, input `video`
- `4` — `VHS_VideoCombine`, output prefix input `filename_prefix`
- `5` — optional 1920×1080 width/height injection
- `4` — optional `frame_rate` injection

Configure `.env`:

```env
COMFY_URL=http://127.0.0.1:8188
COMFY_I2V_WORKFLOW_PATH=C:\\ComfyUI\\workflows\\video_wan2_2_14B_i2v.json
COMFY_UPSCALE_WORKFLOW_PATH=C:\\ComfyUI\\workflows\\video_upscaler_api.json
COMFY_OUTPUT_DIRECTORY=C:\\ComfyUI\\output

# WAN I2V
COMFY_IMAGE_NODE=97
COMFY_IMAGE_INPUT=image
COMFY_POSITIVE_PROMPT_NODE=129:93
COMFY_POSITIVE_PROMPT_INPUT=text
COMFY_NEGATIVE_PROMPT_NODE=129:89
COMFY_NEGATIVE_PROMPT_INPUT=text
COMFY_OUTPUT_NODE=108
COMFY_OUTPUT_INPUT=filename_prefix

# Upscale: no positive or negative prompt nodes are read
COMFY_UPSCALE_VIDEO_NODE=1
COMFY_UPSCALE_VIDEO_INPUT=video
COMFY_UPSCALE_OUTPUT_NODE=4
COMFY_UPSCALE_OUTPUT_INPUT=filename_prefix

# Optional for the supplied upscale workflow
COMFY_UPSCALE_WIDTH_NODE=5
COMFY_UPSCALE_WIDTH_INPUT=width
COMFY_UPSCALE_HEIGHT_NODE=5
COMFY_UPSCALE_HEIGHT_INPUT=height
COMFY_UPSCALE_FPS_NODE=4
COMFY_UPSCALE_FPS_INPUT=frame_rate
```

Node IDs are read as strings and used directly as JSON object keys. A subgraph ID such as `129:93` is therefore supported without integer parsing or truncation.

For WAN I2V jobs, ShotDeck writes the shot's `positivePrompt` to `COMFY_POSITIVE_PROMPT_NODE` and `negativePrompt` to `COMFY_NEGATIVE_PROMPT_NODE`. The old `COMFY_PROMPT_NODE` and `COMFY_PROMPT_INPUT` names remain code-only compatibility fallbacks for the positive node, but new `.env` files should use the explicit positive names.

Upscale jobs use their own video-loader and output-node mappings. They do not read or require either prompt-node variable, so a prompt-free upscaler workflow remains valid.

The image/video loader in the exported workflow must accept the absolute input path that ShotDeck injects. If the installed loader only accepts filenames from ComfyUI's input folder, replace it with a path-capable loader or adapt the workflow before queueing.

`COMFY_OUTPUT_DIRECTORY` should point to the actual ComfyUI output directory. ShotDeck uses it to copy completed renders into its own `storage/` folder. Without it, the render is still attached through ComfyUI's `/view` endpoint, but the final organized export cannot copy that file and will report a warning.

## Status polling

ShotDeck submits to:

```text
POST http://127.0.0.1:8188/prompt
```

The Production dashboard polls:

```text
GET http://127.0.0.1:8188/history/{prompt_id}
```

Completed output is attached as a new PREVIEW or FINAL Take. Execution messages containing errors, exceptions, CUDA failures, or out-of-memory details are shown on the job card. Completed files are copied into ShotDeck storage when `COMFY_OUTPUT_DIRECTORY` is configured.

## CSV fallback

The exported CSV remains exactly:

```csv
shot_id,image_name,motion_prompt,duration
```

Run:

```bash
python scripts/comfy_batch.py approved-shots.csv wan_i2v_api.json
```

The fallback script writes `motion_prompt` to the configured positive node. Because the exact CSV intentionally has no negative-prompt column, the script preserves the negative text already exported in the workflow unless `COMFY_NEGATIVE_PROMPT_TEXT` is supplied. Direct queueing from ShotDeck uses the shot's stored `negativePrompt`.

## Troubleshooting

**ComfyUI is not reachable**

- Confirm ComfyUI is running.
- Open `http://127.0.0.1:8188` in a browser.
- Confirm `COMFY_URL` in `.env`.

**Workflow node is missing**

- Re-export the workflow in API format.
- Open the JSON and confirm each configured node ID and input name.
- Keep subgraph IDs such as `129:93` intact, including the colon.

**CUDA out of memory**

- Keep previews at 768×432.
- Queue sequentially.
- Reduce frames or duration before changing the final upscale workflow.

**Render completes but no output is attached**

- Inspect the `/history/{prompt_id}` response.
- Confirm the installed output node reports a `videos`, `gifs`, or `images` collection with a filename.
- Confirm `COMFY_OUTPUT_DIRECTORY` points to the directory that contains the returned relative path.
