import type { UUID } from '../../lib/types';

export class AiManager {
  /**
   * Checks for localized Chrome AI capabilities
   */
  async checkCapabilities(): Promise<boolean> {
    const ai = (globalThis as any).ai;
    if (!ai || !ai.assistant) return false;

    try {
      const capabilities = await ai.assistant.capabilities();
      return capabilities.available === 'readily' || capabilities.available === 'after-download';
    } catch (err) {
      console.warn('[IcyCrow] window.ai capability check failed:', err);
      return false;
    }
  }

  /**
   * Single-shot or streaming query to built-in Nano model
   */
  async queryBuiltIn(prompt: string, onChunk: (chunk: string) => void): Promise<string> {
    const ai = (globalThis as any).ai;
    if (!ai || !ai.assistant) throw new Error('WINDOW_AI_NOT_AVAILABLE');

    const session = await ai.assistant.create();
    let result = '';

    try {
      const stream = session.promptStreaming(prompt);
      for await (const chunk of stream) {
        result += chunk;
        onChunk(chunk);
      }
      return result;
    } catch (err) {
      console.error('[IcyCrow] Built-in AI Query failed:', err);
      throw err;
    } finally {
      if (session.destroy) session.destroy();
    }
  }
}

export const aiManager = new AiManager();
