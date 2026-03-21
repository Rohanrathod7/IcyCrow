import { signal } from '@preact/signals';
import { HighlightColor } from '../lib/types';

export const tooltipVisible = signal(false);
export const tooltipPos = signal({ x: 0, y: 0 });
export const selectedColor = signal<HighlightColor>('yellow');
