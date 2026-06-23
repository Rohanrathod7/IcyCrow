import { useEffect } from 'preact/hooks';
import { activeTool, isSearchOpen } from '../store/viewer-state';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Focus Gatekeeper (CRITICAL)
      const active = document.activeElement;
      const isTyping = 
        active?.tagName === 'INPUT' || 
        active?.tagName === 'TEXTAREA' || 
        (active as HTMLElement)?.isContentEditable;
      
      if (isTyping) {
        // If typing in search input, allow Esc to close search
        if (e.key === 'Escape' && isSearchOpen.value) {
          isSearchOpen.value = false;
          (active as HTMLElement).blur();
        }
        return;
      }

      const key = e.key.toLowerCase();

      // 2. Control Key Combinations
      if (e.ctrlKey || e.metaKey) {
        if (key === 's') {
          e.preventDefault();
          if (e.shiftKey) {
            window.dispatchEvent(new CustomEvent('workspace-save-as'));
          } else {
            window.dispatchEvent(new CustomEvent('workspace-save'));
          }
          return;
        }
        if (key === 'p') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('workspace-print'));
          return;
        }
        if (key === 'f') {
          e.preventDefault();
          isSearchOpen.value = !isSearchOpen.value;
          return;
        }
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
