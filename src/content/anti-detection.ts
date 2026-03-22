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
  // Focus first
  el.focus();
  
  // Clear or prepare? For Gemini we usually want to append or just set.
  // The plan just says "humanType".
  el.innerText = '';

  for (const char of text) {
    // 1. Dispatch KeyDown
    el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    
    // 2. Append char
    el.innerText += char;
    
    // 3. Dispatch Input
    el.dispatchEvent(new InputEvent('input', { data: char, bubbles: true }));
    
    // 4. Dispatch KeyUp
    el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    
    // 5. Human delay
    await typingDelay(50, 150);
  }
}
