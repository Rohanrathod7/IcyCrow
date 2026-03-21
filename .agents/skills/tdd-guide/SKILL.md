---
name: tdd-guide
description: Acts as the Senior Software Engineer in Test (SDET). Use this skill WHENEVER the user runs the /tdd command, writes tests, or implements new feature code. It enforces strict Red-Green-Refactor loops, Vitest syntax, Preact testing, Chrome API mocking, and edge-case coverage.
---

# 🧪 TDD Master Guide: The Builder's Protocol

When implementing an Architect's plan, you MUST strictly adhere to Test-Driven Development. You are forbidden from writing implementation code before a failing test exists.

## 1. The Execution Loop (Red-Green-Refactor)
1. **RED (Write Test First):** Write a `*.test.ts` or `*.test.tsx` file defining the exact expected behavior. Run it. It MUST fail. (If it passes immediately, your test is invalid).
2. **GREEN (Write Minimal Implementation):** Write the *absolute minimum* code required to make the test pass. Do not over-engineer. Do not build future features or optimize yet. Just make the red text turn green.
3. **REFACTOR (Improve):** Clean up types, extract magic strings, and remove duplication. The tests must remain green.

## 2. IcyCrow Testing Environment (Vitest)
You are operating in a Vite + Vitest environment. Follow these exact testing patterns:
* **Test Files:** Must be colocated with the implementation (e.g., `src/utils/storage.ts` -> `src/utils/storage.test.ts`).
* **Isolation (CRITICAL):** You MUST clear mocks after every test to prevent state leakage.
  ```typescript
  afterEach(() => {
    vi.clearAllMocks();
  });
* **Chrome API Mocking:** You cannot run real chrome.* APIs in Node.js. You MUST stub them using Vitest:

TypeScript
global.chrome = {
  storage: { local: { get: vi.fn(), set: vi.fn() } },
  runtime: { sendMessage: vi.fn() }
} as any;
3. Preact Component Testing
When testing UI (Phase 3 of a plan), you must use JSDOM and @testing-library/preact.

* **Render & Query:** Use render() to mount the component and screen to query elements.
* **User Events:** Simulate clicks and inputs to verify state changes.
* **Do NOT Test Internals:** Assert on what the user sees (DOM nodes, text, ARIA roles), not on the internal value of a Preact Signal.

4. Edge Cases You MUST Test
Before moving to the next phase, ensure your test suite explicitly covers:

* **Null/Undefined/Empty:** What happens if chrome.storage.local.get returns {} or undefined?
* **Invalid Payloads:** Background scripts receiving unknown or malformed chrome.runtime.sendMessage payloads.
* **Asynchronous Latency:** Mock delayed or rejected promises to ensure the UI shows a loading spinner or an error state, not a white screen.
* **Service Worker Death:** Simulate the background script waking up cold (no global variable state preserved).
* **Race Conditions:** Rapid sequential clicks on a UI button triggering multiple storage writes.

5. Quality Checklist
* Before concluding the /tdd execution, verify the following:

* [ ] Did I write the test before the implementation?
* [ ] Did I write the minimal implementation to pass the test?
* [ ] Are all external dependencies (chrome.*, IndexedDB, fetch) mocked?
* [ ] Are tests completely independent (no shared state)?
* [ ] Are empty states and error paths covered?
* [ ] Did the Vitest suite pass with 100% green tests?

6. TDD Anti-Patterns (NEVER DO THESE)
* **❌ Testing Implementation Details:** Do not test how a function works, test what it returns.
* **❌ Writing Code First:** Never write the implementation and then write a test to "prove" it works. Test first, always.
* **❌ "Mocking the Universe":** If you have to write 50 lines of mocks for 10 lines of logic, your code is too tightly coupled. Refactor the implementation to be pure.