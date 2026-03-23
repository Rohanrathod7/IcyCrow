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
 * Uses a visibility-aware traversal to skip hidden elements.
 */
export function scrapePageContent(): ScrapedTab {
  const url = window.location.href;
  const title = document.title;
  
  let rawText = '';
  
  // Robust visibility-aware extraction
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      rawText += node.textContent + ' ';
      return;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      // Skip hidden scripted/styled content
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) return;
      
      // Visibility check (handles inline styles in JSDOM)
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      
      // ARIA check
      if (el.getAttribute('aria-hidden') === 'true') return;
      
      for (const child of Array.from(el.childNodes)) {
        walk(child);
      }
    }
  };

  if (document.body) {
    walk(document.body);
  }
  
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
