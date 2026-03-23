import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { expect, it, describe, vi, afterEach } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// @vitest-environment jsdom

const CrashingComponent = () => {
  throw new Error('Test Crash');
};

describe('ErrorBoundary Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('catches render errors and shows a recovery UI', () => {
    // Suppress console.error for expected crash
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <CrashingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
    expect(screen.getByText(/Test Crash/i)).toBeTruthy();
    expect(screen.getByText(/Reset Extension/i)).toBeTruthy();
    
    consoleSpy.mockRestore();
  });

  it('allows recovery via reset button', () => {
    vi.stubGlobal('location', { reload: vi.fn() });
    
    render(
      <ErrorBoundary>
        <CrashingComponent />
      </ErrorBoundary>
    );

    const resetBtn = screen.getByText(/Reset Extension/i);
    fireEvent.click(resetBtn);
    
    expect(window.location.reload).toHaveBeenCalled();
  });
});
