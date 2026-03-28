/**
 * Mock AI Service for V1 Context Engine
 */
export async function askAI(prompt: 'explain' | 'summarize' | 'close', contextText: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (prompt === 'explain') {
        resolve(`✨ [AI EXPLANATION]: This is a simplified explanation of: "${contextText.substring(0, 40)}${contextText.length > 40 ? '...' : ''}"`);
      } else if (prompt === 'summarize') {
        resolve(`📝 [AI SUMMARY]: Here is a 1-sentence summary of the selected segment: "${contextText.substring(0, 60)}..."`);
      } else {
        resolve("");
      }
    }, 1500); // Simulate 1.5s latency
  });
}
