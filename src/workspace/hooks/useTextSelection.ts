import { useEffect } from 'preact/hooks';
import { selectedPdfText, aiMenuPosition } from '../store/ai-state';

export const useTextSelection = () => {
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';

      if (!text || selection?.rangeCount === 0) {
        selectedPdfText.value = '';
        aiMenuPosition.value = null;
        return;
      }

      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        selectedPdfText.value = text;
        aiMenuPosition.value = {
          x: rect.left + rect.width / 2,
          y: rect.top - 40
        };
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);
};
