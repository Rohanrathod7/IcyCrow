import { useEffect, useRef } from 'preact/hooks';
import { effect } from '@preact/signals';
import { 
  toolbarPosition, 
  floatingCoordinates, 
  toolbarIsDragging 
} from '../store/toolbar-state';
import { pdfUrl, autoSaveFileHandle, isAutoSaveEnabled } from '../store/viewer-state';
import { highlights, strokes, stickyNotes, callouts } from '../store/annotation-state';
import { saveToHandle } from '../services/StateSyncService';
import { EdgeToolbar } from './EdgeToolbar';
import { CircularToolbar } from './CircularToolbar';
import { WorkspaceImportModal } from './WorkspaceImportModal';

export const ToolbarManager = () => {
  const rafId = useRef<number | null>(null);
  const saveTimeout = useRef<any>(null);

  // Auto-Save Effect
  useEffect(() => {
    const dispose = effect(() => {
      // Trigger on any annotation change
      const data = {
        version: '1.0',
        documentUrl: pdfUrl.value,
        highlights: highlights.value,
        strokes: strokes.value,
        stickyNotes: stickyNotes.value,
        callouts: callouts.value,
        exportedAt: new Date().toISOString()
      };

      if (isAutoSaveEnabled.value && autoSaveFileHandle.value) {
        // Debounce saves
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
          console.log("Auto-Saving to linked file...");
          await saveToHandle(autoSaveFileHandle.value, data as any);
        }, 2000);
      }
    });
    return () => {
      dispose();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const startDragCoords = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!toolbarIsDragging.value) return;

      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const x = e.clientX;
        const y = e.clientY;

        // Coordinates for the floating toolbar handle center
        const newCoords = { x, y };

        // Handle Hysteresis / Stickiness
        if (toolbarPosition.value !== 'floating') {
          const margin = 100;
          let shouldUndock = false;

          if (toolbarPosition.value === 'bottom' && y < window.innerHeight - margin) shouldUndock = true;
          else if (toolbarPosition.value === 'top' && y > margin) shouldUndock = true;
          else if (toolbarPosition.value === 'left' && x > margin) shouldUndock = true;
          else if (toolbarPosition.value === 'right' && x < window.innerWidth - margin) shouldUndock = true;

          if (shouldUndock) {
            toolbarPosition.value = 'floating';
          }
        }

        // Only update if we're floating
        if (toolbarPosition.value === 'floating') {
          floatingCoordinates.value = newCoords;
        }
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!toolbarIsDragging.value) return;
      toolbarIsDragging.value = false;

      const x = e.clientX;
      const y = e.clientY;
      const dockMargin = 50;

      if (x < dockMargin) toolbarPosition.value = 'left';
      else if (x > window.innerWidth - dockMargin) toolbarPosition.value = 'right';
      else if (y < dockMargin) toolbarPosition.value = 'top';
      else if (y > window.innerHeight - dockMargin) toolbarPosition.value = 'bottom';
    };

    const handleResize = () => {
      const margin = 20;
      const newX = Math.min(floatingCoordinates.value.x, window.innerWidth - margin);
      const newY = Math.min(floatingCoordinates.value.y, window.innerHeight - margin);
      
      floatingCoordinates.value = { 
        x: Math.max(margin, newX), 
        y: Math.max(margin, newY) 
      };
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const handlePointerDown = (e: any) => {
    // Hub drag handle logic
    toolbarIsDragging.value = true;
    startDragCoords.current = { x: e.clientX, y: e.clientY };
  };

  const isFloating = toolbarPosition.value === 'floating';
  
  const rootStyle: any = {
    position: 'fixed',
    zIndex: 10000,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
  };

  const floatingStyle: any = {
    pointerEvents: 'auto',
    transform: `translate3d(${floatingCoordinates.value.x}px, ${floatingCoordinates.value.y}px, 0) translate(-50%, -50%)`,
    position: 'absolute',
    willChange: 'transform',
  };

  return (
    <div className="toolbar-manager-root" style={rootStyle} data-testid="toolbar-root">
      <div 
        onPointerDown={handlePointerDown}
        style={isFloating ? floatingStyle : { pointerEvents: 'auto' }}
        data-testid={isFloating ? "floating-container" : "edge-container"}
      >
        {isFloating ? (
          <CircularToolbar />
        ) : (
          <EdgeToolbar />
        )}
      </div>
      <WorkspaceImportModal />
    </div>
  );
};
