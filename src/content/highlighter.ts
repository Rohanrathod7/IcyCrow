/** 
 * Wrap a DOM Range in a <mark> element 
 * Following LLD §3.2 Step 7 and LLD §3.4
 */
export function wrapRange(range: Range, id: string, color: string): void {
  if (range.collapsed) return;

  try {
    const mark = document.createElement('mark');
    mark.className = 'icycrow-highlight';
    mark.setAttribute('data-id', id);
    mark.setAttribute('data-color', color);
    
    // surroundContents throws if range spans multiple elements
    range.surroundContents(mark);
  } catch (err) {
    // Fallback for cross-element range
    wrapCrossElementRange(range, id, color);
  }
}

/**
 * Handle highlights that span across multiple DOM elements
 * Following LLD §3.4 - In-place wrapping strategy
 */
function wrapCrossElementRange(range: Range, id: string, color: string): void {
  const commonAncestor = range.commonAncestorContainer;
  const walker = document.createTreeWalker(
    commonAncestor,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Node | null = walker.currentNode;
  
  // Find all text nodes that intersect the range
  while (node) {
    if (node.nodeType === Node.TEXT_NODE && range.intersectsNode(node)) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const nodeRange = document.createRange();
    
    // Determine the part of the text node to wrap
    const isStart = (textNode === range.startContainer);
    const isEnd = (textNode === range.endContainer);
    
    if (isStart && isEnd) {
      nodeRange.setStart(textNode, range.startOffset);
      nodeRange.setEnd(textNode, range.endOffset);
    } else if (isStart) {
      nodeRange.setStart(textNode, range.startOffset);
      nodeRange.setEnd(textNode, textNode.length);
    } else if (isEnd) {
      nodeRange.setStart(textNode, 0);
      nodeRange.setEnd(textNode, range.endOffset);
    } else {
      nodeRange.setStart(textNode, 0);
      nodeRange.setEnd(textNode, textNode.length);
    }

    if (nodeRange.toString().trim()) {
      const mark = document.createElement('mark');
      mark.className = 'icycrow-highlight';
      mark.setAttribute('data-id', id);
      mark.setAttribute('data-color', color);
      
      try {
        nodeRange.surroundContents(mark);
      } catch (e) {
        // If surroundContents still fails (e.g. range split across nodes), we skip or use a simpler injection
      }
    }
  }
}
/**
 * Remove a highlight by unwrapping its <mark> elements
 * Following Rule #2 of Phase 3
 */
export function unwrapHighlight(id: string): void {
  const marks = document.querySelectorAll(`mark.icycrow-highlight[data-id="${id}"]`);
  console.log('[DEBUG-UNWRAP-EXEC] found marks:', marks.length, 'for ID:', id);
  marks.forEach(mark => {
    const parent = mark.parentNode;
    console.log('[DEBUG-UNWRAP-MARK] parent exists:', !!parent);
    if (!parent) return;

    // Move all children out of the mark into the parent
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    // Remove the now-empty mark
    parent.removeChild(mark);
  });

  // Normalize parent nodes to merge adjacent text nodes
  const parents = new Set<Node>();
  marks.forEach(mark => {
    if (mark.parentNode) parents.add(mark.parentNode);
  });
  parents.forEach(p => p.normalize());
}
