# ShotDeck Roadmap

This roadmap separates **implemented**, **implemented but awaiting local verification**, and **future** work so the repository does not overstate production readiness.

## ✅ Stable on the default branch

- Project → Shot → Take tracking
- Ordered shot workflow and statuses
- Prompt / negative-prompt storage
- Shot duration and notes
- Bulk shot import
- Optional OpenAI-compatible parsing
- Take selection integrity
- Local SQLite storage
- Localhost-only runtime
- Input validation and safer server actions

## 🧪 Implemented in PR #1, awaiting local ComfyUI verification

[PR #1](https://github.com/kaziaiops/ShotDeck/pull/1) contains the larger production pipeline.

Before merge, verify on the target Windows machine:

- [ ] Existing SQLite data migrates without loss
- [ ] Real WAN 2.2 API workflow loads successfully
- [ ] Real upscale API workflow loads successfully
- [ ] ComfyUI accepts the configured input paths
- [ ] Two preview jobs render sequentially
- [ ] Render failures surface useful error messages
- [ ] Retry behaves correctly
- [ ] Preview approval works
- [ ] Approved preview can be upscaled to 1920×1080
- [ ] Final asset is attached and organized correctly
- [ ] Output folder mapping survives app restart

Full tracking: [Issue #2](https://github.com/kaziaiops/ShotDeck/issues/2).

## 🎯 Next engineering priorities after verification

### Reliability

- Add focused unit tests for parsing, filename matching, asset state transitions, and ComfyUI response handling
- Add integration tests around database invariants and job lifecycle
- Add backup/restore guidance for local SQLite data
- Improve recovery after ShotDeck or ComfyUI restarts during an active queue

### Production workflow

- Make final-asset selection explicit and deterministic
- Detect missing / moved local files before export
- Improve batch status summaries for 30–50 shot projects
- Add clear changed-since-approval indicators

### Editing handoff

- Define a stable project manifest for external editors/assemblers
- Add a Premiere Pro handoff/bridge after the production pipeline is locally proven
- Preserve shot order, approved asset path, and duration in that manifest

### Documentation and release quality

- Add current screenshots of project, review, and production views
- Record a short end-to-end demo
- Publish a first tagged release only after local production verification
- Add architecture documentation for ShotDeck ↔ ComfyUI communication

## Non-goals for now

- Public hosted multi-user deployment
- Browser automation of third-party image-generation websites
- Replacing a full creative NLE
- Claiming production readiness before real local workflow verification

---

The priority is reliability: **a smaller workflow that is predictable is more valuable than a larger workflow that silently loses track of assets or status.**
