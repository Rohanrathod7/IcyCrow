// @vitest-environment jsdom
import { h } from 'preact';
import { render, fireEvent, screen } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpaceForm } from '../../../src/side-panel/components/SpaceForm';

describe('SpaceForm', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('validates that name is required', async () => {
    const handleSubmit = vi.fn();
    const root = document.getElementById('app')!;
    render(<SpaceForm onSubmit={handleSubmit} onCancel={() => {}} />, { container: root });
    
    const saveBtn = screen.getByRole('button', { name: /Create Space/i });
    fireEvent.click(saveBtn);
    
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(document.body.innerHTML).toContain('Name is required');
  });

  it('dispatches submission with correct data', async () => {
    const handleSubmit = vi.fn();
    const root = document.getElementById('app')!;
    render(<SpaceForm onSubmit={handleSubmit} onCancel={() => {}} />, { container: root });
    
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    fireEvent.input(nameInput, { target: { value: 'My New Space' } });
    
    // Choose a color swatch
    const swatch = document.querySelector('.color-swatch') as HTMLElement;
    fireEvent.click(swatch);
    
    const saveBtn = screen.getByRole('button', { name: /Create Space/i });
    fireEvent.click(saveBtn);
    
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My New Space',
      createTabGroup: expect.any(Boolean)
    }));
  });
});
