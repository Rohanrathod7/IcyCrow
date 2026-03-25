/** @vitest-environment jsdom */
/** @jsx h */
import { h } from 'preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { InkCanvas } from '../../../src/workspace/components/InkCanvas';

describe('InkCanvas', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    // Mock getBoundingClientRect
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    });
    
    vi.clearAllMocks();
  });

  it('should trigger drawing on pointer events', () => {
    const { container } = render(<InkCanvas width={800} height={600} />);
    const canvas = container.querySelector('canvas')!;

    // Start stroke
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pressure: 0.5 });
    
    // Move
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20, pressure: 0.5 });
    
    // End
    fireEvent.pointerUp(canvas);

    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.fillStyle).toBe('#90CAF9');
  });

  it('should simplify path on pointer up', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const { container } = render(<InkCanvas width={800} height={600} />);
    const canvas = container.querySelector('canvas')!;

    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
    fireEvent.pointerUp(canvas);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Stroke Complete. Compressed 3 points'));
  });
});
