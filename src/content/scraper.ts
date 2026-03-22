import { ScrapedTab } from '../lib/types';

/**
 * Clean text for AI consumption.
 * Collapses whitespace and removes non-informative characters.
 */
export function cleanupText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts and cleans the primary text content of the current page.
 */
export function scrapePageContent(): ScrapedTab {
  const url = window.location.href;
  const title = document.title;
  
  // Clone body to manipulate if needed or just use innerText
  // For now, innerText is the most efficient way to get "rendered" text
  const rawText = document.body.innerText || document.body.textContent || '';
  const clean = cleanupText(rawText);
  
  return {
    url,
    title,
    content: clean,
    byteLength: new TextEncoder().encode(clean).byteLength
  };
}

/**
 * Register listener for background scrape requests
 */
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SCRAPE_CONTENT') {
      const result = scrapePageContent();
      sendResponse({ ok: true, data: result });
    }
  });
}
