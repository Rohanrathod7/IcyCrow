import { signal, effect } from '@preact/signals';

export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right' | 'floating';

export type ToolId = 
  | 'pan' 
  | 'select' 
  | 'highlight' 
  | 'draw' 
  | 'brush'
  | 'eraser'
  | 'color' 
  | 'text' 
  | 'more'
  | 'zoomReset';

export const toolbarPosition = signal<ToolbarPosition>('bottom');

export const floatingCoordinates = signal<{ x: number; y: number }>({ 
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, 
  y: typeof window !== 'undefined' ? window.innerHeight - 80 : 0 
});

export const toolsOrder = signal<ToolId[]>([
  'pan', 
  'select', 
  'highlight', 
  'draw', 
  'brush',
  'eraser',
  'text'
]);

export const toolbarIsDragging = signal<boolean>(false);

export const toolMetadata = signal<Record<string, { badge?: string | number; color?: string }>>({
  draw: { badge: 10, color: '#facc15' },
  brush: { badge: 5, color: '#fb923c' },
  highlight: { badge: 20, color: '#4ade80' },
  text: { color: '#4ade80' },
  select: { badge: 2 },
  eraser: { color: '#f87171' }
});

export const isToolPickerOpen = signal<boolean>(false);
export const isToolbarSettingsOpen = signal<boolean>(false);

const DEFAULT_TOOLS: ToolId[] = [
  'pan', 
  'select', 
  'highlight', 
  'draw', 
  'brush',
  'eraser',
  'text'
];

export const TOOL_LIBRARY = [
  { id: 'draw-red', type: 'draw', label: 'Red Pen', color: '#ef4444', size: 2 },
  { id: 'draw-blue', type: 'draw', label: 'Blue Pen', color: '#3b82f6', size: 2 },
  { id: 'brush-purple', type: 'brush', label: 'Art Brush', color: '#8b5cf6', size: 15 },
  { id: 'highlight-pink', type: 'highlight', label: 'Pink Marker', color: '#ec4899', size: 20 },
  { id: 'text-caption', type: 'text', label: 'Caption Tool', color: '#f59e0b' },
];

import { toolSettings } from './viewer-state';

export function addToolToToolbar(toolTemplate: any) {
  const newId = `${toolTemplate.type}-${Date.now()}`;
  
  // 1. Add to metadata for visual settings
  toolMetadata.value = {
    ...toolMetadata.value,
    [newId]: { color: toolTemplate.color, badge: toolTemplate.size }
  };

  // 2. Initialize tool settings for customization
  toolSettings.value = {
    ...toolSettings.value,
    [newId]: { 
      size: toolTemplate.size || 5, 
      color: toolTemplate.color, 
      opacity: 1.0 
    }
  };

  // 3. Add to order
  toolsOrder.value = [...toolsOrder.value, newId as any];
  
  isToolPickerOpen.value = false;
}

export function removeToolInstance(id: string) {
  toolsOrder.value = toolsOrder.value.filter(toolId => toolId !== id);
}

export function resetToolbarLayout() {
  toolsOrder.value = [...DEFAULT_TOOLS];
  toolbarPosition.value = 'bottom';
}

// Persistence Effect
if (typeof chrome !== 'undefined' && chrome.storage) {
  // Load initial
  chrome.storage.local.get(['icycrow_tools_order', 'icycrow_tool_metadata', 'icycrow_toolbar_pos'], (res) => {
    if (res && res.icycrow_tools_order) {
      toolsOrder.value = res.icycrow_tools_order as any;
    }
    if (res && res.icycrow_tool_metadata) {
      toolMetadata.value = res.icycrow_tool_metadata as any;
    }
    if (res && res.icycrow_toolbar_pos) {
      toolbarPosition.value = res.icycrow_toolbar_pos as ToolbarPosition;
    }
  });

  effect(() => {
    chrome.storage.local.set({ 
      'icycrow_tools_order': toolsOrder.value,
      'icycrow_tool_metadata': toolMetadata.value,
      'icycrow_toolbar_pos': toolbarPosition.value
    });
  });
}
