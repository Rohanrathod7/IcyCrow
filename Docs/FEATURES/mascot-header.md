# Feature Log: Mascot Header (Emotional Design)
**Epic:** T3/T4
**Date:** 2026-03-30
**Status:** 🟢 COMPLETED

## 🎯 Overview
The Mascot Header transforms the functional side panel into an "Emotional" personality-driven interface. It introduces a Dino companion that reacts to application state (Idle, Thinking, Success, Saving) using high-fidelity sprite animations.

## 🏗️ Technical Architecture

### 1. State-Driven Assets
- **Idle/Dance**: 9-frame WebP (`dino_dance-ezgif.webp`). Math: 1440px total / 160px frame.
- **Thinking/Stressed**: 11-frame WebP (`stressed_dino...webp`). Math: 1760px total / 160px frame.
- **Thinking Bubble**: Floats above the head with a `bubble-wobble` animation. Positioned via `z-index: 20`.

### 2. Neural Link (Synchronization)
The `ChatView.tsx` component acts as the primary driver for the `thinking` state:
- **Trigger**: `currentAppStatus.value = 'thinking'` on message submission.
- **Reset**: Reverts to `idle` on stream completion, error, or component unmount (via `useEffect` cleanup).

### 3. Design System Integration
- **Image Rendering**: `image-rendering: pixelated` is enforced globally on mascot assets to preserve sharp retro edges.
- **Custom Scrollbars**: Minimalist Webkit scrollbars added to `panel.css` for a premium dark-mode feel.
- **Layout**: Consolidates navigation into an absolute overlay positioned over the tiled soil background.

## 🧪 Verification & Maintenance
- **Tests**: `DinoMascot.test.tsx` and `MascotHeader.test.tsx` verify state-to-class mapping and rendering integrity.
- **Assets**: Stored in `src/assets/images/`. Must be imported via ESM in components to ensure valid build path resolution.

## 🔗 References
- Architecture Codemap: [side-panel.md](../CODEMAPS/side-panel.md)
- Design Rulebook: `.agents/skills/preact-ui/SKILL.md`
