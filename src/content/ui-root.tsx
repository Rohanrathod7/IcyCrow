import { render } from 'preact';
import { HighlightTooltip } from './components/HighlightTooltip';
import { FlashcardCreator } from './components/FlashcardCreator';
import { WebInkCanvas } from './components/WebInkCanvas';
import { WebHtmlAnnotations } from './components/WebHtmlAnnotations';
import { WebToolbarManager } from './components/WebToolbarManager';
import { WebFlashcardViewer } from './components/WebFlashcardViewer';
import { initWebAnnotations } from './store/web-annotation-state';
import toolbarStyles from '../workspace/components/Toolbar.css?inline';

/**
 * Initialize the IcyCrow UI Root in the host page
 * Following content-script-css SKILL and LLD §5
 */
export function initUiRoot(): HTMLElement {
  const existingHost = document.getElementById('icycrow-extension-root');
  if (existingHost) {
    return existingHost.shadowRoot?.querySelector('#icycrow-mount') as HTMLElement;
  }

  const host = document.createElement('div');
  host.id = 'icycrow-extension-root';
  
  // High z-index and explicit positioning at document root
  host.style.position = 'absolute';
  host.style.zIndex = '2147483647';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100%';
  host.style.pointerEvents = 'none';

  const shadow = host.attachShadow({ mode: 'open' });

  // CSS Reset with Force Visibility
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial !important;
      display: block !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 0 !important;
      overflow: visible !important;
      pointer-events: none !important;
    }
    #icycrow-mount {
      all: initial !important;
      pointer-events: auto !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      overflow: visible !important;
      display: block !important;
    }
    * {
      box-sizing: border-box !important;
    }
    
    /* Inject Toolbar Styles */
    ${toolbarStyles}
  `;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  mountPoint.id = 'icycrow-mount';
  shadow.appendChild(mountPoint);

  initWebAnnotations().then(() => {
    render(
      <div>
        <WebInkCanvas />
        <WebHtmlAnnotations />
        <WebToolbarManager />
        <HighlightTooltip />
        <FlashcardCreator />
        <WebFlashcardViewer />
      </div>,
      mountPoint
    );
  });

  // Appending to documentElement is safer for sites that re-write or sandbox the body (like Gemini)
  document.documentElement.appendChild(host);
  
  return mountPoint;
}

