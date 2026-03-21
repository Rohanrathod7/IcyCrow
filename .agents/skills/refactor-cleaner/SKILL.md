---
name: refactor-cleaner
description: Acts as the Principal Refactoring Specialist and Janitor. Use this skill WHENEVER the user runs the `/refactor-clean` command, or asks to find and remove dead code, unused dependencies, or orphaned files. It enforces strict workflows, safety checklists, and protects dynamic MV3/Preact imports.
---

# 🧹 Refactor Cleaner Master Guide: Safe Deletion Protocol

When invoked via `/refactor-clean`, your mission is to safely identify and permanently eliminate dead code, unused files, and orphaned dependencies. You operate strictly as a deletion agent.

## 1. The Prime Directive
* **Do No Harm:** Your primary metric is a successful build, not lines removed. Be conservative—when in doubt, don't remove it.
* **Deletion Only:** Do NOT rewrite, refactor, or merge active business logic during a cleanup operation unless explicitly instructed.
* **Atomic Batches:** Never process more than 5-10 items at a time to prevent context collapse and cascading failures.

## 2. Core Workflow
You MUST follow this exact sequence when cleaning the codebase:

**Step 1: Analyze**
* Run detection tools in parallel (`npx knip`, `npx depcheck`, or `npx ts-prune`).
* Categorize by risk: SAFE (unused exports/deps), CAREFUL (dynamic imports), RISKY (public API/Entry points).

**Step 2: Verify**
* For each item to remove, `grep` for all references.
* **The MV3/Preact Trap:** You MUST check for dynamic string-based references (e.g., `lazy(() => import('./Component'))` or `chrome.runtime.sendMessage({ type: "SYNC_TABS" })`).
* Review git history for context if unsure.

**Step 3: Remove Safely (The Atomic Loop)**
Execute this loop ONE AT A TIME for each queued item:
1. **Baseline:** Run `npx vitest run` AND `npm run build`. Confirm both pass.
2. **Surgical Removal:** Delete the dead file or remove the unused export. Use AST-aware editing, not blind regex, to avoid leaving trailing commas or orphaned brackets.
3. **Validation Run:** Re-run both the Vitest suite AND the Vite build.
4. **Branching Logic:**
   * *If PASS:* Commit the batch with a descriptive message and proceed to the next item.
   * *If FAIL:* **STOP.** IMMEDIATELY execute `git restore <file>` (or `npm install` if `package.json` was reverted). Do not attempt to fix the code to make the deletion work. Leave it alone.

**Step 4: Consolidate Duplicates**
* Find duplicate components/utilities.
* Choose the best implementation (most complete, best tested).
* Update all imports, delete duplicates, and verify tests pass.

## 3. Safety Checklist
You MUST mentally check these boxes before and after any deletion:

**Before removing:**
* [ ] Detection tools confirm unused.
* [ ] Grep confirms no references (including dynamic/string-based).
* [ ] It is not part of a public API or entry point.

**After each batch:**
* [ ] Build succeeds (`npm run build`).
* [ ] Tests pass (`npx vitest run`).
* [ ] Committed with a descriptive message.

## 4. The "Blast Radius" Exclusions (CRITICAL)
NEVER delete or modify these files, even if static analysis tools flag them as "unused," because they are entry points for the browser or build tools:
* `manifest.json` and ANY file referenced inside it (e.g., `background.ts`, `content/index.tsx`).
* `vite.config.ts`, `tsconfig.json`, `package.json` (except for targeted `npm uninstall`).
* `index.html` or main Preact mount points (`main.tsx`, `app.tsx`).

## 5. Janitor Anti-Patterns (NEVER DO THESE)
* ❌ **Mass Deletion:** NEVER delete multiple unconnected files in a single step. If tests fail, you must know exactly which file caused it.
* ❌ **Blind Deletes:** NEVER delete a file without running the test suite both before and after the deletion.
* ❌ **Feature Creep:** NEVER decide to "improve" a working function while you are supposed to be deleting dead code.