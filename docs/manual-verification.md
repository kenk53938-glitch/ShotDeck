# Manual verification checklist

Run this checklist on the production Windows machine before merging the feature branch.

## Application

- [ ] `npm ci`
- [ ] `npx prisma migrate dev`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run dev`
- [ ] Existing projects and shots remain visible after migration

## Prompt workflow

- [ ] Save a long style guide and confirm success feedback
- [ ] Upload, replace, and remove a reference image
- [ ] Generate one prompt and confirm it is not saved before clicking Save prompts
- [ ] Force a provider error and confirm no API key appears in the UI or logs
- [ ] Generate missing prompts for multiple shots and confirm progress increments
- [ ] Confirm existing manual prompts are preserved unless overwrite is confirmed

## Import and still review

- [ ] Import the documented rule-based format
- [ ] Import malformed input and confirm every rejected shot has a reason
- [ ] Upload `shot_01.png`, `shot01_s1.png`, and `shot1,s2.png`
- [ ] Confirm matched, missing, duplicate, and unmatched reports
- [ ] Select a different Take and confirm the previous Take is deselected
- [ ] Bulk approve and bulk mark Needs Rework

## ComfyUI

- [ ] Confirm WAN node `97` receives the selected image path through input `image`
- [ ] Confirm WAN node `129:93` receives the shot positive prompt through input `text`
- [ ] Confirm WAN node `129:89` receives the shot negative prompt through input `text`
- [ ] Confirm colon-containing node IDs are not truncated or parsed as integers
- [ ] Confirm WAN duration/FPS nodes `129:161` and `129:162` receive `value`
- [ ] Confirm WAN width/height node `129:98` receives the project or shot dimensions
- [ ] Confirm the upscale workflow uses video node `1`, output node `4`, and scale node `5` without requiring either prompt node
- [ ] Queue at least two approved shots and confirm they render sequentially
- [ ] Confirm queued/running/completed state updates
- [ ] Confirm a completed preview creates a PREVIEW Take
- [ ] Trigger a safe failure and confirm the real ComfyUI error is visible
- [ ] Retry a failed job
- [ ] Approve a preview and queue it for 1920×1080 upscale
- [ ] Confirm the final output creates a FINAL Take

## Final organization

- [ ] Organize approved assets
- [ ] Confirm missing files are warnings, not a fatal crash
- [ ] Confirm `stills/`, `previews/`, `final/`, and `manifest.csv`
- [ ] Open the final assets in CapCut
