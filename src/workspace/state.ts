import { signal } from '@preact/signals';

export type ToolType = 'pen' | 'eraser' | 'cursor' | 'highlight-text';

export const activeTool = signal<ToolType>('pen');
export const activeColor = signal<string>('#90CAF9');
export const activeThickness = signal<number>(2);

export const setActiveTool = (tool: ToolType) => {
  activeTool.value = tool;
};

export const setActiveColor = (color: string) => {
  activeColor.value = color;
};
