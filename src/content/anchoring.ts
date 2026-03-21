import { TextQuoteAnchor } from '../lib/types';

/** 
 * Capture a TextQuoteAnchor from the current selection 
 * Following LLD §3.2
 */
export function captureAnchor(selection: Selection): TextQuoteAnchor | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const exact = selection.toString();
  if (!exact) return null;

  const container = range.commonAncestorContainer;
  const element = container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement!;

  // 1. Text Quotes
  const prefix = getAdjacentText(range, true);
  const suffix = getAdjacentText(range, false);

  // 2. Offsets
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  // 3. Fallbacks
  const xpathFallback = computeXPath(element);
  const cssFallback = computeSelector(element);

  return {
    type: 'TextQuoteSelector',
    exact,
    prefix,
    suffix,
    xpathFallback,
    cssFallback,
    startOffset,
    endOffset
  };
}

/** 
 * Restore a DOM Range from a TextQuoteAnchor 
 * Strategy Cascade (LLD §3.3)
 */
export function restoreAnchor(anchor: TextQuoteAnchor): Range | null {
  // Strategy 1: Exact Match + Prefix/Suffix scoring
  const s1 = restoreByTextQuote(anchor);
  if (s1) return s1;

  // Strategy 2: XPath Fallback
  const s2 = restoreByXPath(anchor.xpathFallback);
  if (s2) return s2;

  // Strategy 3: CSS Fallback
  const s3 = restoreByCSS(anchor.cssFallback);
  if (s3) return s3;

  // Strategy 4: Fuzzy Search
  const s4 = restoreByFuzzy(anchor.exact);
  return s4;
}

// --- Internal Helpers ---

function getAdjacentText(range: Range, isPrefix: boolean): string {
  const maxLength = 50;
  let text = '';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  
  if (isPrefix) {
    walker.currentNode = range.startContainer;
    let offset = range.startOffset;
    while (text.length < maxLength) {
      const nodeText = walker.currentNode.textContent || '';
      text = nodeText.substring(0, offset) + text;
      if (text.length >= maxLength) break;
      if (!walker.previousNode()) break;
      offset = walker.currentNode.textContent?.length || 0;
    }
    return text.slice(-maxLength);
  } else {
    walker.currentNode = range.endContainer;
    let offset = range.endOffset;
    while (text.length < maxLength) {
      const nodeText = walker.currentNode.textContent || '';
      text += nodeText.substring(offset);
      if (text.length >= maxLength) break;
      if (!walker.nextNode()) break;
      offset = 0;
    }
    return text.substring(0, maxLength);
  }
}

function computeXPath(element: Element): string {
  if (element.id) return `//*[@id="${element.id}"]`;
  const paths: string[] = [];
  let current: Node | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).tagName === (current as Element).tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    const tagName = (current as Element).tagName.toLowerCase();
    paths.unshift(`${tagName}[${index + 1}]`);
    current = current.parentNode;
  }
  return `/${paths.join('/')}`;
}

function computeSelector(element: Element): string {
  if (element.id) return `#${element.id}`;
  const path: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName !== 'BODY') {
    let selector = current.tagName.toLowerCase();
    const index = Array.from(current.parentNode?.children || []).indexOf(current);
    selector += `:nth-child(${index + 1})`;
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.join(' > ');
}

function restoreByTextQuote(anchor: TextQuoteAnchor): Range | null {
  const fullText = document.body.textContent || '';
  let index = fullText.indexOf(anchor.exact);
  if (index === -1) return null;

  // Simple version for Phase 1: Pick first match. 
  // TODO: Add disambiguation scoring with prefix/suffix in Refactor phase.
  return createRangeFromOffset(index, index + anchor.exact.length);
}

function restoreByXPath(xpath: string): Range | null {
  try {
    const result = document.evaluate(xpath, document, null, (window as any).XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const node = result.singleNodeValue as Element;
    if (!node) return null;
    const range = document.createRange();
    range.selectNodeContents(node);
    return range;
  } catch {
    return null;
  }
}

function restoreByCSS(selector: string): Range | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    return range;
  } catch {
    return null;
  }
}

function restoreByFuzzy(exact: string): Range | null {
  const fullText = document.body.textContent || '';
  if (fullText.length > 20000) return null; // tighter cap for O(N*M) search

  const threshold = Math.max(1, Math.floor(exact.length * 0.3));
  let bestDist = threshold + 1;
  let bestIndex = -1;
  let bestLen = exact.length;

  // Search window logic for Phase 1
  for (let i = 0; i < fullText.length - exact.length + threshold; i++) {
    for (let len = exact.length - threshold; len <= exact.length + threshold; len++) {
      if (i + len > fullText.length) break;
      const windowText = fullText.substring(i, i + len);
      const dist = levenshtein(exact, windowText);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
        bestLen = len;
        if (dist === 0) break;
      }
    }
    if (bestDist === 0) break;
  }

  if (bestIndex !== -1) {
    return createRangeFromOffset(bestIndex, bestIndex + bestLen);
  }
  return null;
}

function levenshtein(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function createRangeFromOffset(start: number, end: number): Range | null {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let currentPos = 0;
  const range = document.createRange();
  let startNode: Text | null = null;
  let startOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const nodeLength = node.textContent?.length || 0;
    
    if (!startNode && currentPos + nodeLength >= start) {
      startNode = node;
      startOffset = start - currentPos;
    }
    
    if (startNode && currentPos + nodeLength >= end) {
      range.setStart(startNode, startOffset);
      range.setEnd(node, end - currentPos);
      return range;
    }
    currentPos += nodeLength;
  }
  return null;
}
