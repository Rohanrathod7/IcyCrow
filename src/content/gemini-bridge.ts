import { GEMINI_SELECTORS } from '../lib/gemini-selectors';
// humanType is no longer used in the hardened injection protocol

/**
 * Tries each selector in order, returns first matching element.
 */
export function findSelector(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el as HTMLElement;
  }
  return null;
}

/**
 * Recursively extracts innerText including shadow DOMs.
 */
function getDeepText(node: Node | null): string {
  if (!node) return '';
  
  // Element-specific checks
  if (node instanceof HTMLElement) {
    if (node.hasAttribute('aria-hidden') && node.getAttribute('aria-hidden') === 'true') return '';
    if (['BUTTON', 'MAT-ICON', 'APP-FEEDBACK'].includes(node.tagName)) return '';
  }
  
  let text = '';

  // 1. Process Shadow Root first (if any)
  if (node instanceof HTMLElement && node.shadowRoot) {
    text += getDeepText(node.shadowRoot);
  }

  // 2. Process Children
  for (const child of Array.from(node.childNodes)) {
    let childContent = '';
    if (child.nodeType === 3) { // Text Node
      childContent = child.textContent || '';
    } else if (child.nodeType === 1) { // Element Node
      const el = child as HTMLElement;
      const tagName = el.tagName;
      const inner = getDeepText(el);
      
      if (!inner.trim() && tagName !== 'BR') continue;

      if (tagName === 'BR') {
        text += '\n';
        continue;
      } else if (['P', 'H1', 'H2', 'H3'].includes(tagName)) {
        childContent = '\n\n' + inner.trim() + '\n\n';
      } else if (tagName === 'DIV') {
        childContent = '\n' + inner.trim() + '\n';
      } else if (tagName === 'LI') {
        childContent = '\n- ' + inner.trim() + ' '; // Space after bullet, no trailing newline
      } else {
        childContent = inner;
      }
    }

    if (!childContent) continue;

    // Semantic Joiner: Add space if joining alphanumeric boundaries
    if (text && /[a-zA-Z0-9]$/.test(text) && /^[a-zA-Z0-9]/.test(childContent)) {
      text += ' ';
    }
    text += childContent;
  }
  
  return text;
}

/**
 * Clean and structural text extraction for bridge responses.
 */
function scrapeDeepText(container: HTMLElement): string {
  const raw = getDeepText(container);
  return raw
    .replace(/^Gemini said\s*(\n|$)/im, '') // Multiline-aware Echo Strip
    .replace(/\s*Gemini said\s*$/im, '')    // End-of-block Echo Strip
    .replace(/\n\s*\n\s*\n/g, '\n\n')       // Max double newline
    .replace(/[ \t]+/g, ' ')                // Collapse horizontal spaces
    .trim();
}

/**
 * Tries each selector in order, returns the LAST matching element in the DOM.
 */
export function findLastSelector(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const elements = document.querySelectorAll(s);
    if (elements.length > 0) return elements[elements.length - 1] as HTMLElement;
  }
  return null;
}

let lastSeenContainer: HTMLElement | null = null;

/**
 * Injects prompt into Gemini UI and clicks send button.
 */
export async function injectPrompt(prompt: string): Promise<void> {
  // Capture state BEFORE injection
  const existing = document.querySelectorAll(GEMINI_SELECTORS.responseContainer[0]);
  lastSeenContainer = existing.length > 0 ? (existing[existing.length - 1] as HTMLElement) : null;
  
  const input = findSelector(GEMINI_SELECTORS.inputField);
  if (!input) throw new Error('Gemini input field not found');

  const sendBtn = findSelector(GEMINI_SELECTORS.sendButton) as HTMLButtonElement;
  if (!sendBtn) throw new Error('Gemini send button not found');

  // 1. Force Tab Visibility/Focus to beat background throttling
  window.focus();
  input.focus();
  
  // 2. Framework-Aware Injection
  // We use execCommand('insertText') because it's natively handled by contenteditable 
  // and modern frameworks (React/Angular) better than character-by-character JS events.
  try {
    document.execCommand('selectAll', false, undefined);
    
    // [HARDENING]: Some Gemini versions handle \n as "Send", so we ensure it's treated as data
    // using a more reliable insertText implementation for contenteditable.
    if (!document.execCommand('insertText', false, prompt)) {
       throw new Error('execCommand returned false');
    }
  } catch (err) {
    console.warn('[IcyCrow] execCommand failed, falling back to manual assignment:', err);
    // [ROBUST FALLBACK]: Assignment + Manual Events
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.value = prompt;
    } else {
      input.innerText = prompt;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 3. Definitive Wait for State Sync (Critical for Gemini's dynamic send button)
  const isBackground = document.visibilityState === 'hidden';
  const syncWait = isBackground ? 100 : 200; 
  await new Promise(r => setTimeout(r, syncWait));

  // 4. Dual-Submission Protocol (Synthetic Enter + Click)
  // Attempt 1: Enter Keypress
  const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true });
  input.dispatchEvent(enterDown);
  
  // Attempt 2: Comprehensive Click Simulation
  // We dispatch multiple events to ensure the framework picks up the interaction
  const events = [
    new PointerEvent('pointerdown', { bubbles: true }),
    new MouseEvent('mousedown', { bubbles: true }),
    new MouseEvent('pointerup', { bubbles: true }),
    new MouseEvent('mouseup', { bubbles: true }),
    new MouseEvent('click', { bubbles: true })
  ];
  
  events.forEach(ev => sendBtn.dispatchEvent(ev));
  
  // Final delay to ensure injection was handled
  await new Promise(r => setTimeout(r, isBackground ? 0 : 300));
}

/**
 * Observes the response container and streams text chunks via messages.
 */
export async function scrapeResponse(taskId: string): Promise<void> {
  // Wait for a new response container to appear
  let container: HTMLElement | null = null;
  let attempts = 0;
  
  while (!container && attempts < 40) { // 20s max wait
    const candidates = document.querySelectorAll(GEMINI_SELECTORS.responseContainer[0]);
    const currentLast = candidates[candidates.length - 1] as HTMLElement;
    
    if (currentLast) {
      // It's a new container if reference changed
      const isNewReference = currentLast !== lastSeenContainer;
      // It's a new turn if it was previously marked historical but now being reused (rare, but safer)
      const isReused = currentLast === lastSeenContainer && currentLast.dataset.icyTask !== taskId && getDeepText(currentLast).length < 20;

      if (isNewReference || isReused) {
        container = currentLast;
        container.dataset.icyTask = taskId;
      }
    }
    
    if (!container) {
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
  }

  if (!container) {
    throw new Error('Gemini response container not found. Try refreshing the page.');
  }

  let lastText = '';
  let noChangeCount = 0;
  let stabilityCount = 0; // Requires N consecutive confirmations of "Finished"

  const streamChunk = (text: string, done = false) => {
    chrome.runtime.sendMessage({
      type: 'AI_RESPONSE_STREAM',
      payload: { taskId, chunk: text, done }
    });
  };

  const observer = new MutationObserver(() => {
    const currentText = scrapeDeepText(container!);
    
    if (currentText !== lastText) {
      streamChunk(currentText, false);
      lastText = currentText;
      noChangeCount = 0;
      stabilityCount = 0; // Reset stability on any change
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Polling fallback if MutationObserver misses things in frames
  const pollingInterval = setInterval(() => {
    const currentText = scrapeDeepText(container!);
    if (currentText !== lastText) {
      streamChunk(currentText, false);
      lastText = currentText;
      noChangeCount = 0;
      stabilityCount = 0;
    } else {
      noChangeCount++;
    }

    // 1. Completion Guard: Look for "Send" button and absence of "Stop" button
    const sendBtn = findSelector(GEMINI_SELECTORS.sendButton) as HTMLButtonElement;
    const stopBtn = findSelector((GEMINI_SELECTORS as any).stopButton);
    
    // Logic: Finished if Send is enabled AND Stop is gone
    const isUIFinished = (sendBtn && !sendBtn.disabled) && !stopBtn;
    
    if (isUIFinished) {
      stabilityCount++;
    } else {
      stabilityCount = 0;
    }

    // 2. Finalization Trigger: Stability (3s) OR Timeout (60s)
    const shouldFinalize = (stabilityCount >= 3 && lastText.length > 0) || noChangeCount > 60;

    if (shouldFinalize) {
      clearInterval(pollingInterval);
      observer.disconnect();
      if (maxDurationTimer) clearTimeout(maxDurationTimer);
      streamChunk(lastText, true);
    }
  }, 1000);

  // Safety: Force completion if Gemini hangs (Extending for long responses)
  const maxDurationTimer = setTimeout(() => {
    clearInterval(pollingInterval);
    observer.disconnect();
    streamChunk(lastText, true);
  }, 240000); // 4 minutes max
}
