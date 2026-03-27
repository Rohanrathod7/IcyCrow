import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { ToolbarManager } from '../../../src/workspace/components/ToolbarManager';
import { 
  toolbarPosition, 
  floatingCoordinates, 
  toolbarIsDragging 
} from '../../../src/workspace/store/toolbar-state';

// Mock sub-components
vi.mock('../../../src/workspace/components/EdgeToolbar', () => ({
  EdgeToolbar: () => <div data-testid="edge-toolbar" />
}));
vi.mock('../../../src/workspace/components/CircularToolbar', () => ({
  CircularToolbar: () => <div data-testid="circular-toolbar" />
}));

describe('ToolbarManager', () => {
  beforeEach(() => {
    toolbarPosition.value = 'bottom';
    floatingCoordinates.value = { x: 500, y: 500 };
    toolbarIsDragging.value = false;
    
    // Mock requestAnimationFrame for jsdom
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders with fixed positioning', () => {
    const { container } = render(<ToolbarManager />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.position).toBe('fixed');
  });

  it('uses translate3d for floating coordinates', async () => {
    toolbarPosition.value = 'floating';
    floatingCoordinates.value = { x: 300, y: 400 };
    
    const { getByTestId, rerender } = render(<ToolbarManager />);
    let floatingContainer = getByTestId('floating-container');
    
    // Check initial position
    expect(floatingContainer.style.transform).toContain('translate3d(300px, 400px, 0)');
    
    // Simulate drag
    fireEvent.pointerDown(floatingContainer, { clientX: 300, clientY: 400 });
    fireEvent.pointerMove(window, { clientX: 350, clientY: 450 });
    
    vi.runAllTimers();

    // Verify signal updated first
    expect(floatingCoordinates.value.x).toBe(350);
    expect(floatingCoordinates.value.y).toBe(450);
    
    // Force rerender or wait
    rerender(<ToolbarManager />);
    floatingContainer = getByTestId('floating-container');
    
    expect(floatingContainer.style.transform).toContain('translate3d(350px, 450px, 0)');
  });

  it('docks to an edge when released in the docking zone (50px)', async () => {
    toolbarPosition.value = 'floating';
    const { getByTestId } = render(<ToolbarManager />);
    const floatingContainer = getByTestId('floating-container');
    
    // Ensure window width/height is known
    Object.defineProperty(window, 'innerWidth', { value: 1000 });
    Object.defineProperty(window, 'innerHeight', { value: 1000 });

    // Simulate drag and release near left edge (x < 50)
    fireEvent.pointerDown(floatingContainer, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 30, clientY: 100 });
    vi.runAllTimers();
    
    fireEvent.pointerUp(window, { clientX: 30, clientY: 100 });

    expect(toolbarPosition.value).toBe('left');
  });

  it('remains sticky (hysteresis) until dragged 100px away', async () => {
    // Ensure window width/height is known
    Object.defineProperty(window, 'innerWidth', { value: 1000 });
    Object.defineProperty(window, 'innerHeight', { value: 1000 });
    
    toolbarPosition.value = 'bottom';
    const bottomEdgeY = 1000;
    
    const { getByTestId } = render(<ToolbarManager />);
    const edgeContainer = getByTestId('edge-container');

    // Start drag from bottom docked position
    fireEvent.pointerDown(edgeContainer, { clientX: 500, clientY: bottomEdgeY - 20 });
    
    // Move 60px away
    fireEvent.pointerMove(window, { clientX: 500, clientY: bottomEdgeY - 80 });
    vi.runAllTimers();
    expect(toolbarPosition.value).toBe('bottom');

    // Move 110px away
    fireEvent.pointerMove(window, { clientX: 500, clientY: bottomEdgeY - 110 });
    vi.runAllTimers();
    expect(toolbarPosition.value).toBe('floating');
  });

  it('clamps floating coordinates on window resize', () => {
    toolbarPosition.value = 'floating';
    floatingCoordinates.value = { x: 1000, y: 500 };
    
    render(<ToolbarManager />);

    // Change window size to be smaller than x coordinate
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    fireEvent(window, new Event('resize'));

    // Should be clamped (allowing for some margin, e.g., 20px)
    expect(floatingCoordinates.value.x).toBeLessThanOrEqual(800);
  });
});
