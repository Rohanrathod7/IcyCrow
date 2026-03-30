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

  it('renders correctly with new SaaS header and glass styling', () => {
    const { container } = render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByText('New Space')).toBeTruthy();
    expect(screen.getByTestId('icon-close')).toBeTruthy();
    
    // Header should be a flex container with justify-between
    const header = container.querySelector('h2')?.parentElement;
    expect(header?.className).toContain('flex-row');
    
    // Modal should use glass styling
    const modal = container.querySelector('.modal-content');
    expect(modal?.className).toContain('modal-glass');
  });

  it('uses premium typography for labels', () => {
    const { container } = render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    const labels = container.querySelectorAll('label:not(.checkbox-label)');
    labels.forEach(label => {
      expect(label.className).toContain('label-saas');
    });
  });

  it('has a cancel button with ghost styling', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton.className).toContain('btn-ghost-premium');
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
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
