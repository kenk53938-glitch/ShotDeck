#!/usr/bin/env python3
"""Queue approved ShotDeck CSV rows into a local ComfyUI workflow."""
from __future__ import annotations
import copy, csv, json, os, sys, urllib.request
from pathlib import Path
COMFY_URL = os.getenv("COMFY_URL", "http://127.0.0.1:8188").rstrip("/")
IMAGE_NODE = os.getenv("COMFY_IMAGE_NODE", "")
PROMPT_NODE = os.getenv("COMFY_PROMPT_NODE", "")
SEED_NODE = os.getenv("COMFY_SEED_NODE", "")
OUTPUT_NODE = os.getenv("COMFY_OUTPUT_NODE", "")
def set_input(workflow: dict, node_id: str, name: str, value: object) -> None:
    if not node_id or node_id not in workflow: raise ValueError(f"Missing or invalid node id for {name}: {node_id!r}")
    workflow[node_id]["inputs"][name] = value
def queue(workflow: dict) -> dict:
    request = urllib.request.Request(f"{COMFY_URL}/prompt", data=json.dumps({"prompt": workflow}).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response: return json.loads(response.read().decode("utf-8"))
def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python scripts/comfy_batch.py approved-shots.csv workflow_api.json"); return 2
    csv_path, workflow_path = map(Path, sys.argv[1:]); base = json.loads(workflow_path.read_text(encoding="utf-8"))
    with csv_path.open(newline="", encoding="utf-8-sig") as handle: rows = list(csv.DictReader(handle))
    for row in rows:
        workflow = copy.deepcopy(base); shot_id = row["shot_id"]
        set_input(workflow, IMAGE_NODE, os.getenv("COMFY_IMAGE_INPUT", "image"), row["image_name"])
        set_input(workflow, PROMPT_NODE, os.getenv("COMFY_PROMPT_INPUT", "text"), row["motion_prompt"])
        if SEED_NODE: set_input(workflow, SEED_NODE, os.getenv("COMFY_SEED_INPUT", "seed"), int(row["seed"] or (1000 + int(shot_id))))
        set_input(workflow, OUTPUT_NODE, os.getenv("COMFY_OUTPUT_INPUT", "filename_prefix"), f"preview/shot_{shot_id}")
        result = queue(workflow); print(f"Queued shot {shot_id}: {result.get('prompt_id', result)}")
    return 0
if __name__ == "__main__": raise SystemExit(main())
