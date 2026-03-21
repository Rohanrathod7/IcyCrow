---
description: Audit the memory bank to flag stale, conflicting, or redundant knowledge. This command acts as an interactive gardener, using current codebase configuration as the "ground truth" and file-level telemetry to identify deprecated skills
---

# COMMAND: /skill-prune

## Core Intent
Audit the continuous learning memory bank (`.agents/skills/`) to flag stale, conflicting, or redundant knowledge. This command acts as an interactive gardener, using the current workspace architecture as the "ground truth." It operates in a strict "Dry Run" mode until explicitly approved.

## Syntax & Arguments
* `/skill-prune` -> Audits the entire `.agents/skills/` directory.
* `/skill-prune [topic]` -> Audits only skills related to the specified topic (e.g., `/skill-prune storage`).

## Execution Protocol
When invoked, execute the following steps sequentially and silently. Do NOT print full file contents to the chat.

### Step 1: Establish Ground Truth
1. **Read Ground Truth:** Silently scan `package.json`, `manifest.json`, and `.agents/rules.md` to establish the strict MV3, Preact, and Local-First architectural baselines.
2. **Scope Lock:** You are strictly forbidden from looking outside of `.agents/skills/`. 

### Step 2: The Silent Audit
Scan the `.agents/skills/` directory. Evaluate the files against the Ground Truth and their creation/modification dates.
1. **Framework Drift:** Does the skill reference an API or library version that contradicts the Ground Truth? (e.g., references MV2 background scripts instead of MV3 Service Workers). -> *Flag for ARCHIVE.*
2. **Redundancy:** Do two files share >70% of the same concepts, or solve slightly different edge cases of the exact same API? -> *Flag for MERGE.*
3. **Temporary Workarounds:** Check the YAML `status`. Is it flagged as `Temporary Workaround`? If the file is old, the upstream bug might be fixed. -> *Flag for REVIEW.*

### Step 3: Generate the Pruning Proposal Artifact
Do NOT delete, move, or modify any files yet. Generate an artifact named `skill-prune-proposal.md` in the `.agents/artifacts/` folder (create the folder silently if it does not exist). Use the exact template below.

[BEGIN ARTIFACT CONTENT]
---
# ✂️ Skill Pruning Proposal

**Ground Truth Detected:** [Brief list of key constraints, e.g., MV3, Preact, Vite]
**Scope:** `.agents/skills/`

Please review the following recommendations. Reply with the item numbers you approve, or type "Approve All".

## 🗑️ Recommended for Archive (Stale/Deprecated)
*(These will be safely moved to `/archive/` and renamed)*
1. `[Filename]` — **Reason:** [e.g., "Drift: References deprecated MV2 API."]

## 🔗 Recommended for Merging (Redundant)
*(These will be safely combined into a single authoritative file)*
2. Merge `[File A]` into `[File B]` — **Reason:** [e.g., "Both cover indexedDB retry logic."]

## ⚠️ Workarounds to Review
*(Flagged as temporary. Keep, Upgrade, or Archive?)*
3. `[Filename]` — **Issue:** [Brief description of the duct-tape fix]
---
[END ARTIFACT CONTENT]

### Step 4: Final Output
Output ONLY this concise confirmation to the chat:

> 🧹 **Audit Complete: Pruning Proposal Ready**
> * **Artifact:** `[Link to .agents/artifacts/skill-prune-proposal.md]`
> * **Flags:** Found `[X]` archives, `[Y]` merges, and `[Z]` aging workarounds.
> * **Action Required:** Please review the artifact and reply with your explicit approvals (e.g., "Archive 1, Merge 2"). No files have been touched yet.

### Step 5: Execution (Post-Approval)
Wait for the user's reply. Execute the approved actions strictly using these protocols:
* **For Archives (Quarantine Protocol):** Move the approved files to `.agents/skills/archive/` AND change their file extension to `.md.archived`. This prevents IDE context-loaders from reading deprecated skills.
* **For Merges (Distillation Protocol):** Read File A and File B. Rewrite File B into a single, cohesive skill that elegantly covers both concepts without duplicating boilerplate. Move File A to `.agents/skills/archive/` as `.md.archived`.
* Output a final green checkmark confirming the cleanup.