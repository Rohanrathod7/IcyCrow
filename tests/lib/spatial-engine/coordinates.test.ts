import { describe, it, expect } from 'vitest';
import { normalizePath, denormalizePath } from '../../../src/lib/spatial-engine/coordinates';

describe('Coordinate Engine', () => {
  it('should normalize coordinates to 0-1 range', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 400, y: 300 },
      { x: 800, y: 600 }
    ];
    const normalized = normalizePath(points, 800, 600);
    
    expect(normalized).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 }
    ]);
  });

  it('should denormalize coordinates back to correct pixels at different zoom', () => {
    const normalized = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 }
    ];
    
    // Scale up to a 1600x1200 high-DPI canvas
    const denormalized = denormalizePath(normalized, 1600, 1200);
    
    expect(denormalized).toEqual([
      { x: 0, y: 0 },
      { x: 800, y: 600 },
      { x: 1600, y: 1200 }
    ]);
  });

  it('should handle pressure during normalization', () => {
    const points = [{ x: 400, y: 300, pressure: 0.8 }];
    const normalized = normalizePath(points, 800, 600);
    expect(normalized[0].pressure).toBe(0.8);
  });
});
