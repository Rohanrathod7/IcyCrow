import { signal, effect } from '@preact/signals';

export type ToolType = 'pan' | 'select' | 'highlight' | 'draw' | 'brush' | 'eraser' | 'more' | 'color' | 'text' | 'sticky' | 'callout' | 'zoomReset' | 'flashcard';

export interface ToolSettings {
  size: number;
  color?: string;
  opacity?: number;
  mode?: 'text' | 'freehand';
}

export const viewerScale = signal<number>(1.0);
export const activeTool = signal<ToolType>('pan');
export const activeCustomizationTool = signal<ToolType | null>(null);

export const toolSettings = signal<Record<string, ToolSettings>>({
  draw: { size: 4, color: '#facc15' },
  brush: { size: 8, color: '#fb923c' },
  eraser: { size: 20 },
  highlight: { size: 20, color: '#eab308', opacity: 0.4, mode: 'text' },
  'highlight-yellow': { size: 20, color: '#eab308', opacity: 0.4, mode: 'text' },
  'highlight-green': { size: 20, color: '#22c55e', opacity: 0.4, mode: 'text' },
  'highlight-blue': { size: 20, color: '#3b82f6', opacity: 0.4, mode: 'text' },
  sticky: { size: 24, color: '#fbbf24' },
  callout: { size: 2, color: '#3b82f6' }
});

// Sync toolSettings across workspace tabs, SidePanel, and content script contexts
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  let hasHydrated = false;

  // Load initial persisted tool settings
  chrome.storage.local.get('icycrow_tool_settings', (res) => {
    if (res && res.icycrow_tool_settings) {
      toolSettings.value = {
        ...toolSettings.value,
        ...res.icycrow_tool_settings
      };
    }
    hasHydrated = true;
  });

  // Watch signal and save to storage when settings change (debounced to avoid performance/sync loops)
  let saveTimeout: any = null;
  effect(() => {
    const currentSettings = toolSettings.value;
    if (!hasHydrated) return;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      chrome.storage.local.get('icycrow_tool_settings', (res) => {
        const saved = (res?.icycrow_tool_settings || {}) as Record<string, ToolSettings>;
        const isDifferent = Object.keys(currentSettings).some(key => {
          const s1 = currentSettings[key];
          const s2 = saved[key];
          if (!s2) return true;
          return s1.color !== s2.color || 
                 s1.opacity !== s2.opacity || 
                 s1.size !== s2.size ||
                 s1.mode !== s2.mode;
        });
        if (isDifferent) {
          chrome.storage.local.set({ 'icycrow_tool_settings': currentSettings });
        }
      });
    }, 150);
  });

  // Listen for changes from other contexts to keep in-memory signal updated
  if (chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.icycrow_tool_settings) {
        const newVal = changes.icycrow_tool_settings.newValue as Record<string, ToolSettings> | undefined;
        if (newVal) {
          const hasChanges = Object.keys(newVal).some(key => {
            const oldSetting = toolSettings.value[key];
            const newSetting = newVal[key];
            if (!oldSetting) return true;
            return oldSetting.color !== newSetting.color || 
                   oldSetting.opacity !== newSetting.opacity || 
                   oldSetting.size !== newSetting.size ||
                   oldSetting.mode !== newSetting.mode;
          });
          if (hasChanges) {
            toolSettings.value = {
              ...toolSettings.value,
              ...newVal
            };
          }
        }
      }
    });
  }
}

export const originalPdfBlob = signal<Blob | null>(null);
export const pdfUrl = signal<string>('');
export const autoSaveFileHandle = signal<any | null>(null); // FileSystemFileHandle
export const isAutoSaveEnabled = signal<boolean>(false);

export const pdfRotation = signal<number>(0);
export const pageLayoutMode = signal<'single' | 'double'>('single');
export const currentPage = signal<number>(1);

export const isSearchOpen = signal<boolean>(false);
export const searchQuery = signal<string>('');
export const searchResults = signal<number[]>([]);
export const searchIndex = signal<number>(-1);
