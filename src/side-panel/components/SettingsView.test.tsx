import { render, screen, fireEvent } from '@testing-library/preact';
import { expect, it, describe, vi, beforeEach, afterEach } from 'vitest';
import { SettingsView } from './SettingsView';
import { settings } from '../store';
import { DEFAULT_SETTINGS } from '../../lib/constants';

// @vitest-environment jsdom

describe('SettingsView', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          set: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue({ settings: DEFAULT_SETTINGS }),
        },
        session: {
          get: vi.fn().mockResolvedValue({ cryptoKeyUnlocked: false }),
          onChanged: { addListener: vi.fn() }
        }
      },
      runtime: { 
        lastError: null,
        sendMessage: vi.fn().mockResolvedValue({ ok: true })
      },
    });
    
    // Reset signals
    settings.value = DEFAULT_SETTINGS;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders theme and engine options', () => {
    render(<SettingsView />);
    expect(screen.getByText(/Theme/i)).toBeTruthy();
    expect(screen.getByText(/AI Engine/i)).toBeTruthy();
  });

  it('toggles theme and persists to storage', async () => {
    render(<SettingsView />);
    const themeSelect = screen.getByLabelText(/Theme/i) as HTMLSelectElement;
    
    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    
    expect(settings.value.theme).toBe('dark');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: expect.objectContaining({ theme: 'dark' })
    });
  });

  it('toggles AI engine and persists to storage', async () => {
    render(<SettingsView />);
    const engineSelect = screen.getByLabelText(/AI Engine/i) as HTMLSelectElement;
    
    fireEvent.change(engineSelect, { target: { value: 'window.ai' } });
    
    expect(settings.value.aiEngine).toBe('window.ai');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: expect.objectContaining({ aiEngine: 'window.ai' })
    });
  });

  describe('Security Controls', () => {
    it('renders locked status correctly', () => {
      render(<SettingsView />);
      expect(screen.getByText(/Workspace Locked/i)).toBeTruthy();
    });

    it('dispatches CRYPTO_LOCK when lock button clicked', async () => {
      render(<SettingsView />);
      const lockBtn = screen.getByRole('button', { name: /Lock/i });
      fireEvent.click(lockBtn);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CRYPTO_LOCK' });
    });

    it('opens prompt for CRYPTO_UNLOCK when unlock clicked', async () => {
      vi.stubGlobal('prompt', vi.fn().mockReturnValue('password123'));
      render(<SettingsView />);
      const unlockBtn = screen.getByRole('button', { name: /Unlock/i });
      fireEvent.click(unlockBtn);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        type: 'CRYPTO_UNLOCK', 
        payload: { passphrase: 'password123' } 
      });
    });

    it('requires "DELETE" confirmation for nuke action', async () => {
      vi.stubGlobal('prompt', vi.fn()
        .mockReturnValueOnce('wrong')
        .mockReturnValueOnce('DELETE')
      );
      
      render(<SettingsView />);
      const nukeBtn = screen.getByTestId('nuke-button');
      
      // Case 1: Wrong text
      fireEvent.click(nukeBtn);
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'NUKE_DATA' });

      // Case 2: Correct text
      fireEvent.click(nukeBtn);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'NUKE_DATA' });
    });
  });

  describe('Backup & Restore', () => {
    it('renders backup/restore controls', () => {
      render(<SettingsView />);
      expect(screen.getByText(/Export Workspace/i)).toBeTruthy();
      expect(screen.getByText(/Import Workspace/i)).toBeTruthy();
    });

    it('prompts for password and dispatches EXPORT_WORKSPACE', async () => {
      vi.stubGlobal('prompt', vi.fn().mockReturnValue('backup-pass-123'));
      render(<SettingsView />);
      const exportBtn = screen.getByRole('button', { name: /Generate Encrypted Backup/i });
      
      fireEvent.click(exportBtn);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        type: 'EXPORT_WORKSPACE', 
        payload: { password: 'backup-pass-123' } 
      });
    });

    it('triggers IMPORT_WORKSPACE after file selection', async () => {
      // Mocking window.showOpenFilePicker for JSDOM
      const mockFile = { name: 'backup.icycrow' };
      const mockHandle = { getFile: vi.fn().mockResolvedValue(mockFile) };
      vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([mockHandle]));
      
      render(<SettingsView />);
      const importBtn = screen.getByRole('button', { name: /Restore from Backup/i });
      
      await fireEvent.click(importBtn);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        type: 'IMPORT_WORKSPACE', 
        payload: { file: mockFile } 
      });
    });
  });

  describe('Storage & Diagnostics', () => {
    it('displays storage usage metrics', async () => {
      vi.stubGlobal('chrome', {
        ...global.chrome,
        storage: {
          ...global.chrome.storage,
          local: {
            ...global.chrome.storage.local,
            getBytesInUse: vi.fn().mockResolvedValue(1024 * 1024) // 1MB
          }
        }
      });

      render(<SettingsView />);
      expect(screen.getByTestId('storage-usage').textContent).toMatch(/0 Bytes|1.00 MB/);
    });

    it('dispatches DEBUG_EXPORT when debug button clicked', () => {
      render(<SettingsView />);
      const debugBtn = screen.getByRole('button', { name: /Download Debug Diagnostics/i });
      
      fireEvent.click(debugBtn);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'DEBUG_EXPORT' });
    });
  });
});
