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

function isElementVisible(el: HTMLElement): boolean {
  try {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    
    // In JSDOM mock environment, layout sizing is not computed (always 0)
    const isJSDOM = typeof navigator !== 'undefined' && navigator.userAgent?.toLowerCase().includes('jsdom');
    if (isJSDOM) return true;
    
    // Check bounding rect for sizing
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      // Allow background tabs to pass sizing check if they are not explicitly display:none
      return document.visibilityState === 'hidden';
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Tries each selector in order, returns first matching visible element.
 */
export function findSelector(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const elements = querySelectorAllDeep(s);
    const visible = elements.filter(isElementVisible);
    if (visible.length > 0) return visible[0];
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
 * Tries each selector in order, returns the LAST matching visible element in the DOM.
 */
export function findLastSelector(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const elements = querySelectorAllDeep(s);
    const visible = elements.filter(isElementVisible);
    if (visible.length > 0) return visible[visible.length - 1];
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
  
  // Find all matching inputs (both visible and hidden) for debugging
  const rawInputs = querySelectorAllDeep(GEMINI_SELECTORS.inputField.join(', '));
  log(`Raw input candidates found in DOM: ${rawInputs.length}`);
  rawInputs.forEach((el, idx) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    log(`Candidate #${idx}: tag=${el.tagName}, class=${el.className}, visible=${style.display !== 'none'}, rect=${rect.width}x${rect.height}`);
  });

  const input = findLastSelector(GEMINI_SELECTORS.inputField);
  if (!input) {
    log('ERROR: Gemini input field not found.');
    throw new Error('Gemini input field not found');
  }
  log(`Found input field: ${input.tagName}.${input.className}`);

  // 1. Force Tab Visibility/Focus to beat background throttling
  window.focus();
  input.focus();
  log(`Window focused. Active element: ${document.activeElement?.tagName}.${document.activeElement?.className}`);

  // Set selection explicitly to target the inner paragraph or the input itself
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    const range = document.createRange();
    const target = input.querySelector('p') || input.querySelector('div') || input;
    range.selectNodeContents(target);
    selection.addRange(range);
    log(`Selection range set on target block: ${target.tagName}.${target.className}`);
  } else {
    log('Warning: window.getSelection() returned null.');
  }

  // 2. Framework-Aware Injection Loop
  // Option A: execCommand
  try {
    document.execCommand('selectAll', false, undefined);
    if (!document.execCommand('insertText', false, prompt)) {
      throw new Error('execCommand insertText returned false');
    }
    log('Prompt text inserted via execCommand.');
  } catch (err: any) {
    log(`execCommand failed: ${err.message}`);
  }

  // Check if text was inserted
  const target = input.querySelector('p') || input.querySelector('div') || input;
  let currentVal = target.textContent || '';
  log(`Current input text after execCommand: "${currentVal.slice(0, 30)}..."`);

  // Option B: ClipboardEvent paste fallback
  if (!currentVal.trim()) {
    log('execCommand was empty, attempting ClipboardEvent paste fallback...');
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', prompt);
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });
      input.dispatchEvent(pasteEvent);
      log('Paste event dispatched.');
    } catch (err: any) {
      log(`Paste event failed: ${err.message}`);
    }

    currentVal = target.textContent || '';
    log(`Current input text after paste event: "${currentVal.slice(0, 30)}..."`);
  }

  // Option C: Manual innerText assignment fallback
  if (!currentVal.trim()) {
    log('Paste event was empty, attempting manual innerText assignment...');
    try {
      target.innerText = prompt;
      
      input.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt
      }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      const textEvent = new Event('textInput', { bubbles: true });
      (textEvent as any).data = prompt;
      input.dispatchEvent(textEvent);
      log('Manual innerText and events dispatched.');
    } catch (err: any) {
      log(`Manual assignment failed: ${err.message}`);
    }

    currentVal = target.textContent || '';
    log(`Current input text after manual assignment: "${currentVal.slice(0, 30)}..."`);
  }

  // 3. Definitive Wait for State Sync (Critical for Gemini's dynamic send button)
  const isBackground = document.visibilityState === 'hidden';
  const syncWait = isBackground ? 150 : 300; 
  log(`Waiting ${syncWait}ms for state sync (isBackground=${isBackground})...`);
  await new Promise(r => setTimeout(r, syncWait));

  // 4. Query send button AFTER typing, when it should be rendered
  const sendBtn = findSelector(GEMINI_SELECTORS.sendButton) as HTMLButtonElement;
  if (!sendBtn) {
    log('ERROR: Gemini send button not found after typing.');
    throw new Error('Gemini send button not found');
  }
  log(`Found send button: ${sendBtn.tagName}.${sendBtn.className}`);

  // 5. Dual-Submission Protocol (Synthetic Enter + Click)
  log('Triggering submission events...');
  const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true });
  input.dispatchEvent(enterDown);
  
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
