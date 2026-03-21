---
description: The /session-start command is the foundational entry point for our daily Incremental Development Workflow in the Antigravity IDE. It is designed to initialize a hyper-focused, token-efficient context window for an AI agent before any coding begins.
---

# COMMAND: /session-start

## Core Intent
Initialize today's Single Source of Truth (SSOT) memory file. This acts as the centralized ledger for all agents working today. It prevents context pollution while supporting multiple parallel chat threads.

## Syntax & Arguments
The user may invoke this command in two ways. Parse the input to determine behavior:
* **Clean Slate:** `/session-start` -> Initializes the daily SSOT based strictly on the handoff file. Waits for instructions.
* **Targeted Start:** `/session-start [Target/Slice]` (e.g., `/session-start S5`) -> Initializes the SSOT, sets the first `🧵 Active Thread`, and loads the architectural specs for that target.

## Execution Protocol
When the user invokes `/session-start [optional: target]`, execute these steps sequentially and silently. Do NOT print the full file contents or your internal thought process to the chat.

### Step 1: The "Orphaned State" Failsafe (Concurrency Safe)
Scan `.agents/sessions/` for any `.md` session files lacking a "Closed" status.
* **Concurrency Rule:** Do NOT blindly close all open files. 
* **Action:** 1. If you find a file from a *previous date* (YYYY-MM-DD is less than today), silently append `> 🛑 [Auto-Closed]` to the bottom and move it to `.agents/sessions/archive/`.
  2. If you find an unclosed file for *today* already sitting in the folder, STOP immediately. Output: *"⚠️ Today's SSOT is already active. Please use `/resume-session` to join it without destroying parallel agent memory."*

### Step 2: Naming & Creation
If no active session exists for today, create it in `.agents/sessions/`.
* **Naming:** `YYYY-MM-DD-session.md` (e.g., `2026-03-20-session.md`).
* **Same-Day Collision:** If `YYYY-MM-DD-session.md` already exists in the `/archive/` folder (because the user ran `/session-end` earlier today), increment the name: `YYYY-MM-DD-session-2.md`.

### Step 3: Token-Efficient Hydration
Ground your memory using the absolute minimum tokens required:
1. **The Rules:** Load the global `.agents/rules.md`.
2. **The Handoff:** Locate `.agents/sessions/active-handoff.md`. Extract *only* the most recent "Active Blockers" and "Next Logical Step" verbatim.
3. **The Target (If Provided):** If the user provided a `[Target]` (e.g., `S5`), grep/search `Docs/architecture/Execution_Plan.md` and `Docs/architecture/LLD.md` ONLY for the acceptance criteria and technical requirements of that specific slice. If no target was provided, skip this step.

### Step 4: Artifact Initialization
Create the file using this exact format. Do not deviate.

---
# Daily SSOT: [Current Date]
**Started:** [Current Time]

## 🎯 Hydrated Context
* **From Handoff:** [Insert next steps/blockers from active-handoff.md, or "None"]
* **Loaded Constraints:** `.agents/rules.md`

## 🧵 Active Threads
*(Agents will update their specific threads here via `/checkpoint`)*
* [If Target provided in prompt: `[Target]: Initializing...`]
* [If no Target provided: `Idle: Waiting for command`]

## 📁 Active File State
| File | Status | Notes |
| :--- | :--- | :--- |
| `None` | 🟢 Clean | Workspace initialized |

## 📝 Checkpoint Ledger
---

### Step 5: Final Output
Output ONLY this console-style confirmation panel:

> 🟢 **Session Initialized: Daily SSOT**
> * **File:** `[Link to newly created session file]`
> * **Status:** Clean slate ready.
> * **Active Thread:** `[Restate the Target, or "None"]`
> * **Action:** Type `/plan` to begin architectural breakdown.