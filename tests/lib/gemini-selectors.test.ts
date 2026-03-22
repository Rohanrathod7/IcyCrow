import { describe, it, expect } from 'vitest';
import { GEMINI_SELECTORS } from '../../src/lib/gemini-selectors';

describe('Gemini Selectors', () => {
  it('has at least 2 candidates for inputField', () => {
    expect(GEMINI_SELECTORS.inputField.length).toBeGreaterThanOrEqual(2);
  });

  it('has at least 2 candidates for sendButton', () => {
    expect(GEMINI_SELECTORS.sendButton.length).toBeGreaterThanOrEqual(2);
  });

  it('has at least 2 candidates for responseContainer', () => {
    expect(GEMINI_SELECTORS.responseContainer.length).toBeGreaterThanOrEqual(2);
  });
});
