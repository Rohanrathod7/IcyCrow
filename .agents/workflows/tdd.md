---
description: /tdd Act as a strict, execution-focused engineer
---

# COMMAND: /tdd

## Core Intent
Act as a strict, execution-focused engineer enforcing the RED -> GREEN -> REFACTOR methodology. Your objective is to implement the phases outlined in the active Plan Artifact. You are strictly forbidden from writing implementation code before physically running and verifying a failing test via your terminal tools.

## Syntax & Arguments
* **Standard:** `/tdd` -> Finds the active plan in the Daily SSOT and executes the next incomplete phase.
* **Targeted:** `/tdd Phase [X]` -> Executes a specific phase from the active plan.

## Execution Protocol
When invoked, execute these steps sequentially. 

### Step 1: Context Hydration (The SSOT Route)
Do not scan the entire codebase. 
1. **Find the Target:** Read today's Daily SSOT (`.agents/sessions/YYYY-MM-DD-session.md`). Look at your `🧵 Active Thread` to find the `@plan-[feature].md` link.
2. **Read the Blueprint:** Open that specific plan artifact. Identify the exact Phase you are executing.
3. **File Check:** Check if the target file(s) and test file(s) for this phase exist. Note their intended paths to be created in Step 2.
4. **Execution Skill:** Silently load `.agents/skills/tdd-guide.md` to establish testing constraints (mocking, JSDOM, isolation).

### Step 2: SCAFFOLD & RED (Write Failing Test)
Prove the code does not exist or fails requirements before building it.
1. **Scaffold:** Define the strict interfaces/types required by the plan.
2. **Mocking (CRITICAL):** * *For MV3:* Use Vitest `vi.mock()` to stub `chrome.*` APIs.
   * *For Preact:* Ensure the test runs in a DOM environment (add `// @vitest-environment jsdom`).
3. **Write Test:** Write Vitest unit/integration tests covering the phase requirements. Name them `[filename].test.ts` adjacent to the target file.
4. **The Terminal Mandate:** Use your Terminal Tool to run the test as a single execution (`npx vitest run <filepath>`). 
5. **Evaluate:** You MUST wait for the tool output internally. If the test PASSES on the first try, your test is flawed. Fix it until the terminal output is RED.

### Step 3: GREEN (Minimal Implementation)
*(Only proceed here once Step 2 yields a RED terminal output).*
1. Write *only* the exact code required to make the failing test pass. Do not over-engineer (YAGNI).
2. Use your Terminal Tool to re-run the test suite (`npx vitest run <filepath>`).
3. **Verification:** Ensure the terminal outputs GREEN (Pass). If it fails after 3 attempts, STOP and ask the user for help.

### Step 4: REFACTOR & COVERAGE
1. Clean up readability, extract magic numbers, and optimize Big-O complexity.
2. Run coverage: `npx vitest run --coverage <filepath>`. 
3. **Threshold Check:** Coverage MUST be at least **80%**. If lower, return to Step 2 and write missing tests.

### Step 5: State Synchronization & Restore Point
You MUST update the Daily SSOT and version control to secure this completed phase:
1. **Autonomous Commit:** Using your terminal tool, stage the modified code files, the new test files, and the Daily SSOT. Execute a silent git commit: `git commit -m "feat([Feature]): completed phase [X] - [Phase Name]"`
2. **Update Dashboard:** Open `.agents/sessions/YYYY-MM-DD-session.md` and update the `📁 Active File State` table: Mark the completed files as `🟢 Clean` or `🔄 In Progress` if incomplete.
3. **Ledger Update:** Retrieve the short commit hash from the terminal and append it to the `📝 Checkpoint Ledger`: `**[Time] - TDD:** ✅ Phase [X] passed. Coverage: [Y]%. Restore Hash: [Hash]`

### Step 6: Final Output
Output ONLY this concise confirmation panel to the chat:

> 🧪 **TDD Cycle Complete & Secured**
> * **Phase:** `[Phase Name from Plan]`
> * **Status:** 🟢 GREEN (Tests Passed)
> * **Coverage:** `[X]%` (Verified via terminal)
> * **Restore Point:** `[Short Commit Hash]` (Safe to reset here if next phase fails)
> * **Action Required:** Reply **"Continue"** to proceed to the next phase, or request modifications.