/**
 * Returns a jittered value within ±30% of base.
 */
export function jitter(baseMs: number): number {
  const variation = baseMs * 0.3;
  const offset = (Math.random() * 2 - 1) * variation;
  return Math.round(baseMs + offset);
}

/**
 * Resolves after a randomized delay within [min, max].
 */
export async function typingDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Types text into a contenteditable element char-by-char with human delays.
 */
export async function humanType(el: HTMLElement, text: string): Promise<void> {
  // 1. Force Focus and Selection
  el.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  selection?.removeAllRanges();
  selection?.addRange(range);

  // 2. Nuclear Clear (Framework Resilient)
  // Try idiomatic clear first
  document.execCommand('selectAll', false, undefined);
  document.execCommand('delete', false, undefined);
  
  // Force reset if still present (Pierces React/Angular internal state)
  if (el.textContent && el.textContent.length > 0) {
    el.innerHTML = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new InputEvent('input', { data: '', bubbles: true, inputType: 'deleteContentBackward' }));
  }
  
  // 3. Trigger initial focus/input events
  el.dispatchEvent(new Event('focus', { bubbles: true }));

  const isBackground = document.visibilityState === 'hidden';
  
  if (isBackground) {
    // Background: Bulk insert to bypass 1Hz throttling
    document.execCommand('insertText', false, text);
    el.dispatchEvent(new InputEvent('input', { data: text, bubbles: true, inputType: 'insertText' }));
  } else {
    // Foreground: Maintain human speed
    for (const char of text) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      document.execCommand('insertText', false, char);
      el.dispatchEvent(new InputEvent('input', { data: char, bubbles: true, inputType: 'insertText' }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await typingDelay(5, 20);
    }
  }
  
  // Final change events to wake up the UI
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
