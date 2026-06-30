import { signal } from '@preact/signals';
import { HighlightColor } from '../lib/types';

export const tooltipVisible = signal(false);
export const tooltipPos = signal({ x: 0, y: 0 });
export const selectedColor = signal<HighlightColor>('yellow');

// Flashcard creator state
export const flashcardCreatorVisible = signal(false);
export const flashcardCreatorPos = signal({ x: 0, y: 0 });
export const activeHighlightIdForFlashcard = signal<string | null>(null);
export const activeHighlightTextForFlashcard = signal<string>('');
