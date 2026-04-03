import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the sleeping dino and emotional copy', () => {
    render(<EmptyState onAction={() => {}} />);
    
    // Check for the sleeping dino sprite container
    const dino = screen.getByTestId('sleeping-dino');
    expect(dino).toBeTruthy();
    
    // Check for the emotional copy
    expect(screen.getByText(/It's quiet in here/i)).toBeTruthy();
    expect(screen.getByText(/Save your open tabs to create your first workspace/i)).toBeTruthy();
  });

  it('triggers the CTA callback when clicked', () => {
    const onAction = vi.fn();
    render(<EmptyState onAction={onAction} />);
    
    const button = screen.getByRole('button', { name: /Create your first space/i });
    fireEvent.click(button);
    
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
