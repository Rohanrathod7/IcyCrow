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
  return normalizedPoints.map(p => ({
    ...p,
    x: p.x * currentWidth,
    y: p.y * currentHeight
  }));
}
