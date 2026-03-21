---
description: Formally close an active feature. Archive the temporary plan, update master architectural blueprints, and clear the daily SSOT dashboard.
---

# COMMAND: /ship

## Core Intent
Formally close an active feature. Archive the temporary plan, update master architectural blueprints, and clear the daily SSOT dashboard.

## Syntax & Arguments
* **Standard:** `/ship` -> Ships the current `🧵 Active Thread` listed in the SSOT.
* **Targeted:** `/ship [feature]` -> Ships a specific feature.

## Execution Protocol
Execute sequentially and silently.

### Step 1: Context & Archiving
1. Read the Daily SSOT (`.agents/sessions/YYYY-MM-DD-session.md`) to identify the active `@plan-[feature].md`.
2. Move the plan file from `.agents/artifacts/` to `.agents/artifacts/archive/`.

### Step 2: Master Blueprint Sync
1. Open `Docs/architecture/Execution_Plan.md` (and `LLD.md` if applicable).
2. Locate the section for the shipped feature.
3. Update its status to `✅ COMPLETED` and add a 1-sentence technical summary of the implementation.

### Step 3: SSOT Reset & Restore Point
1. **Thread Cleanup:** In the SSOT, change the `🧵 Active Thread` to `Idle: Waiting for command`.
2. **File Dashboard:** Empty the `📁 Active File State` table (reset to `None | 🟢 Clean`).
3. **Ledger:** Append: `**[Time] - Ship:** 🚀 Feature [Name] completed and archived.`
4. **Autonomous Commit:** Stage the `Docs/` and `artifacts/` changes. Execute: `git commit -m "chore(ship): finalized and archived [Feature]"`

### Step 4: Final Output
Output ONLY this panel:
> 🚀 **Feature Shipped: `[Feature Name]`**
> * **Plan:** Archived.
> * **Master Docs:** Updated (`Execution_Plan.md`).
> * **Workspace:** Clean slate ready.
> * **Action Required:** Run `/plan` for your next feature, or `/session-end` if done for the day.