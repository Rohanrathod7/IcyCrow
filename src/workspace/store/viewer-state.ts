import { signal } from '@preact/signals';

export type ToolType = 'pan' | 'select' | 'highlight' | 'draw' | 'brush' | 'eraser' | 'more' | 'color' | 'text' | 'sticky' | 'callout' | 'zoomReset';

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
  highlight: { size: 20, color: '#fef08a', opacity: 0.4, mode: 'text' },
  sticky: { size: 24, color: '#fbbf24' },
  callout: { size: 2, color: '#3b82f6' }
});

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
