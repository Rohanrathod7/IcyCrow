---
description: The /checkpoint command acts as the deterministic "Save State" for our Incremental Development Workflow. It bridges the gap between the active coding session and the version control system
---

# COMMAND: /checkpoint

## Core Intent
Capture deterministic state to the daily SSOT file. Supports multiple concurrent agents via thread tracking, maintains a token-efficient file dashboard, and automatically syncs the working state to version control to prevent progress loss.

## Syntax & Arguments
The user may invoke this command in several ways. You MUST parse the input to determine the behavior:
* **Standard:** `/checkpoint [summary]` (e.g., `/checkpoint XPath fallback working`) -> Updates current thread.
* **Explicit Tag:** `/checkpoint @[filename] [summary]` -> Targets the exact `@file` provided.
* **State Transition:** `/checkpoint Finished [Topic A]. Moving to [Topic B]` -> Closes old thread, opens new one.

## Execution Protocol
Execute the following steps sequentially and silently. Do NOT print the file contents or git diffs to the chat window.

### Step 1: Targeting & Verification
* If the user provided an `@file` tag, use that file strictly.
* If no `@file` is provided, find the single unclosed `.md` file in `.agents/sessions/` (e.g., `YYYY-MM-DD-session.md`).
* **If no session exists:** Stop. Output: *"⚠️ No active session found. Please run `/session-start`."*

### Step 2: Evidence Gathering
Analyze the recent workspace activity to prove the code works.
* Identify specific terminal outputs, Vitest results, or lack of build errors.
* If testing UI components without terminal logs, accept the user's explicit confirmation in the prompt as the source of truth.

### Step 3: Artifact Update (Token-Optimized)
Modify the daily SSOT `.md` file surgically to prevent token bloat:

1. **Thread & State Management:** Locate the `🧵 Active Threads` section.
   * *If Standard Input:* Overwrite your specific active thread bullet point with the new `[summary]`.
   * *If State Transition:* Mark the old thread as `✅ Complete: [Topic A]` and append a new bullet: `* [Topic B]: Initializing...`
   Ensure that when a plan is approved, the checkpoint reflects that the "Source of Truth" has shifted from the LLD to the Plan Artifact.
2. **Prune & Update File Dashboard:** Overwrite the `📁 Active File State` table. 
   * *Pruning Rule:* ONLY list files that are actively `🔄 In Progress` or `❌ Broken`. If a file was completed in this checkpoint, SILENTLY REMOVE IT from the table. Do not exceed 5 rows.
3. **Append to Ledger:** Append a new entry to the bottom of the `📝 Checkpoint Ledger`:
   > **[Current Time] - Checkpoint:** ✅ [Exact text provided by user] — **Evidence:** [Cite specific verification]

### Step 4: Autonomous Version Control (The Save State)
Bind this memory snapshot to the codebase using your terminal tools.
1. Stage ONLY the specific code files modified during this checkpoint (do not stage the session markdown file itself).
2. Execute a git commit silently in the background. 
3. **Commit Message Formatting:** You MUST prefix the commit with `chore(checkpoint):` or `wip:` (e.g., `chore(checkpoint): DOM Anchoring XPath fallback working`). Do NOT push to a remote origin.

### Step 5: Final Output
Output ONLY this concise confirmation panel to the chat:

> 💾 **Checkpoint Saved & Committed**
> * **Time:** [Current Time]
> * **Commit Hash:** `[Short Hash]`
> * **Logged:** `[Brief 5-word summary of what worked]`
> * **Active Thread:** `[Restate the updated Thread or Transition]`