/**
 * Ramer-Douglas-Peucker algorithm for path simplification.
 * Reduces the number of points in a curve while preserving its basic shape.
 */
export function simplifyPath<T extends { x: number, y: number }>(points: T[], tolerance: number): T[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = getPerpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPath(points.slice(0, index + 1), tolerance);
    const right = simplifyPath(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [points[0], points[points.length - 1]];
  }
}

/**
 * Calculates the perpendicular distance from a point to a line segment.
 */
function getPerpendicularDistance(p: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }): number {
  const numerator = Math.abs((p2.y - p1.y) * p.x - (p2.x - p1.x) * p.y + p2.x * p1.y - p2.y * p1.x);
  const denominator = Math.sqrt(Math.pow(p2.y - p1.y, 2) + Math.pow(p2.x - p1.x, 2));
  
  // If points are identical, denominator is 0
  if (denominator === 0) {
    return Math.sqrt(Math.pow(p.x - p1.x, 2) + Math.pow(p.y - p1.y, 2));
  }
  
  return numerator / denominator;
}
