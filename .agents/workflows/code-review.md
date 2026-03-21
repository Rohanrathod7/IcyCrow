---
description: /code-reviewer command acts as a strict Continuous Integration (CI) gate. It must verify that the code aligns perfectly with `active-plan.md` and strictly enforces quantitative quality thresholds.
---

# COMMAND: /code-review

## Core Intent
Act as a Principal Security and Performance Auditor. Review recently executed code for Chrome Extension MV3 edge cases, memory leaks, and brittle logic. Act as a strict CI gate, apply fixes, and secure the audited state in version control.

## Syntax & Arguments
* **Standard:** `/code-review` -> Audits the files currently listed in the SSOT `📁 Active File State` table.
* **Targeted:** `/code-review @[filename]` -> Audits a specific file.

## Execution Protocol
When invoked, execute these steps sequentially and silently.

### Step 1: Context Hydration (Strict Scoping)
1. **Target Identification:** Read the `📁 Active File State` table in today's Daily SSOT (`YYYY-MM-DD-session.md`). Load those specific files into context.
2. **Alignment Check:** Read your `🧵 Active Thread` to find the linked `@plan-[feature].md` artifact. Determine if the uncommitted changes strictly align with the planned phases.
3. **Audit Skill:** Silently load `.agents/skills/reviewer.md` (or your chosen filename) to establish your strict security, MV3 lifecycle, and code quality thresholds.

### Step 2: The Quantitative & Security Audit
Analyze the target files against these strict thresholds. Do not bend these rules.

🔴 **Security Issues (CRITICAL)**
* **Extension Messaging:** Insecure `chrome.runtime.onMessage` listeners (e.g., executing code without verifying the `sender`).
* **XSS & DOM:** Any raw HTML injection (`innerHTML`, Preact's `dangerouslySetInnerHTML`) NOT strictly wrapped in `DOMPurify.sanitize()`. 
* **Storage Leaks:** Storing sensitive API keys in `chrome.storage.local` without encryption.
* **External Fetch:** Any `fetch()` calls to external domains (Violates Local-First).

🟠 **Code Quality (HIGH)**
* **Size Limits:** Flag any function exceeding **50 lines**. Flag any file exceeding **800 lines**.
* **Complexity:** Flag nesting depth exceeding **4 levels** (e.g., `if` inside `for` inside `if`).
* **Resilience:** Missing `try/catch` blocks around async `chrome.*` APIs.
* **Hygiene:** Left-over `console.log`, dead code, or `TODO/FIXME`.

🟡 **Best Practices (MEDIUM)**
* **State/Data:** Mutation patterns in Preact state (demand immutable updates).
* **Scope Creep:** Code added outside the scope of the plan artifact.

### Step 3: Generate the Punch-List (Token Optimized)
Output a concise report directly to the chat using this exact format:

> 🔎 **Unified Code & Security Audit**
> * **Status:** `[🟢 APPROVED | 🛑 BLOCKED - Fixes Required]`
> * **Plan Alignment:** `[Perfect Match | ⚠️ Deviates from plan]`
> 
> *(Omit severity sections that have zero findings)*
> 
> ### 🔴 CRITICAL (Must Fix)
> * `[Filename]` (Line `[#]`): `[1-line snippet of bad code]`
>   * **Issue:** [Description]
>   * **Fix:** [Specific 1-2 lines of corrected code]
> 
> ### 🟠 HIGH (Must Fix)
> * `[Filename]` (Line `[#]`): `[Snippet]`
>   * **Issue:** [Description]
> 
> ***
> * **Next Step:** Reply with `"Fix it"` to automatically resolve these issues, or `"Ignore"` to force approval.

### Step 4: The "Fix It" & Restore Point Protocol
If the user replies `"Fix it"` (or if the status was 🟢 APPROVED from the start), execute the following silently:
1. **Patch:** Use file editing tools to surgically apply the fixes.
2. **Verify:** Run the test suite (`npx vitest run`) to ensure patches didn't break core logic.
3. **Autonomous Commit:** Stage the audited files and the SSOT. Execute: `git commit -m "refactor(audit): resolved security/perf edge cases for [Feature]"`
4. **SSOT Sync:** Append to the `📝 Checkpoint Ledger`: `**[Time] - Audit:** ✅ Code review passed. Restore Hash: [Hash]`.
5. **Final Output:** Output ONLY: `✅ **Audit Secured.** Restore Point: [Short Hash]. Ready for next phase.`