import { initUiRoot } from './ui-root';
import { render } from 'preact';

/**
 * IcyCrow Content Script Entry Point
 */
function main() {
  console.log('[IcyCrow] Content Script Loaded');
  const mountPoint = initUiRoot();
  
  // Future Phase 3: render(<App />, mountPoint)
  mountPoint.innerHTML = '<!-- Preact Root -->';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
