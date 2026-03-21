---
trigger: always_on
---

# IcyCrow Master Directives


@/.agents/skills/mv3-patterns/SKILL.md
@/.agents/skills/preact-ui/SKILL.md
@/.agents/skills/content-script-css/SKILL.md
@/.agents/skills/git-conventions/SKILL.md

## 1. Project Identity
- **Goal:** 100% Local-First, Zero-cost, Privacy-focused AI tab manager.
- **Stack:** Chrome MV3, Preact + Signals, Vite + CRXJS, window.ai.
- **UI/UX:** Native Glass, Bento Grid UI. Command-palette driven.

## 2. Immutable Constraints
- **NO React:** Strictly use Preact.
- **NO Backend:** Strictly local `chrome.storage` & IndexedDB. No external API calls.
- **Follow Workflows:** Always execute `/session-start`, `/plan`, `/tdd`, and `/code-review` exactly as defined in the `.agents/workflows/` directory.