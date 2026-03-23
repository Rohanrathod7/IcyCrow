/**
 * Utility to find and track the Gemini tab.
 */
export async function findGeminiTab(urlPattern: string): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ url: urlPattern });
  return tab?.id || null;
}

/**
 * Monitors tabs to update sessionState.geminiTabId automatically.
 */
export function watchGeminiTab(urlPattern: string) {
  const updateId = async () => {
    const id = await findGeminiTab(urlPattern);
    const result = await chrome.storage.session.get('sessionState');
    const state = result.sessionState || {};
    await chrome.storage.session.set({
      sessionState: { ...state, geminiTabId: id }
    });
  };

  if (chrome.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.match(/gemini\.google\.com/)) {
        updateId();
      }
    });
  }

  if (chrome.tabs?.onRemoved) {
    chrome.tabs.onRemoved.addListener(updateId);
  }
}
