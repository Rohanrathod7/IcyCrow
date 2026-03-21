---
description: Reach 80%+ test coverage by identifying gaps and generating surgical test cases.
---

# Workflow: Coverage & Quality Advisor
**Command:** `/coverage`
**Goal:** Reach 80%+ test coverage by identifying gaps and generating surgical test cases.

## Step 1: Framework Detection & Execution
1. Check for `vitest.config.ts` or `package.json` dependencies.
2. **Action:** Run `npx vitest run --coverage`.
3. **Internal Check:** Parse the `json-summary` or terminal output to identify files below 80%.

## Step 2: Gap Analysis
For every file under 80% coverage, analyze the source code and current test file:
1. Identify **untested branches** (if/else, switch cases).
2. Identify **missing error boundaries** (catch blocks, null checks).
3. Identify **edge cases** (empty arrays, boundary numbers).

## Step 3: Surgical Test Generation
Generate missing tests following the **IcyCrow Test Standard**:
- Use `describe/it/expect` patterns from `tests/`.
- Mock Chrome APIs using `jest-chrome` or manual mocks.
- **Priority:**
    1. **Happy Path:** Valid input flow.
    2. **Error Handling:** Invalid inputs, storage failures.
    3. **Edge Cases:** `null`, `undefined`, empty strings.

## Step 4: Verification & Reporting
1. Present the **Before vs. After** coverage table.
2. Output: "✅ Coverage Target Reached" or "⚠️ Gaps remain in [File Name]".

## Instructions for AI
- DO NOT delete existing tests.
- DO NOT use `node:crypto` (use `@lib/url-utils` or Web Crypto).
- Ensure all tests are independent and stateless.