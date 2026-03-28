import { pdfUrl } from '../store/viewer-state';

/**
 * AI Service for IcyCrow Workspace
 * Communicates with the background Gemini Bridge via Chrome Messaging
 */
export async function askAI(action: 'explain' | 'summarize', contextText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const taskId = crypto.randomUUID();
    const prompt = action === 'explain' 
      ? `Explain this text from the document simply: "${contextText}"`
      : `Summarize this text into key bullet points: "${contextText}"`;

    let fullResponse = '';

    // 1. Unified Message Listener
    const messageListener = (message: any) => {
      if (message.type === 'AI_RESPONSE_STREAM' && message.payload.taskId === taskId) {
        if (message.payload.error) {
          chrome.runtime.onMessage.removeListener(messageListener);
          reject(new Error(message.payload.error));
          return;
        }

        fullResponse += (message.payload.chunk || '');

        if (message.payload.done) {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(fullResponse);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 2. Dispatch Query
    chrome.runtime.sendMessage({
      type: 'AI_QUERY',
      payload: {
        taskId,
        prompt,
        url: pdfUrl.value,
        spaceId: null // Optional: link to a space if needed
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response && !response.ok) {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error(response.error?.message || response.error || 'Gemini bridge failed to initialize.'));
      }
    });

    // Timeout safety
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(messageListener);
      if (!fullResponse) reject(new Error('AI Request timed out.'));
    }, 45000); // 45s timeout for long generations
  });
}
