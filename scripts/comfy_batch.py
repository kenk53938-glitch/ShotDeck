#!/usr/bin/env python3
"""Queue approved ShotDeck CSV rows into a local ComfyUI workflow."""
from __future__ import annotations

import copy
import csv
import json
import os
import sys
import urllib.request
from pathlib import Path

COMFY_URL = os.getenv("COMFY_URL", "http://127.0.0.1:8188").rstrip("/")
IMAGE_NODE = os.getenv("COMFY_IMAGE_NODE", "")
POSITIVE_PROMPT_NODE = (
    os.getenv("COMFY_POSITIVE_PROMPT_NODE")
    or os.getenv("COMFY_PROMPT_NODE", "")
)
NEGATIVE_PROMPT_NODE = os.getenv("COMFY_NEGATIVE_PROMPT_NODE", "")
SEED_NODE = os.getenv("COMFY_SEED_NODE", "")
OUTPUT_NODE = os.getenv("COMFY_OUTPUT_NODE", "")


def set_input(
    workflow: dict[str, object],
    node_id: str,
    name: str,
    value: object,
) -> None:
    # Node IDs are strings. IDs such as "129:93" work without parsing.
    if not node_id or node_id not in workflow:
        raise ValueError(f"Missing or invalid node id for {name}: {node_id!r}")
    node = workflow[node_id]
    if not isinstance(node, dict) or not isinstance(node.get("inputs"), dict):
        raise ValueError(f"Node {node_id!r} has no inputs object")
    node["inputs"][name] = value


def queue(workflow: dict[str, object]) -> dict[str, object]:
    request = urllib.request.Request(
        f"{COMFY_URL}/prompt",
        data=json.dumps({"prompt": workflow}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: python scripts/comfy_batch.py "
            "approved-shots.csv workflow_api.json"
        )
        return 2

    csv_path, workflow_path = map(Path, sys.argv[1:])
    base = json.loads(workflow_path.read_text(encoding="utf-8"))
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    for index, row in enumerate(rows, start=1):
        workflow = copy.deepcopy(base)
        shot_id = row["shot_id"]
        set_input(
            workflow,
            IMAGE_NODE,
            os.getenv("COMFY_IMAGE_INPUT", "image"),
            row["image_name"],
        )
        set_input(
            workflow,
            POSITIVE_PROMPT_NODE,
            os.getenv(
                "COMFY_POSITIVE_PROMPT_INPUT",
                os.getenv("COMFY_PROMPT_INPUT", "text"),
            ),
            row["motion_prompt"],
        )

        negative_text = (
            row.get("negative_prompt")
            or os.getenv("COMFY_NEGATIVE_PROMPT_TEXT", "")
        ).strip()
        if NEGATIVE_PROMPT_NODE and negative_text:
            set_input(
                workflow,
                NEGATIVE_PROMPT_NODE,
                os.getenv("COMFY_NEGATIVE_PROMPT_INPUT", "text"),
                negative_text,
            )

        if SEED_NODE:
            raw_seed = (row.get("seed") or "").strip()
            seed = int(raw_seed) if raw_seed else 1000 + index
            set_input(
                workflow,
                SEED_NODE,
                os.getenv("COMFY_SEED_INPUT", "seed"),
                seed,
            )

        set_input(
            workflow,
            OUTPUT_NODE,
            os.getenv("COMFY_OUTPUT_INPUT", "filename_prefix"),
            f"preview/{shot_id}",
        )
        result = queue(workflow)
        print(f"Queued shot {shot_id}: {result.get('prompt_id', result)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
