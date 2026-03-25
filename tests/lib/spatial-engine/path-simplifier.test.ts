import { describe, it, expect } from 'vitest';
import { simplifyPath } from '../../../src/lib/spatial-engine/path-simplifier';

describe('PathSimplifier (Ramer-Douglas-Peucker)', () => {
  it('should significantly reduce points on a straight line with jitter', () => {
    // Generate a line from (0,0) to (100,0) with 101 points
    const points = Array.from({ length: 101 }, (_, i) => ({
      x: i,
      y: Math.sin(i * 10) * 0.1 // Slight jitter (< 0.5)
    }));

    // With a tolerance of 1, it should simplify to basically 2 points (start and end)
    const simplified = simplifyPath(points, 0.5);

    expect(simplified.length).toBeLessThan(10); 
    expect(simplified[0]).toEqual(points[0]);
    expect(simplified[simplified.length - 1]).toEqual(points[points.length - 1]);
  });

  it('should preserve sharp corners', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 50 }
    ];
    
    const simplified = simplifyPath(points, 0.1);
    expect(simplified.length).toBe(4);
  });
});
