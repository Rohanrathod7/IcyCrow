---
description: The /session-end command is the critical wrap-up sequence for our Incremental Development Workflow. It safely terminates the active coding session, compresses the day's checkpoints into a high-density handoff artifact, and archives daily logs
---

# COMMAND: /session-end

## Core Intent
Roll up the daily SSOT file, synthesize architectural decisions, extract permanent skills (Continuous Learning), update the active handoff artifact, and safely commit/archive the day's session.

## Syntax & Arguments
* **Standard:** `/session-end` -> Safely closes and commits the current daily SSOT.

## Execution Protocol
When invoked, execute the following steps sequentially and silently.

### Step 0: Pre-Flight Safety Check (Read-Only Terminal)
1. Execute `git status` in your terminal. 
2. *If there are uncommitted/unstaged changes:* STOP immediately. Output: *"⚠️ Uncommitted codebase changes detected. Please run `/checkpoint` to save your work before ending the session."*
3. *If the working tree is clean:* Proceed to Step 1.

### Step 1: Targeting & Audit
1. Locate the active daily session file in `.agents/sessions/` (e.g., `YYYY-MM-DD-session.md`).
2. Read the `🧵 Active Threads` and the `📝 Checkpoint Ledger`. 
3. Identify major architectural decisions, MV3 workarounds, or Preact patterns solved today.

### Step 2: The Continuous Learning Hook
Evaluate if permanent knowledge was gained today that belongs in `.agents/skills/`. Note this internally to present dynamically in Step 6. Do NOT pause execution.

### Step 3: Update the Memory Bridge (`active-handoff.md`)
Locate `.agents/sessions/active-handoff.md`.
* **Preservation Rule:** You MUST retain any unresolved items under `🚧 Blockers`. Never delete a blocker unless today's ledger proves it was resolved.
* **Overwrite using this exact structure:**

---
# Active Handoff
**Last Updated:** [Current Date & Time]
**Recent Activity:** [Briefly list the threads worked on today]

## 🏛️ Decisions Made Today
*(List permanent architectural choices or tradeoffs accepted today. Write "None" if n/a.)*
* **[Decision]** — Reason: [Why it was chosen]

## 🚧 Active Blockers & Open Questions
*(List unresolved items from today's threads that tomorrow's session MUST address first.)*
* [Blocker or Question]

## ⏭️ Exact Next Step
*(Translate the final `/checkpoint` into the single most important technical action to start with tomorrow. Be precise.)*
---

### Step 4: Archive the Daily SSOT
1. Append `> 🛑 **[SESSION CLOSED]**` to the very top of today's active session file.
2. Ensure `.agents/sessions/archive/` exists.
3. Move the closed session file into the `/archive/` directory using file-system tools.

### Step 5: The Lockdown Commit & Cloud Sync
You must leave the repository in a clean state.
1. **Autonomous Commit:** Stage the updated `active-handoff.md` and the archived session file. Execute: `git commit -m "chore(session): archived daily SSOT and generated handoff"`
2. **Cloud Sync:** Execute: `git push origin HEAD` (If this fails due to upstream issues, silently ignore, but the local commit MUST succeed).

### Step 6: Final Output
Output ONLY this concise confirmation panel:

> 🛑 **Session Closed & Handoff Prepared**
> * **Decisions Logged:** `[Count]`
> * **Active Blockers:** `[Count]`
> * **Next Step Tomorrow:** `[Brief summary of tomorrow's first task]`
> * **Backup:** Session archived, committed, and pushed to remote.
> 
> 💡 **Skill Extraction:** I noticed we solved `[Brief description of a complex bug/pattern]`. Reply with **`/learn`** if you want me to extract this into a permanent `.agents/skills/` rule before you close the window.