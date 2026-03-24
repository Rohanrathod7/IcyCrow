/**
 * Utility to find and track the Gemini tab.
 */
export async function findGeminiTab(urlPattern: string): Promise<number[]> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs.map(t => t.id).filter((id): id is number => id !== undefined);
}

/**
 * Monitors tabs to update sessionState.geminiTabId automatically.
 */
export function watchGeminiTab(urlPattern: string) {
  const updateId = async () => {
    const ids = await findGeminiTab(urlPattern);
    const result = await chrome.storage.session.get('sessionState');
    const state = result.sessionState || {};
    await chrome.storage.session.set({
      sessionState: { ...state, geminiTabIds: ids }
    });
    
    // Proactive injection into matched tabs
    for (const id of ids) {
       const manifest = chrome.runtime.getManifest();
       const scriptPath = manifest.content_scripts?.[0]?.js?.[0];
       if (scriptPath) {
         chrome.scripting.executeScript({
           target: { tabId: id },
           files: [scriptPath]
         }).catch(_err => {
           // Silent catch
         });
       }
    }
  };
  
  // Proactive scan on boot
  updateId();

  if (chrome.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('gemini.google.com')) {
        updateId();
      }
    });
  }

  if (chrome.tabs?.onRemoved) {
    chrome.tabs.onRemoved.addListener(updateId);
  }
}
