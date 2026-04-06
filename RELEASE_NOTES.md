## What's New in v0.15.1

### Changed

- Skip PEP avatar requests for domains that block PubSub access (reduces unnecessary traffic)

### Fixed

- Blank screen during initial connection sync caused by render loop
- False reconnections triggered by macOS timer throttling after sleep
- MUC MAM catch-up gaps after long offline periods
- Added a temporary button in the rooms sidebar, under the + menu to force catch up all joined rooms.

---
[Full Changelog](https://github.com/processone/fluux-messenger/blob/main/CHANGELOG.md)
