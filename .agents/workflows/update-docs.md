---
description: /update-docs Ensure project documentation strictly mirrors the *current reality* of the codebase. This command operates in a Dual-Mode
---

# COMMAND: /update-docs

## Core Intent
Ensure project documentation strictly mirrors the *current reality* of the codebase. Operates in Dual-Mode:
1. **AI Memory (Codemaps):** Ultra-lean structural indexes for efficient AI context loading.
2. **Human Docs:** Surgical, localized edits to `README.md` or `docs/` without destroying custom formatting.

## Syntax & Arguments
* **Standard:** `/update-docs` -> Evaluates all uncommitted changes or the last commit.
* **Targeted:** `/update-docs @[filename]` -> Forces a doc sync based on a specific file's changes.

## Execution Protocol
When invoked, execute these steps sequentially and silently.

### Step 1: Ground Truth & SSOT Hydration
1. **The Reality Check:** Run `git diff --name-status HEAD` (uncommitted) or `git diff --name-status HEAD~1 HEAD` (last commit) to isolate what changed.
2. **SSOT Context:** Silently read today's Daily SSOT (`.agents/sessions/YYYY-MM-DD-session.md`). Look at the `📝 Checkpoint Ledger` to understand the intent behind the recent changes.
3. 🔴 **DANGER (Auto-Gen Guardrail):** Filter out all auto-generated files (`dist/`, `node_modules/`, `package-lock.json`).

### Step 2: AI Context Sync (Token-Lean Codemaps)
Draft updates for the `docs/CODEMAPS/` directory.
1. **Target:** Map changes to the right codemap (e.g., `architecture.md`, `extension-messaging.md`). Create them if missing.
2. **The Token Guardrail:** * Must include `[LAST UPDATED: YYYY-MM-DD]` at the top.
   * **No Prose:** Strictly forbid paragraphs. Use ONLY bullet points, file paths, and ASCII arrows.
   * **Chains:** Represent logic linearly (e.g., `UI Button -> chrome.runtime.sendMessage -> background.ts`).

### Step 3: Human Docs Sync (Surgical Edits)
Draft updates for human-facing docs (`README.md`, `PRD.md`).
1. **The Anti-Rewrite Protocol:** You are STRICTLY FORBIDDEN from rewriting the entire file. Locate the exact Markdown heading (`##`) where the update belongs.
2. Draft *only* the specific lines to be replaced, appended, or deleted.

### Step 4: Generate the Sync Proposal Artifact
Generate `doc-sync-proposal.md` in `.agents/artifacts/`.
* **Post-Creation:** Update the `🧵 Active Thread` in the Daily SSOT: `* Docs: Proposal ready at @doc-sync-proposal.md. Waiting for Approval.`

[BEGIN ARTIFACT CONTENT]
---
# 📝 Documentation Sync Proposal
**Context:** Based on recent Checkpoint Ledger activity.

## 🤖 AI Context (Codemaps)
* **Target:** `docs/CODEMAPS/[filename].md`
* **Proposed Updates:** * `[e.g., Added new message listener chain for Tab Syncing]`

## 🧑‍💻 Human Docs (Surgical Edits)
* **Target:** `[e.g., README.md]`
* **Location:** Under heading `## [Specific Header]`
* **Proposed Change:** ```markdown
[Draft the exact new text/bullet point here.]
```
---

### Step 5: Final Output & Execution
Output ONLY this concise confirmation panel to the chat:

> 🗺️ **Doc Sync Evaluated**
> * **Artifact Generated:** `[Link to doc-sync-proposal.md]`
> * **Codemaps Affected:** `[List files]`
> * **Human Docs Affected:** `[List files or "None"]`
> * **🛑 WAITING FOR CONFIRMATION:** Reply with "Commit Docs" to apply these changes.

### Step 6: Execution Protocol (Post-Approval)
If the user replies with "Commit Docs", you must use file-system tools to apply the exact drafted changes. For Human Docs, use surgical search-and-replace to ensure you do not overwrite the entire file. Output a final green checkmark.