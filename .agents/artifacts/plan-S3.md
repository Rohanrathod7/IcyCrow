---
# 🏗️ Active Plan: S3 — Message Router & SW Boot

## 1. Requirements & Success Criteria
* **Goal:** Establish a resilient, MV3-compliant background Service Worker that handles installation lifecycle, ephemeral state rehydration, robust message routing using Zod typing, and persistent keepalive alarms.
* **Success Criteria:** 
  * [ ] Service Worker boots and writes `sessionState` with incremented `swRestartCount` to `chrome.storage.session`.
  * [ ] `chrome.runtime.onInstalled` sets `DEFAULT_SETTINGS` if none exist.
  * [ ] `chrome.runtime.onMessage` listener strictly validates payloads via `InboundMessageSchema`.
  * [ ] Sending `HIGHLIGHTS_FETCH` returns a valid stub response. 
  * [ ] Sending an invalid payload returns `{ ok: false, error: { code: 'VALIDATION_ERROR' } }` without crashing the SW.
  * [ ] `keepalive` alarm fires every ≈24 seconds to prevent 30s SW termination.

## 2. Architecture & Dependencies
* **Affected Components:** 
  * `[CREATE/MODIFY]` `src/background/index.ts` (Serves as the compiled service-worker.ts)
  * `[CREATE]` `tests/background/service-worker.test.ts`
* **New Dependencies:** None (Relies on existing `zod` and `@lib/zod-schemas`)
* **Loaded Constraints:** Local-First, MV3 Resilience (No global state, use `chrome.storage.session`).

## 3. Implementation Steps (TDD Ready)

### Phase 1: Boot Sequence & Lifecycle (onInstalled)
1. **[SW Initialization]** (`src/background/index.ts`, `tests/background/service-worker.test.ts`)
   * **Action:** `MODIFY` - Implement `chrome.runtime.onInstalled` to detect extension install/update. If install, set `DEFAULT_SETTINGS` to `chrome.storage.local`.
   * **Action:** `MODIFY` - Implement a top-level `boot()` function that executes on SW wake. It reads `swRestartCount` from `chrome.storage.session`, increments it, and writes the base `SessionState` back.
   * **Verification (TDD):** Vitest JSDOM environment explicitly mocking `chrome.runtime.onInstalled.addListener` and `chrome.storage.session.get`. Assert `session.set` is called with incremented count.
   * **Risk:** Low

### Phase 2: Keepalive & Alarms
2. **[Alarm Orchestrator]** (`src/background/index.ts`)
   * **Action:** `MODIFY` - Inside `boot()`, call `chrome.alarms.create('keepalive', { periodInMinutes: 0.4 })` (approx 24s). 
   * **Action:** `MODIFY` - Add `chrome.alarms.onAlarm.addListener` to handle `keepalive` (no-op or simple console.debug to reset the 30s death timer), `crypto-autolock`, and `backup-check` (just stub cases for now).
   * **Verification (TDD):** Mock `chrome.alarms.create`. Assert it is called with correct parameters during `boot()`.
   * **Risk:** Medium (Chrome restricts sub-minute alarms in production, but MV3 allows them for ephemeral keepalive hacks if needed, or we rely on Chrome 110+ SW lifetime extensions). *Correction: `periodInMinutes` less than 1 min is clamped in production, but calling `create` still resets the idle timer.

### Phase 3: Zod Message Router
3. **[IPC Router]** (`src/background/index.ts`)
   * **Action:** `MODIFY` - Implement `chrome.runtime.onMessage.addListener`. Use `InboundMessageSchema.safeParse(request)`. 
   * **Action:** `MODIFY` - If `success: false`, return `{ ok: false, error: { code: 'VALIDATION_ERROR', message: ... } }`.
   * **Action:** `MODIFY` - If `success: true`, use a `switch(parsed.data.type)` to route to respective stubs. Wire up `HIGHLIGHTS_FETCH` to return `{ ok: true, data: { highlights: [], pageChanged: false } }` as a placeholder.
   * **Verification (TDD):** Trigger the `onMessage` callback manually in Vitest. Pass invalid payload -> assert validation error. Pass valid payload -> assert stub response. Ensure `sendResponse` is called and `return true` is used for async handlers.
   * **Risk:** High (TypeScript narrowing inside switch statement needs to perfectly match Zod inferences).

## 4. Testing Strategy
* **Unit:** `tests/background/service-worker.test.ts` focusing entirely on mocked Chrome APIs. Validate that the router safely traps all errors and never crashes the worker. Validate `onInstalled` default hydration.
* **Integration:** During dev mode, reload the extension and observe terminal logs / Chrome DevTools for `[IcyCrow] SW Booted: Restart #N`.

## 5. Risks & Mitigations
* ⚠️ **Risk:** Extension Messaging relies on `return true` to keep sendResponse channels open for async ops. Forgetting this closes the port instantly. -> **Mitigation:** Ensure the top-level root handler explicitly returns `true` and delegates async resolution to `.then()` or `await` internally calling `sendResponse`.
* ⚠️ **Risk:** `chrome.storage.session` might not exist in unsupported browsers or older Chrome versions. -> **Mitigation:** IcyCrow targets modern MV3 (Chrome 110+). Assume `session` is available.
---
