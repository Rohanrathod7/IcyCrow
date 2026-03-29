import { render, screen, fireEvent } from '@testing-library/preact';
import { SpaceForm } from './SpaceForm';
import { describe, it, expect, vi } from 'vitest';

describe('SpaceForm Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders correctly', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByText('New Space')).toBeTruthy();
  });

  it('has a cancel button with correct styling', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton.className).toContain('btn-secondary-dark');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
