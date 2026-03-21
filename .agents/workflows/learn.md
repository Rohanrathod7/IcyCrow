---
description: Extract a newly solved problem, architectural pattern, or debugging victory into a permanent skill file. This unified command performs a silent audit, passes the knowledge through strict quality gates, checks for contradictions, routes the knowledge
---

# COMMAND: /learn

## Core Intent
Extract a newly solved problem, architectural pattern, or debugging victory into a permanent, version-controlled skill file. This command performs a silent audit, passes knowledge through strict quality gates, checks for contradictions, and generates a reviewable artifact before saving.

## Syntax & Arguments
* `/learn` -> Audits the most recent checkpoints in the SSOT to extract a skill.
* `/learn [specific topic]` -> Focuses the extraction explicitly on the requested topic.

## Execution Protocol
When invoked, execute the following steps sequentially and silently. Do NOT print the drafted file directly to the chat window.

### Step 1: The Silent Audit & SSOT Sync
1. Read the `📝 Checkpoint Ledger` in the active Daily SSOT file (`.agents/sessions/YYYY-MM-DD-session.md`) to isolate the root cause and the exact fix of the recent victory.
2. **Conflict Check:** You MUST use your file search tools to scan `.agents/skills/` for keyword overlap. Check if this new pattern contradicts an existing skill file. Do not hallucinate folder contents.

### Step 2: Strict Quality Gates
The extracted pattern MUST pass these four gates. If it fails *any* of them, the verdict must be **Drop**.
1. **The MV3/Local-First Gate:** Does this violate our zero-cloud, 100% local architecture? (If it relies on external APIs or Node servers, DROP).
2. **The Generalization Test:** Does this solve a *class* of problems, or just one hyper-specific line of code? (If it cannot be applied to future files, DROP).
3. **The Evidence Test:** Has this solution actually been proven to work via terminal output, test pass, or user confirmation in the SSOT? (If it is an untested hypothesis, DROP).
4. **The Atomicity Test:** Can this pattern be understood on its own? (If it requires reading 5 other deeply coupled project files to make sense, DROP).

### Step 3: Verdict & Artifact Generation
Determine the action: `Drop` (failed gates), `Absorb` (>70% overlap with an existing skill), `Replace` (contradicts an outdated skill), or `Save` (passed gates, new concept).

Generate an artifact named `learn-proposal.md` in the `.agents/artifacts/` folder (create the folder silently if it does not exist). Use the exact template below, replacing the bracketed placeholders.

---
# 🧠 Skill Extraction Proposal

**Verdict:** [Save | Absorb into <Filename> | Replace <Filename> | Drop]
**Rationale:** [1-2 sentences explaining exactly which Quality Gates it passed/failed]

*(If Verdict is DROP, stop writing the file here.)*
*(If Verdict is ABSORB, only output the exact Markdown block to be appended to the existing skill file.)*

## 📄 Proposed File Content (For SAVE / REPLACE)
**Target Path:** `.agents/skills/[kebab-case-filename].md`

[BEGIN FILE CONTENT]
---
description: [Under 130 characters]
domain: [e.g., preact-ui, mv3-service-worker, indexeddb, vitest]
triggers: [1-2 broad scenarios when the AI should retrieve this. e.g., "When configuring an MV3 service worker"]
---
# [Descriptive Pattern Name]

**Context:** [Brief description of the scenario where this applies]

## Problem
[What exact problem or error this solves - be highly specific]

## Solution
[The technical pattern, technique, or workaround. Strip out project-specific boilerplate.]

## Example
[Concise code example showing the implementation]
[END FILE CONTENT]
---

### Step 4: Final Output
Output ONLY this concise confirmation panel to the chat:

> 💡 **Extraction Evaluated**
> * **Artifact:** `[Link to .agents/artifacts/learn-proposal.md]`
> * **Verdict:** `[Save / Absorb / Replace / Drop]`
> * **Action Required:** Please review the artifact. Reply with "Approve", provide edit instructions, or say "Cancel".

### Step 5: Execution (Wait for User)
STOP. Wait for the user to reply. Upon user approval, use your file system tools to write the proposed Markdown block to the target path in `.agents/skills/`. If `Replace`, delete the old file first. Output a final green checkmark.