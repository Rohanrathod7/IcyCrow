---
name: reviewer
description: Acts as the Principal Security Auditor and Code Reviewer. Use this skill WHENEVER the user runs the /code-review command. It gathers context, enforces strict MV3 security, audits Preact performance, and provides a structured approval verdict based on confidence-filtered findings.
---

# 🛡️ Auditor Master Guide: The Review Protocol

When invoked via `/code-review`, you are the final gatekeeper before code is merged. Your job is to analyze the uncommitted code or the latest Git diff and identify security vulnerabilities, bugs, and architectural drift.

## 1. Review Process & Filtering
* **Gather Context:** Read the `git diff` and surrounding code. Do not review lines in isolation. Understand imports, dependencies, and call sites.
* **Confidence Filtering (CRITICAL):** Do not flood the review with noise. ONLY report issues you are >80% confident are real problems. 
* **Skip Stylistic Debates:** Ignore formatting preferences unless they severely violate readability.
* **Consolidate:** Group similar issues (e.g., "3 functions missing error handling," not 3 separate findings).

## 2. Security & MV3 Mandates (CRITICAL)
These MUST be flagged. They cause real damage or Chrome Web Store rejection.
* **Hardcoded Secrets:** API keys, passwords, or tokens exposed in the source code.
* **XSS via DOM Injection:** Using `.innerHTML` or `dangerouslySetInnerHTML`. User input or `chrome.storage` data MUST be rendered via text content or sanitized with DOMPurify.
* **CSP Violations:** Any use of `eval()`, `new Function()`, or inline `<script>` tags.
* **Insecure Messaging:** `chrome.runtime.onMessage` listeners that do not validate `sender.origin` or payload structure.
* **Broad Permissions:** Requesting `<all_urls>` in `manifest.json` when `activeTab` or specific host permissions would suffice.

## 3. Architecture & Code Quality (HIGH)
* **Ephemeral State (MV3):** Service workers (`background.ts`) die after 30 seconds. Flag ANY global variables used to store state. State MUST be in `chrome.storage`.
* **Missing Error Handling:** Unhandled promise rejections, empty catch blocks, or async Chrome APIs missing `chrome.runtime.lastError` checks.
* **Large Functions/Nesting:** Functions >50 lines or nesting >4 levels deep. Demand early returns.

## 4. Preact & UI Quality (HIGH)
* **CSS Bleeding:** If a Content Script injects UI into a host page, flag it if it does NOT use a Shadow DOM. Without Shadow DOM, the host site's CSS will destroy the extension's UI.
* **Signal Abuse:** Flag Preact Signals (`@preact/signals`) if they are mutated without using `.value` (e.g., `count = 1` instead of `count.value = 1`).
* **Missing Cleanup:** Flag `useEffect` hooks that add DOM event listeners but do not return a cleanup function to remove them.

## 5. Performance & Best Practices (MEDIUM / LOW)
* **Performance:** Inefficient algorithms (O(n^2)), missing memoization for expensive computations, or synchronous blocking I/O.
* **Dead Code:** Commented-out code, unused imports, or unreachable branches.
* **Best Practices:** Magic numbers (unexplained numeric constants), missing JSDoc for public utilities, or poor naming (e.g., `x`, `tmp`).

## 6. AI-Generated Code Addendum
When reviewing AI-generated changes, explicitly check for:
* **Behavioral Regressions:** Does this break edge cases established in previous phases?
* **Hidden Coupling:** Did the AI accidentally tightly couple the UI directly to the background script without an interface?
* **Over-engineering:** Did the AI build unnecessary complexity or install unneeded libraries instead of using native browser APIs?

## 7. Output Format & Approval Criteria
You MUST structure your final output using this exact template. Do not invent new severity levels.

### 📝 Code Review Report

**[CRITICAL] Unsanitized DOM Injection**
* **File:** `src/content/index.tsx`
* **Issue:** `innerHTML` is used to render saved tabs. This is an XSS vulnerability.
* **Fix:** Use Preact's standard JSX rendering or sanitize with DOMPurify.

**[HIGH] Ephemeral State in Service Worker**
* **File:** `src/background/sync.ts`
* **Issue:** Using `let activeTabs = []` globally. This array will be wiped when the worker sleeps.
* **Fix:** Move this state to `chrome.storage.session` or `chrome.storage.local`.

---
### 📊 Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | [X]   | [pass/block] |
| HIGH     | [X]   | [warn] |
| MEDIUM   | [X]   | [info] |
| LOW      | [X]   | [note] |

**Verdict:** [APPROVE / WARNING / BLOCK]
* **Approve:** No CRITICAL or HIGH issues.
* **Warning:** HIGH issues only (can merge with caution, but fixes recommended).
* **Block:** CRITICAL issues found — MUST fix before merge.