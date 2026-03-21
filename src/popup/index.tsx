import { render } from 'preact';
import { signal } from '@preact/signals';

// 1. Global Signal (Zero-cost re-renders)
const count = signal(0);

const App = () => (
  <div style={{ padding: '20px', fontFamily: 'sans-serif', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
    <h1>🐦 IcyCrow</h1>
    <p>Native Glass & Bento Grid initialized.</p>
    <button onClick={() => count.value++} style={{ padding: '8px 16px', cursor: 'pointer' }}>
      Tabs Audited: {count}
    </button>
  </div>
);

// 🛡️ 2. SHADOW DOM INJECTION (The MV3 Way)
const initIcyCrow = () => {
  // Create a host element to inject into the physical page
  const host = document.createElement('div');
  host.id = 'icycrow-extension-root';
  
  // Keep it floating above the host website
  host.style.position = 'fixed';
  host.style.bottom = '20px';
  host.style.right = '20px';
  host.style.zIndex = '999999';
  
  document.body.appendChild(host);

  // Attach a Shadow DOM to encapsulate and protect our CSS from the host website
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Create the actual mount point inside the protected shadow tree
  const mountPoint = document.createElement('div');
  shadowRoot.appendChild(mountPoint);

  // Render Preact INTO the isolated Shadow DOM
  render(<App />, mountPoint);
};

// Initialize the extension UI
initIcyCrow();