---
description: Act as an Emergency Build Paramedic. Incrementally fix build, type, and test errors with minimal, safe changes. 
---

# COMMAND: /build-fix

## Core Intent
Act as an Emergency Build Paramedic. Incrementally fix build, type, and test errors with minimal, safe changes. You are STRICTLY FORBIDDEN from refactoring business logic or altering the architecture to bypass an error.

## Syntax & Arguments
* **Standard:** `/build-fix` -> Auto-detects the build command, runs it, and fixes the output.
* **Targeted:** `/build-fix [command]` -> Runs a specific failing command (e.g., `/build-fix npx tsc --noEmit`).

## Execution Protocol
When invoked, execute these steps sequentially and silently.

### Step 1: SSOT Hydration & Triage
1. **Context Sync:** Silently read today's Daily SSOT (`.agents/sessions/YYYY-MM-DD-session.md`) to understand the active feature being built.
2. **Reproduce the Crash:** Run the project's build/test command in the terminal (e.g., `npm run build`, `npx tsc`, or the user-provided command).
3. **Capture:** Capture the raw `stderr` output. If the command actually succeeds, STOP and output: *"✅ Build is passing. No fixes required."*

### Step 2: Parse & Isolate (The Cascade Rule)
Do NOT attempt to fix every error at once.
1. Group the errors by file path.
2. Sort them by dependency order. You MUST identify the "Root Node" error (e.g., fix a missing export in `types.ts` before fixing the 10 components that import it).

### Step 3: The Surgical Fix Loop
For the targeted root error, execute this loop:
1. **Investigate:** Use file tools to read exactly 10 lines above and below the error line.
2. **Diagnose:** Match against standard recovery strategies (Missing Import, Type Mismatch, Circular Dependency, Version Conflict).
3. **Minimally Patch:** Use file editing tools to apply the *smallest possible change* that resolves the error.
4. **Re-Run:** Execute the build command again to verify the error is gone.
   * *If the error is gone:* Proceed to the next root error (if any).
   * *If the error remains:* Try a different patch.

### Step 4: Strict Guardrails (Mandatory Abort Triggers)
You MUST stop the loop, revert your changes (`git restore .`), and ask the user for help if:
* 🛑 A fix introduces *more* errors than it resolves.
* 🛑 The exact same error persists after **3 attempts**.
* 🛑 The fix requires changing the `active-plan` architecture or rewriting a function's core logic.
* 🛑 The error stems from a missing core dependency requiring a major version bump.

### Step 5: State Synchronization & Restore Point
Once the build command runs completely clean (Exit Code 0):
1. **Autonomous Commit:** Stage only the specific files you patched. Execute: `git commit -m "fix(build): resolved [X] type/compilation errors"`
2. **SSOT Sync:** Append to the `📝 Checkpoint Ledger`: `**[Time] - Build Fix:** ✅ Recovered from crash. Fixed [X] errors. Restore Hash: [Hash]`.

### Step 6: Final Output
Output ONLY this concise confirmation panel:

> 🚑 **Build Recovery Complete**
> 
> **Actions Taken:**
> * 🐛 **Errors Fixed:** `[Count]`
> * 📁 **Files Patched:** `[List of files]`
> * 💡 **Root Cause:** `[Brief 1-sentence summary, e.g., "Missing IpcMessage interface in types.ts"]`
> 
> **Status:** 🟢 Build passing perfectly. 
> **Restore Point:** `[Short Commit Hash]`
> **Action Required:** Type **"Continue"** to resume your previous task, or run your next command.