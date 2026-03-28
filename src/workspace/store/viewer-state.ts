import { signal } from '@preact/signals';

export type ToolType = 'pan' | 'select' | 'highlight' | 'draw' | 'brush' | 'eraser' | 'more' | 'color' | 'text' | 'sticky' | 'callout' | 'zoomReset';

export interface ToolSettings {
  size: number;
  color?: string;
  opacity?: number;
}

export const viewerScale = signal<number>(1.0);
export const activeTool = signal<ToolType>('pan');
export const activeCustomizationTool = signal<ToolType | null>(null);

export const toolSettings = signal<Record<string, ToolSettings>>({
  draw: { size: 4, color: '#facc15' },
  brush: { size: 8, color: '#fb923c' },
  eraser: { size: 20 },
  highlight: { size: 20, color: '#fef08a', opacity: 0.8 },
  sticky: { size: 24, color: '#fbbf24' },
  callout: { size: 2, color: '#3b82f6' }
});

export const originalPdfBlob = signal<Blob | null>(null);
export const pdfUrl = signal<string>('');
