// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initUiRoot } from '../../src/content/ui-root';

describe('UI Root: Shadow DOM Injection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('creates a host element and attaches an open shadow root', () => {
    initUiRoot();
    const host = document.getElementById('icycrow-extension-root');
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    expect(host?.shadowRoot?.mode).toBe('open');
  });

  it('injects a style tag into the shadow root for isolation', () => {
    initUiRoot();
    const host = document.getElementById('icycrow-extension-root')!;
    const style = host.shadowRoot?.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('all: initial');
    expect(style?.textContent).toContain(':host');
  });

  it('provides a mount point for Preact inside the shadow root', () => {
    const mountPoint = initUiRoot();
    const host = document.getElementById('icycrow-extension-root')!;
    expect(host.shadowRoot?.contains(mountPoint)).toBe(true);
  });
});
