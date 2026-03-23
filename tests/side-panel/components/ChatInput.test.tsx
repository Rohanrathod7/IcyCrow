// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { ChatInput } from '../../../src/side-panel/components/ChatInput';

describe('ChatInput Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('should render input and send button', () => {
    const { getByPlaceholderText, getByRole } = render(<ChatInput onSubmit={() => {}} />);
    expect(getByPlaceholderText(/Ask anything/i)).toBeDefined();
    expect(getByRole('button')).toBeDefined();
  });

  it('should call onSubmit with the prompt and clear input', async () => {
    const onSubmit = vi.fn();
    const { getByPlaceholderText, getByRole } = render(<ChatInput onSubmit={onSubmit} />);
    const input = getByPlaceholderText(/Ask anything/i) as HTMLTextAreaElement;
    const button = getByRole('button');

    fireEvent.input(input, { target: { value: 'How are you?' } });
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith('How are you?');
    expect(input.value).toBe('');
  });

  it('should be disabled when the disabled prop is true', () => {
    const { getByPlaceholderText, getByRole } = render(<ChatInput onSubmit={() => {}} disabled={true} />);
    const input = getByPlaceholderText(/Ask anything/i) as HTMLTextAreaElement;
    const button = getByRole('button');

    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);
  });
});
