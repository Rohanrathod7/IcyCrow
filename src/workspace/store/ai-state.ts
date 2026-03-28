import { signal } from '@preact/signals';

export const selectedPdfText = signal<string>('');
export const aiMenuPosition = signal<{ x: number, y: number } | null>(null);
export const isAiLoading = signal<boolean>(false);
export const aiResponse = signal<string | null>(null);
