/**
 * Utility to find and track the Gemini tab.
 */
export async function findGeminiTab(urlPattern: string): Promise<number[]> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs.map(t => t.id).filter((id): id is number => id !== undefined);
}

/**
 * Verifies if the target bridge tab is alive by executing a ping-pong handshake.
 */
export async function verifyBridgeHealth(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !tab.url.startsWith('https://gemini.google.com/')) {
      return false;
    }
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING_BRIDGE' });
    return !!(response && response.ok && response.pong);
  } catch (err) {
    console.warn(`[IcyCrow] Bridge health check failed for tab ${tabId}:`, err);
    return false;
  }
}

/**
 * Verifies if the target bridge is healthy, and if not, attempts to re-inject content-script and verify again.
 */
export async function verifyAndRecoverBridge(tabId: number): Promise<boolean> {
  let healthy = await verifyBridgeHealth(tabId);
  if (healthy) return true;

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !tab.url.startsWith('https://gemini.google.com/')) {
      return false;
    }
    const manifest = chrome.runtime.getManifest();
    const scriptPath = manifest.content_scripts?.[0]?.js?.[0];
    if (scriptPath) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [scriptPath]
      });
      // Small delay to let script load
      await new Promise(r => setTimeout(r, 300));
      healthy = await verifyBridgeHealth(tabId);
    }
  } catch (err) {
    console.warn(`[IcyCrow] Bridge recovery failed for tab ${tabId}:`, err);
  }
  return healthy;
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
      sessionState: { 
        ...state, 
        geminiTabIds: ids,
        geminiTabId: ids[0] || null 
      }
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
