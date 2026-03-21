---
description: Revert the codebase to a previous Git hash WITHOUT erasing the AI's Daily SSOT memory or checkpoint ledger.
---

# COMMAND: /rollback

## Core Intent
Revert the codebase to a previous Git hash WITHOUT erasing the AI's Daily SSOT memory or checkpoint ledger.

## Syntax & Arguments
* **Targeted:** `/rollback [Hash]` -> Reverts to the exact short commit hash.

## Execution Protocol
Execute sequentially and silently using the terminal.

### Step 1: Memory Extraction (The Lifeline)
The SSOT must survive the git reset. Execute these exact terminal commands:
1. `cp .agents/sessions/YYYY-MM-DD-session.md ../temp-ssot-backup.md` (Copy today's session file outside the repo).

### Step 2: The Quantum Rewind
1. Execute: `git reset --hard [Hash]` (This destroys all uncommitted changes and rewinds the codebase).

### Step 3: Memory Injection
1. Execute: `cp ../temp-ssot-backup.md .agents/sessions/YYYY-MM-DD-session.md` (Bring the modern memory back into the rewound repo).
2. Execute: `rm ../temp-ssot-backup.md` (Clean up the temp file).

### Step 4: State Synchronization
Open the newly injected Daily SSOT file:
1. **File Dashboard:** Empty the `📁 Active File State` table, as the workspace is now perfectly clean.
2. **Ledger:** Append: `**[Time] - Rollback:** ⏪ Timeline altered. Codebase reverted to [Hash]. Memory preserved.`
3. **Autonomous Commit:** We must commit the memory injection so the tree is clean. Execute: `git commit -am "chore(rollback): memory preserved after reverting to [Hash]"`

### Step 5: Final Output
Output ONLY this panel:
> ⏪ **Timeline Successfully Altered**
> * **Target Hash:** `[Hash]`
> * **Codebase:** Reverted.
> * **AI Memory (SSOT):** Preserved & Synced.
> * **Action Required:** Check your codebase. You are ready to run `/plan` or `/tdd` on a clean slate.