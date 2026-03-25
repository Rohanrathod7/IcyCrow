/**
 * Setup PDF Interceptor using Manifest V3 Declarative Net Request.
 * Redirects all .pdf URLs to the custom IcyCrow workspace.
 */
export async function setupPdfInterceptor() {
  const ruleId = 1;
  const redirectUrl = chrome.runtime.getURL('workspace/index.html?file=\\1');

  try {
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
  } catch (err) {
    console.error('[IcyCrow] Failed to inject PDF dynamic rules:', err);
  }
}
