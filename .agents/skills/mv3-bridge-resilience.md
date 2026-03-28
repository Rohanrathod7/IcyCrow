---
description: Patterns for hardening DOM-automated AI bridges against background throttling and stream truncation.
domain: mv3-content-script
triggers: ["When building or debugging a web-tab AI bridge", "When AI responses are truncated in the background"]
---
# MV3 AI Bridge Resilience & Integrity

**Context:** Extensions that use a pinned web tab (e.g., Gemini, ChatGPT) as a "Zero-Cost AI Engine" face two primary threats: (1) Browser throttling of DOM/Timers when the bridge tab is hidden, and (2) premature stream finalization due to UI "stutter".

## Problem
1. **Throttling**: Chrome severely throttles `setTimeout` and `KeyboardEvent` dispatching in background tabs, causing "human-mimicry" typing to take minutes instead of seconds.
2. **Truncation**: Monitoring only for a "Send" button enable-state is insufficient, as web UIs often toggle this state momentarily during long generation bursts (e.g., code blocks).

## Solution
1. **Visibility-Aware Injection**: Use `document.visibilityState` to toggle injection modes.
   - **Foreground**: Use human-mimicry (jittered typing) for safety.
   - **Background**: Switch to **Instant Bulk Insertion** (direct `innerText` assignment) to bypass timer throttling.
2. **Multi-Factor Integrity Guard**: Enforce a "Stability Period" before finalizing a scrape.
   - **Stop Button Awareness**: Explicitly monitor for the "Stop generating" button. Never finalize if it's visible.
   - **Hysteresis Timer**: Require `N` seconds (e.g., 3s) of *both* a static DOM and an enabled "Send" button before marking `done: true`.

## Example
```typescript
async function injectPrompt(prompt: string) {
  const input = findInputField();
  
  if (document.hidden) {
    // Background Mode: Bypasses throttled setInterval/setTimeout
    input.innerText = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // Foreground Mode: Safety-first human mimicry
    await humanType(input, prompt);
  }
}

async function scrapeResponse() {
  let stabilityCount = 0;
  const isComplete = () => {
    const stopBtn = document.querySelector(SELECTORS.stopButton);
    const sendBtn = document.querySelector(SELECTORS.sendButton);
    const hasChanged = checkTextMutation();
    
    if (stopBtn) return false;
    if (hasChanged) { stabilityCount = 0; return false; }
    if (sendBtn?.isEnabled) stabilityCount++;
    
    return stabilityCount >= 3; // 3 seconds of confirmed stability
  };
}
```
