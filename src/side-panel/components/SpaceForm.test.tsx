import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { SpaceForm } from './SpaceForm';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-preact', () => ({
  X: () => <div data-testid="icon-close" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Loader2: () => <div data-testid="icon-loader" className="animate-spin" />,
}));

// Mock Chrome API
const mockTabsQuery = vi.fn();
const mockRuntimeSendMessage = vi.fn();

(global as any).chrome = {
  tabs: {
    query: mockTabsQuery,
  },
  runtime: {
    sendMessage: mockRuntimeSendMessage,
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
  },
};

describe('SpaceForm Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('renders the auto-name sparkles button', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByTestId('icon-sparkles')).toBeTruthy();
  });

  it('triggers auto-naming and updates the input field', async () => {
    mockTabsQuery.mockResolvedValue([{ title: 'GitHub' }, { title: 'StackOverflow' }]);
    
    // Find the sparkles button
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    const sparkles = screen.getByTestId('icon-sparkles').parentElement;
    
    await fireEvent.click(sparkles!);
    
    expect(mockTabsQuery).toHaveBeenCalled();
    expect(mockRuntimeSendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'AI_QUERY',
      payload: expect.objectContaining({
        prompt: expect.stringContaining('Review these browser tab titles'),
        spaceId: null
      })
    }));

    // Mock the AI response message sequence
    const onMessageCallback = (global as any).chrome.runtime.onMessage.addListener.mock.calls[0][0];
    const taskId = mockRuntimeSendMessage.mock.calls[0][0].payload.taskId;
    
    // 1. Send chunk
    onMessageCallback({
      type: 'AI_RESPONSE_STREAM',
      payload: { taskId, chunk: 'Developer Workspace', done: false }
    });
    
    // 2. Send done
    onMessageCallback({
      type: 'AI_RESPONSE_STREAM',
      payload: { taskId, chunk: '', done: true }
    });

    // Wait for input update
    const input = screen.getByPlaceholderText(/e.g. Research/i) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('Developer Workspace'));
  });

  it('displays error and clears loading if Gemini tab is missing', async () => {
    mockTabsQuery.mockResolvedValue([{ title: 'GitHub' }]);
    mockRuntimeSendMessage.mockResolvedValue({ ok: false, error: { code: 'GEMINI_TAB_NOT_FOUND', message: 'Tab not found' } });

    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    const sparkles = screen.getByTestId('icon-sparkles').parentElement;
    
    await fireEvent.click(sparkles!);

    // Should wait for error text
    await waitFor(() => expect(screen.getByText(/AI Error: Tab not found/i)).toBeTruthy());
    
    // Should show sparkles again (not loader)
    expect(screen.queryByTestId('icon-loader')).toBeNull();
    expect(screen.getByTestId('icon-sparkles')).toBeTruthy();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('deduplicates tabs and shows janitor feedback on submit', async () => {
    // 1. Setup duplicate tabs
    const duplicateTabs = [
      { id: 1, title: 'Google', url: 'https://google.com' },
      { id: 2, title: 'Google Duplicate', url: 'https://google.com' },
      { id: 3, title: 'GitHub', url: 'https://github.com' }
    ];
    mockTabsQuery.mockResolvedValue(duplicateTabs);
    
    render(<SpaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    // 2. Fill form and check capture
    const input = screen.getByPlaceholderText(/e.g. Research/i);
    fireEvent.input(input, { target: { value: 'Dedupe Test' } });
    
    const captureCheckbox = screen.getByLabelText(/Capture currently/i) as HTMLInputElement;
    if (!captureCheckbox.checked) fireEvent.click(captureCheckbox);

    // 3. Submit
    const createButton = screen.getByRole('button', { name: /Create Space/i });
    fireEvent.click(createButton);

    // 4. Verify Janitor feedback
    await waitFor(() => expect(screen.getByText(/The Janitor cleaned up 1 duplicate/i)).toBeTruthy(), { timeout: 2000 });
    
    // 5. Verify unique tabs passed to onSubmit
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledWith(
      'Dedupe Test',
      expect.any(String),
      expect.objectContaining({ captureCurrentTabs: true }),
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://google.com' }),
        expect.objectContaining({ url: 'https://github.com' })
      ])
    ), { timeout: 3000 });
    
    // Should only have 2 unique tabs (Map deduplication)
    const submittedTabs = mockOnSubmit.mock.calls[0][1];
    expect(submittedTabs.length).toBe(2);
  });
});
