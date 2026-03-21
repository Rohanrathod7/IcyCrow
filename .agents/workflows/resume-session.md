---
description: Hydrate a fresh Antigravity agent chat window with the active Daily SSOT using an explicit `@file` tag. This command bridges the new agent into the current context without overwriting files
---

# COMMAND: /resume-session

## Core Intent
Hydrate a fresh Antigravity agent chat window with the active Daily SSOT using an explicit `@file` tag. This command bridges the new agent into the current context without overwriting files, archiving data, or destroying the mid-day checkpoints of parallel agents.

## Syntax & Arguments
The user must invoke this command using the Antigravity native `@file` reference. Parse the input to determine behavior:
* **Passive Join:** `/resume-session @[filename]` -> Reads the context, links to the SSOT, and waits for instructions. Does not create a new thread.
* **Active Join & Pivot:** `/resume-session @[filename] Starting [Topic/Slice]` -> Reads the context AND immediately injects a new active thread into the SSOT file for this specific agent.

## Execution Protocol
When invoked, execute the following steps sequentially and silently. Do NOT print the file contents or your internal thought process to the chat.

### Step 1: Context Rehydration (Token-Optimized)
Read the explicitly tagged `@file` provided by the user. Do NOT modify its metadata or closed/open status.
* **The State:** Read the `🧵 Active Threads` to understand what other parallel agents are currently doing. 
* **The History:** Read the last 3 entries of the `📝 Checkpoint Ledger` to understand the immediate past actions.
* **The Rules:** Load the global `.agents/rules.md`.
* **The Blueprint (If Applicable):** If the user mentioned a specific Slice (e.g., S6) in their prompt, read `Docs/architecture/LLD.md` ONLY for the technical requirements related to that slice.

### Step 2: Thread Injection (If Active Join)
If the user provided a topic or slice target in the command (e.g., "Starting Slice 6"), you must establish your presence in the shared memory:
* Locate the `🧵 Active Threads` section of the `@file`.
* Inject a NEW bullet point for your specific track: `* [Topic/Slice]: Hydrating context and ready to execute.`

### Step 3: Final Output
Output ONLY this console-style confirmation panel to prove you have successfully hooked into the shared memory matrix:

> 🔄 **Session Resumed & Hydrated**
> * **Source:** `[Filename]`
> * **Rules:** Loaded `.agents/rules.md`
> * **Action:** `[State "Monitoring active threads" OR "Added new thread for [Topic]"]`
> * **Status:** I am perfectly synced with the Daily SSOT. Awaiting your command.