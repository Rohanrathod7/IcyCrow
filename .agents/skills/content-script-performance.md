---
description: Prevents browser freezes during fuzzy text search or DOM traversal by enforcing localized root nodes and strictly bounded character windows.
domain: content-script
triggers: When writing DOM traversal logic, algorithms like Levenshtein, or TreeWalker within content scripts.
---
# Content Script Performance & DOM Traversal

**Context:** Operating on raw DOM elements (`document.body.textContent`) or traversing nodes from the very top of the body tree can trigger catastrophic `O(N)` or `O(N*M^3)` performance bottlenecks on heavy modern web pages (e.g., Reddit, Twitter).

## Problem
Running nested iterative algorithms (such as the Levenshtein distance for fuzzy search) or unconstrained `TreeWalker` traversals over the entire `document.body` will block the main thread, freeze the browser tab, and potentially crash the extension.

## Solution
You MUST use localized root nodes and strictly bounded search windows for any intense DOM algorithms:
1. **Never** scan from `document.body` index 0 unless absolutely unavoidable.
2. **Retrieve Fallback Nodes:** Use `document.evaluate` (XPath) or `document.querySelector` (CSS) to first locate an approximate anchor node near the target text.
3. **Bound the Window:** Traverse up the `parentElement` chain from the fallback node until you encapsulate a small, safe chunk of text (e.g., +/- 500 characters around the target).
4. **Enforce Hard Limits:** Hard-slice the resulting `textContent` (e.g., `substring(0, 3000)`) before feeding it into any expensive string comparison algorithms.
5. **Localized TreeWalker:** When creating a `TreeWalker`, pass the localized parent node as the root instead of `document.body`.

## Example
```typescript
// ❌ BAD: Freezes the browser on heavy DOMs
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
const dist = levenshtein(targetText, document.body.textContent);

// ✅ GOOD: Localized, strictly bounded search
const fallbackNode = document.querySelector('.article-content') || document.body;
let searchRoot = fallbackNode;

// Traverse up to find a safe window size (e.g., minimum 1000 chars)
while (searchRoot.parentElement && (searchRoot.textContent?.length || 0) < 1000) {
  if (searchRoot.tagName === 'BODY') break;
  searchRoot = searchRoot.parentElement;
}

// Hard slice before expensive operations
const safeTextWindow = (searchRoot.textContent || '').substring(0, 3000);
const dist = levenshtein(targetText, safeTextWindow);

// Use the localized root for the TreeWalker
const safeWalker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT);
```
