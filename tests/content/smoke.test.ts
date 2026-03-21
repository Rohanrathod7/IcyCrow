// @vitest-environment jsdom
import { it, expect } from 'vitest';

it('JSDOM works', () => {
  document.body.innerHTML = '<div>Hello</div>';
  expect(document.body.textContent).toBe('Hello');
  expect(Node.ELEMENT_NODE).toBe(1);
});
