/**
 * Setup PDF Interceptor using Manifest V3 Declarative Net Request.
 * Redirects all .pdf URLs to the custom IcyCrow workspace.
 */
export async function setupPdfInterceptor(enabled = true) {
  const ruleId = 1;
  const redirectUrl = chrome.runtime.getURL('src/workspace/index.html?file=\\1');

  try {
    // Always ensure the static ruleset is disabled to prevent conflicts with our dynamic rules
    if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest?.updateEnabledRulesets) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['pdf_rules']
      }).catch(err => console.warn('[IcyCrow] Failed to disable static pdf_rules:', err));
    }

    if (enabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [
          {
            id: ruleId,
            priority: 1,
            action: {
              type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
              redirect: {
                regexSubstitution: redirectUrl,
              },
            },
            condition: {
              regexFilter: '^(https?://.*\\.pdf(?:\\?.*)?)$',
              resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
            },
          },
        ],
      });
      console.log('[IcyCrow] PDF Interceptor dynamic rule injected.');
    } else {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
      });
      console.log('[IcyCrow] PDF Interceptor dynamic rule removed.');
    }
  } catch (err) {
    console.error('[IcyCrow] Failed to update PDF interceptor rules:', err);
  }
}

/**
 * Register background tab listener to intercept PDF navigations (especially file:// URLs)
 * and redirect them to the custom workspace.
 */
export function registerTabPdfInterceptor() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.url) {
      const url = changeInfo.url;
      if (url.startsWith('chrome-extension://')) return;

      const cleanUrl = url.split('?')[0].split('#')[0];
      if (cleanUrl.toLowerCase().endsWith('.pdf')) {
        try {
          const localData = await chrome.storage?.local?.get('settings');
          const enabled = (localData?.settings as any)?.enablePdfInterceptor !== false;
          if (enabled) {
            const redirectUrl = chrome.runtime.getURL(`src/workspace/index.html?file=${encodeURIComponent(url)}`);
            await chrome.tabs.update(tabId, { url: redirectUrl });
            console.log(`[IcyCrow] Tab Interceptor: Redirected tab ${tabId} to Workspace for PDF: ${url}`);
          }
        } catch (err) {
          console.warn('[IcyCrow] Tab Interceptor failed to redirect:', err);
        }
      }
    }
  });
}
