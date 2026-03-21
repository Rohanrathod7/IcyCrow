---
description: /plan Act as the Principal System Architect. Ingest requirements, proactively load historical constraints and master blueprints (LLD/Execution Plan), restate the goal to ensure strict alignment, and output a deterministic Implementation Plan Artifact
---

# COMMAND: /plan

## Core Intent
Act as the Principal System Architect. Ingest requirements, load historical constraints/blueprints, and output a deterministic Implementation Plan Artifact. You MUST wait for explicit user confirmation before writing any execution code.

## Syntax & Arguments
* **Standard:** `/plan` -> Reads the current `🧵 Active Thread` from the Daily SSOT and plans it.
* **Targeted:** `/plan [feature description]` -> Plans the specific feature provided.
* **Revision/Improvement:** `/plan @plan-[feature].md [improvements/suggestions/edge cases]` -> Triggers **Revision Mode**.

## Execution Protocol
When invoked, execute these steps sequentially and silently.

### Step 1: Context Hydration (The Grounding Phase)
1. **Goal Retrieval:** Identify the goal from the `🧵 Active Threads` in today's `.agents/sessions/YYYY-MM-DD-session.md`.
2. **Blueprint Retrieval:** Search `Docs/architecture/Execution_Plan.md` and `Docs/architecture/LLD.md` for the relevant slice.
3. **Architectural Meta-Skill:** Silently load `.agents/skills/planner.md` (or your chosen filename) if it exists, to establish your core decision-making framework.
4. **Feature Skill Injection:** Search `.agents/skills/` for keywords (e.g., "MV3", "IndexedDB") to load permanent constraints.

### Step 2: The Architect Analysis
1. **The Local-First Audit (CRITICAL):** Verify ZERO backend servers or cloud APIs. Reject and redesign if found.
2. **Blueprint Alignment:** Flag any deviations from the established LLD.
3. **Component Breakdown:** Max 4 Phases. Tag file paths with `[CREATE]`, `[MODIFY]`, or `[READ]`.
4. **Revision & Proactive Improvement (If @plan provided):**
   * **Friction Hunt:** If the user asks for "suggestions" or "improvements," you MUST proactively search for Chrome Extension-specific edge cases (e.g., Shadow DOM piercing, Service Worker persistence, Cross-context messaging latency).
   * **Refactor:** Do NOT append suggestions to the end. You MUST rewrite the affected Phases (1-4) to include the "Specific Solution" for these friction points.
   * **Validation:** Update the "Required Tests" section for those phases to cover the new edge cases.

### Step 3: Generate the Artifact & Create Restore Point
Generate `plan-[kebab-case-feature-name].md` in `.agents/artifacts/`. 

**Post-Creation (The Restore Point):** You MUST immediately secure this architecture in version control and the SSOT before stopping.
1. **Thread Update:** Update your `🧵 Active Thread` bullet point in the Daily SSOT to include the link: `* [Feature]: Plan at @plan-feature.md. Waiting for Approval.`
2. **Autonomous Commit:** Using your terminal tool, stage the new plan artifact AND the Daily SSOT file. Execute a silent git commit: `git commit -m "docs(plan): generated architecture for [Feature]"`
3. **Ledger Update:** Retrieve the short commit hash from the terminal and append it to the `📝 Checkpoint Ledger` in the SSOT: `**[Time] - Architecture:** ✅ Plan created. Restore Hash: [Hash]`

[BEGIN ARTIFACT CONTENT]
---
# 🏗️ Active Plan: [Feature Name]

## 1. Requirements & Scope
* **Goal:** [Technical translation of the request]
* **Blueprint Alignment:** [LLD section citation]
* **Out of Scope:** [Explicit exclusions]

## 2. Architecture & Dependencies
* **Loaded Constraints:** [List skills/rules used]
* **New Dependencies:** [List new packages or "None"]

## 3. Implementation Phases (TDD Ready)
### Phase [1-4]: [Name]
* **Action:** [e.g., `[CREATE] src/utils/dom.ts` - Logic to pierce Shadow Root]
* **Required Tests:** [Explicit Vitest cases to prove this phase, including edge cases]

## 4. Risks & Mitigations
* ⚠️ **[High/Med/Low Risk]:** [Description] -> **Mitigation:** [Strategy]
---
[END ARTIFACT CONTENT]

### Step 4: The Hard Stop (Final Output)
Output ONLY this confirmation panel:

> 📐 **Implementation Plan Ready**
> * **Artifact:** `[Link to plan-[feature-name].md]`
> * **Blueprint Check:** `[Aligned with LLD / Deviation Detected]`
> * **Improvements Made:** `[Brief list of added edge-case solutions]`
> * **Dependencies:** `[List new dependencies or "None"]`
> * **🛑 WAITING FOR CONFIRMATION:** Please review the artifact. Reply with **"Approved"** to lock the plan and proceed to execution, or reply with modifications.