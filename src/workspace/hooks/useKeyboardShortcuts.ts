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

      // 3. Tool Switching (Single letter shortcuts)
      if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        switch (key) {
          case 'v':
            e.preventDefault();
            activeTool.value = 'select';
            break;
          case 'h': // H for highlight
            e.preventDefault();
            activeTool.value = 'highlight';
            break;
          case 'p':
            e.preventDefault();
            activeTool.value = 'draw';
            break;
          case 's': // Sticky note
            e.preventDefault();
            activeTool.value = 'sticky';
            break;
          case 'e':
            e.preventDefault();
            activeTool.value = 'eraser';
            break;
          case 't':
            e.preventDefault();
            activeTool.value = 'text';
            break;
          case 'c':
            e.preventDefault();
            activeTool.value = 'callout';
            break;
          case 'f':
            e.preventDefault();
            activeTool.value = 'flashcard';
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
