import { ScrapedTab } from './types';

/**
 * Default context budget in bytes (50KB)
 */
const DEFAULT_BUDGET = 50 * 1024;

/**
 * Concatenates multiple scraped tabs into a prompt-ready context string.
 */
export function buildContext(tabs: ScrapedTab[]): string {
  if (!tabs || tabs.length === 0) return '';
  
  return tabs.map(tab => {
    return [
      `--- START OF SOURCE ---`,
      `SOURCE: ${tab.url}`,
      `TITLE: ${tab.title}`,
      `CONTENT:`,
      tab.content,
      `--- END OF SOURCE ---`
    ].join('\n');
  }).join('\n\n');
}

/**
 * Truncates text to fit within a specified budget.
 */
export function truncateToBudget(text: string, limitBytes: number = DEFAULT_BUDGET): string {
  if (!text) return '';
  
  // For simplicity with UTF-8, we'll use string length as a proxy for budget
  // but if we want high accuracy, we'd use TextEncoder.
  // Given we are mostly dealing with 1-byte chars in EN content, 1 char ~= 1 byte.
  if (text.length <= limitBytes) return text;
  
  return text.slice(0, limitBytes);
}
