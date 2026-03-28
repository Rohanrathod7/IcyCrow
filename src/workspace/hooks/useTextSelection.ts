import { useEffect } from 'preact/hooks';
import { selectedPdfText, aiMenuPosition } from '../store/ai-state';

export const useTextSelection = () => {
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !selection.toString().trim()) {
        selectedPdfText.value = '';
        aiMenuPosition.value = null;
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Find the page number from the closest container
      const container = (range.startContainer.parentElement?.closest('.pdf-page-container') || 
                         range.endContainer.parentElement?.closest('.pdf-page-container')) as HTMLElement;
      
      const pageNumAttr = container?.getAttribute('data-testid');
      const pageNumber = pageNumAttr ? parseInt(pageNumAttr.split('-').pop() || '1') : 1;

      selectedPdfText.value = selection.toString().trim();
      aiMenuPosition.value = {
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + window.scrollY,
        pageNumber
      };
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);
};
