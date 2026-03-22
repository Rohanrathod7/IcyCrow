import { render } from 'preact';
import { App } from './App';

const mountPoint = document.getElementById('app');
if (mountPoint) {
  render(<App />, mountPoint);
} else {
  console.error('Failed to find side-panel mount point: #app');
}
