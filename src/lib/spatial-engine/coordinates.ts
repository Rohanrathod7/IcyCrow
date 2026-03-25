interface Point {
  x: number;
  y: number;
  pressure?: number;
}

/**
 * Converts pixel coordinates (x, y) to normalized ratios (0-1) based on page dimensions.
 */
export function normalizePath<T extends Point>(points: T[], pageWidth: number, pageHeight: number): T[] {
  return points.map(p => ({
    ...p,
    x: p.x / pageWidth,
    y: p.y / pageHeight
  }));
}

/**
 * Converts normalized ratios back to pixel coordinates for a specific canvas dimension.
 */
export function denormalizePath<T extends Point>(normalizedPoints: T[], currentWidth: number, currentHeight: number): T[] {
  if (!normalizedPoints) return [];
  return normalizedPoints.map(p => ({
    ...p,
    x: p.x * currentWidth,
    y: p.y * currentHeight
  }));
}

export interface NormalizedRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Extracts and normalizes DOM rectangles from a window selection relative to a page container.
 * Merges adjacent rectangles on the same line for a cleaner look.
 */
export function getNormalizedRects(
  selection: Selection, 
  pageContainer: HTMLElement,
  pageWidth: number,
  pageHeight: number
): NormalizedRect[] {
  if (selection.rangeCount === 0 || pageWidth === 0 || pageHeight === 0) return [];
  
  const range = selection.getRangeAt(0);
  const rects = Array.from(range.getClientRects())
    .filter(r => r.width > 0.1 && r.height > 0.1);
    
  const containerRect = pageContainer.getBoundingClientRect();
  
  const normalized = rects.map(rect => ({
    top: (rect.top - containerRect.top) / pageHeight,
    left: (rect.left - containerRect.left) / pageWidth,
    width: rect.width / pageWidth,
    height: rect.height / pageHeight
  }));

  if (normalized.length <= 1) return normalized;

  // Merge nearby rects on the same line
  const sorted = [...normalized].sort((a, b) => a.top - b.top || a.left - b.left);
  const merged: NormalizedRect[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const sameLine = Math.abs(current.top - next.top) < 0.005; // 0.5% threshold
    const adjacent = next.left <= current.left + current.width + 0.01;

    if (sameLine && adjacent) {
      const right = Math.max(current.left + current.width, next.left + next.width);
      current.width = right - current.left;
      current.height = Math.max(current.height, next.height);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  
  return merged;
}
