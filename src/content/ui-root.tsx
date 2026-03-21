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
  
  // High z-index to stay on top
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.top = '0';
  host.style.left = '0';
  host.style.pointerEvents = 'none'; // Background transparent to clicks

  const shadow = host.attachShadow({ mode: 'open' });

  // CSS Reset for Isolation
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      display: block;
      contain: content;
      font-family: system-ui, -apple-system, sans-serif;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    #icycrow-mount {
      pointer-events: auto; /* Re-enable clicks for the UI itself */
    }
    * {
      box-sizing: border-box !important;
    }
  `;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  mountPoint.id = 'icycrow-mount';
  shadow.appendChild(mountPoint);

  document.documentElement.appendChild(host);
  return mountPoint;
}
