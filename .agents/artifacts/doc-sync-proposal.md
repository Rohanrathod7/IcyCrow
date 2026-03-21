---
# 📝 Documentation Sync Proposal
**Context:** Based on recent Checkpoint Ledger activity mapping the newly built S5 content script architecture.

## 🤖 AI Context (Codemaps)
* **Target:** `Docs/CODEMAPS/content-scripts.md`
* **Proposed Updates:** 
```markdown
[LAST UPDATED: 2026-03-21]

### Content Script Architecture (S5)

* `src/content/index.ts` (Entry Point)
  * `document.addEventListener('mouseup'|'keyup')` -> `handleSelectionChange()`
  * `chrome.runtime.onMessage('COMMAND_HIGHLIGHT')` -> `performHighlight()` 
  * `initUiRoot()` -> Injects top-level `#icycrow-extension-root`

* `src/content/ui-root.tsx` (Shadow DOM UI Encapsulation)
  * `document.createElement('div#icycrow-extension-root')` -> `.attachShadow({ mode: 'open' })`
  * CSS Isolation: `:host { all: initial; }` | `* { box-sizing: border-box !important; }`
  * `render(<HighlightTooltip />)` bounded safely inside Shadow Root -> `#icycrow-mount`

* `src/content/components/HighlightTooltip.tsx` (Preact Signals State)
  * State: `@preact/signals` -> `tooltipVisible`, `tooltipPos`, `selectedColor`
  * Math: `tooltipPos.value` compensated via `rect + window.scrollY/X`
  * Action: `onHighlight()` -> `captureAnchor(selection)` -> `wrapRange()`

* `src/content/anchoring.ts` (4-Tier Text Anchoring Cascade)
  * `captureAnchor()` -> Serializes offsets, surrounding text, XPath, and CSS selectors.
  * `restoreAnchor(anchor)` execution chain:
    1. Exact Match -> `TextQuoteSelector` index lookup
    2. DOM Path -> `XPath Fallback` (`document.evaluate`)
    3. Semantic Path -> `CSS Fallback` (`document.querySelector`)
    4. Fuzzy Search -> `Levenshtein` window constrained to ~1000 chars around the fallback node's text.

* `src/content/highlighter.ts` (DOM Node Wrapping)
  * Fast path: `range.surroundContents(<mark>)`
  * Cross-element path: `TreeWalker (NodeFilter.SHOW_TEXT)` -> extract text nodes -> slice nodeRanges -> `surroundContents(<mark>)`
```

## 🧑‍💻 Human Docs (Surgical Edits)
* **Target:** `Docs/architecture/Execution_Plan.md`
* **Location:** Under heading `## S5: DOM Anchoring & Highlighting Logic`
* **Proposed Change:** ```markdown
- **Completed:** 4-Tier Anchoring Cascade (TextQuote, XPath, CSS, Fuzzy).
- **Completed:** Shadow DOM UI Encapsulation (preventing host CSS bleed).
- **Completed:** Preact Signals interactive tooltip (Ctrl+Shift+H hotkey).
```
---
