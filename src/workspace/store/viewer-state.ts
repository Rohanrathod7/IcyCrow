import { signal } from '@preact/signals';

export type ToolType = 'pan' | 'select' | 'highlight' | 'draw';

export const viewerScale = signal<number>(1.0);
export const activeTool = signal<ToolType>('pan');
