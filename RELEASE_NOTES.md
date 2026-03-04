## What's New in v0.13.3

### Added

- MUC room member affiliation discovery for avatars, panel, and mentions
- MUC message history authors included in mention autocomplete
- Session persistence scoped by JID for multi-account isolation
- XMPP Console log batching with increased entry limit

### Changed

- Windows installer defaults to passive install mode
- Keyboard shortcut listener dependencies stabilized
- Stanza-id references enforced in MUCs when available

### Fixed

- SM resumption now detects cache clear and triggers full sync
- Roster subscription refusal no longer creates ghost entries
- Message reactions normalized for consistent reactor identifiers
- Viewport pending reports flushed on conversation switch to avoid stale states
- Reply behavior uses client-generated IDs for chat messages (XEP-0461)
- Unicode normalization improved for MUC nickname mention matching
- Media URLs with special characters in path handled correctly
- Linux keyring uses Secret Service backend for persistent credential storage
- Linux WebKitGTK dmabuf renderer disabled to prevent Wayland crash
- iOS safe area insets for camera cutout and home indicator (PWA)
- Deep link async URI processing errors handled explicitly
- Service worker install and audio notification guards hardened
- Clear-storage event listener made unmount-safe
- Flatpak runtime updated to GNOME 49

---
[Full Changelog](https://github.com/processone/fluux-messenger/blob/main/CHANGELOG.md)
