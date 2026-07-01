# Changelog

All notable changes to the IcyCrow extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-07-01

### Added
* **Highlighter Customizer:** Added support for custom colors, opacity customization, and dynamic text selection preview.
* **Persistent Tool Settings:** Implemented automatic cross-context synchronization (`chrome.storage.local`) for all customized tool attributes (color, size, opacity) between Sidebar Panels, Standalone Tabs, and injected Content Scripts.
* **Eyes Dropper Tool:** Integrated native EyeDropper API with a premium custom inline Pipette SVG icon.
* **In-Card Color Picker:** Added 5 curated color choice buttons inside Sticky Notes, Callouts, and Flashcards expanded headers.
* **Click-Outside Collapse:** Implemented automatic window compression (collapse) when users click anywhere outside of an active expanded note, callout, or flashcard.
* **Flashcard Resizable Splitter:** Integrated a draggable horizontal slider divider inside the Flashcard body to adjust relative Question (Front) and Answer (Back) container sizes.

### Fixed
* **Color Preset Persistency Bug:** Fixed a race condition where default in-memory signal values would overwrite customized settings in storage during page refresh/reload.
* **Edge Case Test Mock Failures:** Wrapped `chrome.storage.onChanged` calls with runtime checks to avoid test execution failures inside JSDOM/Node environments.
