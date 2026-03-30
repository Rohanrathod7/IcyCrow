import { render, screen, fireEvent } from '@testing-library/preact';
import { SpaceForm } from './SpaceForm';
import { describe, it, expect, vi } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-preact', () => ({
  X: () => <div data-testid="icon-close" />,
}));

describe('SpaceForm Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders correctly with new SaaS header', () => {
    const { container } = render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByText('New Space')).toBeTruthy();
    expect(screen.getByTestId('icon-close')).toBeTruthy();
    
    // Header should be a flex container with justify-between
    const header = container.querySelector('h2')?.parentElement;
    expect(header?.className).toContain('flex-row');
    expect(header?.className).toContain('items-center');
  });

  it('has a cancel button with ghost styling', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton.className).toContain('btn-ghost-premium'); // New SaaS class
  });

  it('uses clickable checkbox labels', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    // Find the labels specifically
    const captureLabel = screen.getByText(/Capture currently/i);
    const createLabel = screen.getByText(/Create native/i);
    
    expect(captureLabel.closest('label')?.className).toContain('checkbox-label');
    expect(createLabel.closest('label')?.className).toContain('checkbox-label');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    // Check footer alignment (parent of the Cancel button)
    const cancelButton = screen.getByText('Cancel');
    const footer = cancelButton.parentElement;
    expect(footer?.className).toContain('items-center');

    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
