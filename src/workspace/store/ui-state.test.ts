import { describe, it, expect } from 'vitest';
import { isSidebarOpen } from './ui-state';

describe('UI State', () => {
  it('should have isSidebarOpen defaulting to false', () => {
    expect(isSidebarOpen.value).toBe(false);
  });

  it('should toggle isSidebarOpen', () => {
    isSidebarOpen.value = true;
    expect(isSidebarOpen.value).toBe(true);
    isSidebarOpen.value = false;
    expect(isSidebarOpen.value).toBe(false);
  });
});
