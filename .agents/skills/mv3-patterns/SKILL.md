---
name: mv3-patterns
description: The Master Rulebook for Chrome Extension Manifest V3 (MV3) and Preact development. Use this skill WHENEVER generating, planning, or reviewing code for the extension. It prevents MV2 hallucinations, enforces Service Worker ephemeral lifecycles, and dictates Preact Signal usage.
---

# 🧩 MV3 & Preact Master Guide: IcyCrow Stack Rules

When writing code for this repository, you MUST adhere strictly to Manifest V3 (MV3) standards, the Preact UI framework, and Vite build optimizations. **Do not use React. Do not use Manifest V2.**

## 1. Service Worker Constraints (background.ts)
Manifest V3 replaces persistent background pages with ephemeral Service Workers. They are heavily restricted to save user RAM.
* **The 30-Second Rule:** The background script will terminate after ~30 seconds of inactivity. 
* **NO Global State:** NEVER use `let` or `const` at the top level to store data that must persist (e.g., `let cachedTabs = []` is FORBIDDEN). You MUST persist state to `chrome.storage.local` or `chrome.storage.session`.
* **Top-Level Listeners:** All `chrome.runtime.onMessage` and `chrome.alarms.onAlarm` listeners MUST be registered synchronously at the top level of the script. Do not nest them inside async functions, or they will fail to wake the service worker.
* **No DOM Access:** You cannot use `window`, `document`, or `localStorage` inside `background.ts`. Use `Offscreen API` if DOM parsing is strictly required.

## 2. Banned MV2 APIs & Modern Replacements
If you use any of the banned APIs below, the extension will crash. You MUST use the modern MV3 equivalents:
* ❌ BANNED: `chrome.browserAction.*` -> ✅ USE: `chrome.action.*`
* ❌ BANNED: `chrome.pageAction.*` -> ✅ USE: `chrome.action.*`
* ❌ BANNED: `chrome.tabs.executeScript` -> ✅ USE: `chrome.scripting.executeScript`
* ❌ BANNED: `chrome.tabs.insertCSS` -> ✅ USE: `chrome.scripting.insertCSS`
* ❌ BANNED: `chrome.extension.getURL` -> ✅ USE: `chrome.runtime.getURL`
* ❌ BANNED: `chrome.extension.getBackgroundPage` -> ✅ USE: Message passing (`chrome.runtime.sendMessage`)

## 3. Preact & UI Architecture (Highly Optimized)
You are writing Preact, not React. Optimize for the smallest possible bundle size.
* **No React Imports:** Never `import { useState } from 'react'`. Always import from `preact/hooks`.
* **State Management (Signals):** Use Preact Signals (`@preact/signals`) for all shared and local state. Do not use Redux or heavy Context Providers.
  ```tsx
  // ✅ GOOD: Preact Signal (Zero-overhead reactivity)
  import { signal } from "@preact/signals";
  export const activeTabId = signal<number | null>(null);
  
  // To update: activeTabId.value = 123;
  ```
  * **Content Script UI (CRITICAL):** If injecting UI into a host webpage (e.g., a floating tab menu), you MUST wrap the Preact <App /> in a Shadow Root. If you do not, the host website's CSS will bleed into your component and destroy the layout.

## 4. Data Layer & Performance
* **Promise-Based APIs:** MV3 supports Promises natively. NEVER use the old callback patterns.

```tsx
// ❌ BAD (MV2 Callback)
chrome.storage.local.get(['key'], (result) => { ... });
// ✅ GOOD (MV3 Promise)
const result = await chrome.storage.local.get(['key']);
``` 
* **Storage Batching:** chrome.storage has IO overhead. If updating multiple keys, batch them into a single call: await chrome.storage.local.set({ key1: val1, key2: val2 }).
* **Heavy Data:** For complex relational data or large arrays (like thousands of synced tabs), prefer IndexedDB (via a lightweight wrapper like idb) over chrome.storage.local.

## 5. Security & Messaging Mandates
* **No Inline Scripts/Eval:** The MV3 Content Security Policy (CSP) strictly forbids eval(), new Function(), and inline <script> tags. Do not attempt to use them.
* **Message Validation:** Always validate the structure of the request object in chrome.runtime.onMessage before acting on it.
* **Idempotent Actions:** Design message handlers so that if the same message is accidentally sent twice (due to UI re-renders), it does not corrupt the data.