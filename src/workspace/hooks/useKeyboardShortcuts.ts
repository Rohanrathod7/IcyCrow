import { useEffect } from 'preact/hooks';
import { activeTool } from '../store/viewer-state';
import { exportWorkspace } from '../services/StateSyncService';
import { pdfUrl } from '../store/viewer-state';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Focus Gatekeeper (CRITICAL)
      const active = document.activeElement;
      const isTyping = 
        active?.tagName === 'INPUT' || 
        active?.tagName === 'TEXTAREA' || 
        (active as HTMLElement)?.isContentEditable;
      
      if (isTyping) return;

      const key = e.key.toLowerCase();

      // 2. Save Override (Ctrl/Cmd + S)
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        if (pdfUrl.value) {
          // Assuming pages count and filename are available or defaults are used
          // In a real scenario, we might want to store pageCount in store
          exportWorkspace(pdfUrl.value, 0, 'notes'); 
        }
        return;
      }

      // 3. Tool Switching
      switch (key) {
        case 'v':
          activeTool.value = 'select';
          break;
        case 'h':
          activeTool.value = 'pan';
          break;
        case 'm':
          activeTool.value = 'highlight';
          break;
        case 'p':
          activeTool.value = 'draw';
          break;
        case 'e':
          activeTool.value = 'eraser';
          break;
        case 't':
          activeTool.value = 'text';
          break;
        case 's':
          activeTool.value = 'sticky';
          break;
        case 'c':
          activeTool.value = 'callout';
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
