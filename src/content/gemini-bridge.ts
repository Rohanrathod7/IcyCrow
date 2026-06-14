import { GEMINI_SELECTORS } from '../lib/gemini-selectors';
// humanType is no longer used in the hardened injection protocol

/**
 * Recursively queries elements including shadow DOMs.
 */
export function querySelectorAllDeep(selector: string, root: Node = document): HTMLElement[] {
  const results: HTMLElement[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === 1) { // Element
      const el = node as HTMLElement;
      try {
        if (el.matches(selector)) {
          results.push(el);
        }
      } catch (e) {}
      
      if (el.shadowRoot) {
        walk(el.shadowRoot);
      }
    }
    
    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
  };

  walk(root);
  return results;
}

/**
 * Tries each selector in order, returns first matching element.
 */
export function findSelector(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const elements = querySelectorAllDeep(s);
    if (elements.length > 0) return elements[0];
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
    const elements = querySelectorAllDeep(s);
    if (elements.length > 0) return elements[elements.length - 1];
  }
  return null;
}

let lastSeenContainer: HTMLElement | null = null;

/**
 * Injects prompt into Gemini UI and clicks send button.
 */
export async function injectPrompt(prompt: string): Promise<void> {
  const taskId = 'telemetry-inject';
  const log = (msg: string) => {
    try {
      chrome.runtime.sendMessage({
        type: 'AI_RESPONSE_STREAM',
        payload: { taskId, chunk: `[TELEMETRY] ${msg}`, done: false }
      });
    } catch (e) {}
  };

  log('Starting prompt injection...');

  // Focus settlement delay
  await new Promise(r => setTimeout(r, 50));

  // Capture state BEFORE injection
  const existing = querySelectorAllDeep(GEMINI_SELECTORS.responseContainer.join(', '));
  lastSeenContainer = existing.length > 0 ? (existing[existing.length - 1] as HTMLElement) : null;
  log(`Found ${existing.length} existing response containers.`);
  
  const input = findLastSelector(GEMINI_SELECTORS.inputField);
  if (!input) {
    log('ERROR: Gemini input field not found.');
    throw new Error('Gemini input field not found');
  }
  log('Found input field.');

  const sendBtn = findSelector(GEMINI_SELECTORS.sendButton) as HTMLButtonElement;
  if (!sendBtn) {
    log('ERROR: Gemini send button not found.');
    throw new Error('Gemini send button not found');
  }
  log('Found send button.');

  // 1. Force Tab Visibility/Focus to beat background throttling
  window.focus();
  input.focus();
  log('Window and input focused.');

  // Set selection explicitly to target the inner paragraph or the input itself
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    const range = document.createRange();
    const target = input.querySelector('p') || input.querySelector('div') || input;
    range.selectNodeContents(target);
    selection.addRange(range);
    log('Selection range set on target block.');
  } else {
    log('Warning: window.getSelection() returned null.');
  }

  // 2. Framework-Aware Injection
  try {
    // Select all existing text inside the focused input area first
    document.execCommand('selectAll', false, undefined);
    
    // [HARDENING]: Some Gemini versions handle \n as "Send", so we ensure it's treated as data
    // using a more reliable insertText implementation for contenteditable.
    if (!document.execCommand('insertText', false, prompt)) {
       throw new Error('execCommand returned false');
     }
     log('Prompt text successfully inserted via execCommand.');
  } catch (err: any) {
    log(`execCommand failed, falling back to manual assignment: ${err.message}`);
    console.warn('[IcyCrow] execCommand failed, falling back to manual assignment:', err);
    // [ROBUST FALLBACK]: Assignment + Manual Events with framework-aware inputType
    const beforeInputEvent = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: prompt
    });
    input.dispatchEvent(beforeInputEvent);

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.value = prompt;
    } else {
      // Find the inner editable block (Gemini uses <p> inside contenteditable) to preserve ProseMirror structures
      const targetBlock = input.querySelector('p') || input.querySelector('div') || input;
      targetBlock.innerText = prompt;
    }

    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: prompt
    }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    log('Prompt text assigned via manual fallback.');
  }

  // 3. Definitive Wait for State Sync (Critical for Gemini's dynamic send button)
  const isBackground = document.visibilityState === 'hidden';
  const syncWait = isBackground ? 100 : 200; 
  log(`Waiting ${syncWait}ms for state sync (isBackground=${isBackground})...`);
  await new Promise(r => setTimeout(r, syncWait));

  // 4. Dual-Submission Protocol (Synthetic Enter + Click)
  log('Triggering submission events...');
  // Attempt 1: Enter Keypress
  const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true });
  input.dispatchEvent(enterDown);
  
  // Attempt 2: Comprehensive Click Simulation
  const wasDisabled = sendBtn.disabled;
  if (wasDisabled) {
    log('Send button was disabled, temporarily enabling...');
    sendBtn.removeAttribute('disabled');
    sendBtn.disabled = false;
  }

  const events = [
    new PointerEvent('pointerdown', { bubbles: true }),
    new MouseEvent('mousedown', { bubbles: true }),
    new MouseEvent('pointerup', { bubbles: true }),
    new MouseEvent('mouseup', { bubbles: true }),
    new MouseEvent('click', { bubbles: true })
  ];
  
  events.forEach(ev => sendBtn.dispatchEvent(ev));
  log('Submission events dispatched.');

  if (wasDisabled) {
    setTimeout(() => {
      try {
        sendBtn.setAttribute('disabled', 'true');
        sendBtn.disabled = true;
        log('Send button restored to disabled state.');
      } catch {}
    }, 50);
  }
  
  // Final delay to ensure injection was handled
  const finalWait = isBackground ? 0 : 300;
  log(`Waiting final ${finalWait}ms for DOM injection handling...`);
  await new Promise(r => setTimeout(r, finalWait));
  log('Prompt injection successfully finished.');
}

/**
 * Observes the response container and streams text chunks via messages.
 */
export async function scrapeResponse(taskId: string): Promise<void> {
  // Wait for a new response container to appear
  let container: HTMLElement | null = null;
  let attempts = 0;
  
  while (!container && attempts < 40) { // 20s max wait
    const candidates = querySelectorAllDeep(GEMINI_SELECTORS.responseContainer.join(', '));
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
