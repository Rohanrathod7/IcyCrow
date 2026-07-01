# 🏗️ Active Plan: Fix Keyboard Shortcut TextBox Bugs

## 1. Requirements & Scope
* **Goal:** Fix the issue where typing shortcut key letters (v, h, p, s, e, t, c, f) in text inputs/textareas (especially those inside Shadow DOMs) triggers shortcuts and suppresses typing.
* **Blueprint Alignment:** LLD - UX & Customizer interactions inside Shadow DOM.
* **Out of Scope:** Changing the actual shortcut keys.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `icycrow-master.md`, `content-script-css.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Shadow-piercing Active Element Detection
* **Action:** `[MODIFY]` [useKeyboardShortcuts.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/hooks/useKeyboardShortcuts.ts) - Implement recursive traversal of `activeElement` into `shadowRoot` to find the deep active element.
* **Required Tests:**
  * Add a unit test to [useKeyboardShortcuts.test.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/hooks/useKeyboardShortcuts.test.tsx) that renders the hook and fires keystrokes inside an input element hosted within a Shadow DOM, verifying that single-letter shortcuts are not triggered.

## 4. Risks & Mitigations
* ⚠️ **Low Risk:** Recursive lookup of shadow roots might hit security limitations or unexpected nulls on non-standard host elements. -> **Mitigation:** Safely check for `active && active.shadowRoot && active.shadowRoot.activeElement` and break out of the loop if any are missing.
