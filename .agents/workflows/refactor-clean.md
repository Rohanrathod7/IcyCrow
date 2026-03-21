---
description: refactor clean Safely identify and permanently eliminate dead code, unused files, and orphaned dependencies. This command operates strictly as an **Atomic Deletion Loop** validated by your test suite.
---

# COMMAND: /refactor-clean

## Core Intent
Safely identify and permanently eliminate dead code, unused files, and orphaned dependencies. This command operates strictly as an **Atomic Deletion Loop** validated by your test suite. It DOES NOT alter existing business logic, update package versions, or merge functions. 

## Syntax & Arguments
* **Standard:** `/refactor-clean` -> Scans the workspace for dead code in batches.
* **Targeted:** `/refactor-clean [directory/file]` -> Scans a specific scope.

## Execution Protocol
When invoked, execute these steps sequentially and silently.

### Step 1: Pre-Flight Safety & Hydration
1. **Git Check:** Run `git status` in the terminal. If there are uncommitted changes, **STOP** and output: *"⚠️ Working tree is dirty. Please commit or stash your changes before running `/refactor-clean` to prevent accidental data loss."*
2. **SSOT Hydration:** Silently read today's Daily SSOT (`.agents/sessions/YYYY-MM-DD-session.md`) to establish context and locate the `📝 Checkpoint Ledger`.
3. **Cleaner Skill:** Silently load `.agents/skills/refactor-cleaner.md` to establish strict deletion safety rules and dynamic import checks.

### Step 2: Discovery & Token Protection
1. **Scan:** Run ecosystem tools (e.g., `npx knip`, `npx ts-prune`, `depcheck`) or targeted `grep` to find exports with zero imports.
2. **Batch Limit:** Do NOT process the entire output. Select a maximum batch of **5 to 10 SAFE items** to process in this run to prevent context collapse.

### Step 3: Triage & Categorization
Sort your selected batch:
* 🟢 **SAFE:** Unused utilities, orphaned CSS/types, or internal test mocks. -> *Queue.*
* 🟡 **CAUTION:** Preact UI components or hooks. -> *Search for dynamic imports (`import()`) before queueing.*
* 🔴 **DANGER:** Config files (`vite.config.ts`), `index.html`, or **ANY file referenced in `manifest.json`** (e.g., background/content scripts). -> *Skip entirely.*

### Step 4: The Atomic Deletion Loop (Terminal Mandate)
For every queued item, execute this loop one at a time:
1. **Baseline Verification:** Run `npx vitest run` AND `npm run build`. Confirm both pass. (If they fail before you start, STOP and abort).
2. **Removal:** Delete the dead file OR remove the unused dependency (`npm uninstall <package>`).
3. **Validation Run:** Re-run Vitest AND the Vite build.
4. **Branching Logic:**
   * *If PASS:* Stage the deletion silently (`git rm <file>` or `git add package.json`).
   * *If FAIL:* Immediately revert (`git restore <file>`). If `package.json` was reverted, run `npm install`. Permanently skip this item for this run.

### Step 5: State Synchronization & Restore Point
You MUST secure the clean state:
1. **Autonomous Commit:** Execute: `git commit -m "chore(cleanup): removed [X] dead files/dependencies"`
2. **SSOT Sync:** Open the Daily SSOT. If any deleted files were listed in the `📁 Active File State` table, remove their rows.
3. **Ledger Update:** Append to the `📝 Checkpoint Ledger`: `**[Time] - Cleanup:** ✅ Removed [X] dead items. Restore Hash: [Hash]`.

### Step 6: Final Output
Output ONLY this concise confirmation panel:

> 🧹 **Dead Code Cleanup Report**
> 
> **Actions Taken:**
> * 🗑️ **Deleted:** `[X] unused functions, [Y] unused files, [Z] dependencies`
> * ⏭️ **Skipped:** `[Count] items (Tests failed or flagged as DANGER)`
> * 💾 **Estimated Savings:** `~[Number] lines removed`
> 
> **Status:** 🟢 Validated by Vitest & Build.
> **Restore Point:** `[Short Commit Hash]`
> **Action Required:** Type **"Continue"** to process the next batch of dead code, or return to feature development.

---

## Strict Anti-Patterns (NEVER DO THESE)
* ❌ **Mixing Concerns:** NEVER rewrite or merge active functions during this command. Strictly DELETION.
* ❌ **Blind Deletes:** NEVER delete without running the test/build suite before AND after.
* ❌ **Mass Deletion:** NEVER delete multiple unconnected files in a single step. You must know exactly which file caused a failure to revert cleanly.