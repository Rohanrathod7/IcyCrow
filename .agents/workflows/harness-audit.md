---
description: harness-audit Run a deterministic, reproducible repository audit and return a prioritized scorecard.
---

# COMMAND: /harness-audit

## Core Intent
Run a deterministic, reproducible repository audit and return a prioritized scorecard. This command evaluates the workspace across 7 fixed dimensions. You are a parser, not a judge. You MUST use the output of the deterministic script and integrate the results into the Daily SSOT.

## Syntax & Arguments
* **Standard:** `/harness-audit` -> Audits the 'repo' scope and outputs text.
* **Targeted:** `/harness-audit [scope: repo|hooks|skills|commands|agents] [--format text|json]`

## Execution Protocol
When invoked, execute these steps sequentially and silently.

### Step 1: Pre-Flight Engine Check
1. Check if `scripts/harness-audit.js` exists.
2. *Fallback:* If it does not exist, STOP. Output: *"⚠️ Deterministic engine not found. Reply **'Generate Engine'** to scaffold the standard `harness-audit.js` file."* *(If the user replies 'Generate Engine', scaffold a Node.js script that outputs JSON with the 7 required categories, then stop).*

### Step 2: The Deterministic Execution (Terminal Mandate)
1. Execute in the terminal: `node scripts/harness-audit.js [scope || 'repo'] --format [format || 'text']`
2. **Crash Check:** If the terminal returns a stack trace, STOP. Output the error and instruct the user to run `/build-fix`.
3. Capture the exact standard output (`stdout`).

### Step 3: Strict Parsing & Formatting
* **Branch A (`--format json`):** Output the raw, naked JSON string EXACTLY as provided by the script. Halt execution. Do not write markdown blocks.
* **Branch B (`--format text`):** Parse the script's output to generate the Scorecard Artifact without altering quantitative scores. Proceed to Step 4.

### Step 4: Generate the Scorecard Artifact
Generate `harness-scorecard.md` in the `.agents/artifacts/` folder.

[BEGIN ARTIFACT CONTENT]
---
# ⚙️ Harness Audit Scorecard

**Scope:** `[scope]` | **Date:** [Current Date]
**Overall Score:** `[overall_score]/[max_score]`

## Category Breakdown
* **Tool Coverage:** `[X]/10`
* **Context Efficiency:** `[X]/10`
* **Quality Gates:** `[X]/10`
* **Memory Persistence:** `[X]/10`
* **Eval Coverage:** `[X]/10`
* **Security Guardrails:** `[X]/10`
* **Cost Efficiency:** `[X]/10`

## 🚨 Failed Checks (Evidence)
*(Extract exact paths from script output)*
* `[exact/file/path.ext]` - [Reason for failure]

## 🎯 Top Actions & Next Steps
1. **[Category]:** [Actionable fix] (`[Target File Path]`)
2. **[Category]:** [Actionable fix] (`[Target File Path]`)
3. **[Category]:** [Actionable fix] (`[Target File Path]`)
---
[END ARTIFACT CONTENT]

### Step 5: State Synchronization (SSOT)
You MUST log this audit so other agents are aware of the workspace health.
1. Open today's Daily SSOT (`.agents/sessions/YYYY-MM-DD-session.md`).
2. Append to the `📝 Checkpoint Ledger`: `**[Time] - Audit:** 🛡️ Harness audited. Score: [Overall Score]. Primary Vulnerability: [Lowest Category].`

### Step 6: Final Output
Output ONLY this concise confirmation panel:

> 🛡️ **Harness Audit Complete: `[Overall Score]`**
> * **Artifact:** `[Link to harness-scorecard.md]`
> * **Primary Vulnerability:** `[Lowest scoring category]`
> * **SSOT Updated:** Ledger logged.
> * **Action Required:** Reply with **"Apply Action [1/2/3]"** to draft a repair plan, or **"Acknowledge"** to close.

### Step 7: Remediation Protocol (Post-Approval)
If the user replies "Apply Action [X]":
1. **Do not blindly edit files.** Transition to the Architect persona.
2. Update the `🧵 Active Thread` in the SSOT to: `* [Audit Repair]: Planning fix for Action [X]...`
3. Automatically trigger the logic of the `/plan` command to generate a specific `@plan-[fix-name].md` artifact for this vulnerability.
4. Output the standard `/plan` confirmation panel, waiting for approval before execution.