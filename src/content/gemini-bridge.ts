import { GEMINI_SELECTORS } from '../lib/gemini-selectors';
import { humanType } from './anti-detection';

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
 * Injects prompt into Gemini UI and clicks send button.
 */
export async function injectPrompt(prompt: string): Promise<void> {
  const input = findSelector(GEMINI_SELECTORS.inputField);
  if (!input) throw new Error('Gemini input field not found');

  const sendBtn = findSelector(GEMINI_SELECTORS.sendButton);
  if (!sendBtn) throw new Error('Gemini send button not found');

  // Mimic human typing
  await humanType(input, prompt);

  // Click send
  sendBtn.click();
}

/**
 * Observes the response container and streams text chunks via messages.
 */
export async function scrapeResponse(taskId: string): Promise<void> {
  const container = findSelector(GEMINI_SELECTORS.responseContainer);
  if (!container) throw new Error('Gemini response container not found');

  let lastText = '';
  let stabilityTimer: ReturnType<typeof setTimeout> | null = null;

  const streamChunk = (text: string, done = false) => {
    chrome.runtime.sendMessage({
      type: 'AI_RESPONSE_STREAM',
      payload: { taskId, chunk: text, done }
    });
  };

  const observer = new MutationObserver(() => {
    const currentText = container.innerText || container.textContent || '';
    
    if (currentText !== lastText) {
      streamChunk(currentText, false);
      lastText = currentText;
    }

    if (stabilityTimer) clearTimeout(stabilityTimer);
    
    stabilityTimer = setTimeout(() => {
      const sendBtn = findSelector(GEMINI_SELECTORS.sendButton) as HTMLButtonElement;
      if (!sendBtn || !sendBtn.disabled) {
        observer.disconnect();
        if (maxDurationTimer) clearTimeout(maxDurationTimer);
        streamChunk(lastText, true);
      }
    }, 1500);
  });

  // Safety: Force completion if Gemini hangs
  const maxDurationTimer = setTimeout(() => {
    observer.disconnect();
    if (stabilityTimer) clearTimeout(stabilityTimer);
    streamChunk(lastText, true);
  }, 30000); // 30s max per query

  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });
}
