---
name: preact-ui
description: The Master Rulebook for Frontend UI development using Preact and Preact Signals. Use this skill WHENEVER building, reviewing, or planning User Interface components. It enforces zero-React dependencies, functional components, and high-performance DOM rendering.
---

# 🎨 Preact UI Master Guide: The Frontend Protocol

When building User Interfaces for the IcyCrow extension (Popup, Options page, or Content Scripts), you MUST use Preact. You are strictly forbidden from installing or importing standard React.

## 1. The Golden Rule: Zero React
* **No React Imports:** NEVER `import { useState } from 'react'`. If you do this, Vite will crash.
* **The Correct Imports:**
  * Hooks: `import { useState, useEffect } from 'preact/hooks';`
  * Core: `import { h, Component, render } from 'preact';`
  * State: `import { signal, computed } from '@preact/signals';`

## 2. State Management (Signals > Hooks)
Preact Signals are the mandatory state management tool for this project. They bypass the Virtual DOM for surgical, high-speed updates.
* **When to use `useState`:** Only for isolated, trivial UI toggles (e.g., `isDropdownOpen`).
* **When to use `signal`:** For all extension data, shared state, and forms.
* **Direct DOM Rendering:** When rendering a signal in JSX, pass the signal directly to avoid re-rendering the whole component.
  ```tsx
  // ✅ GOOD: Surgical DOM update (component does NOT re-render)
  const count = signal(0);
  const Counter = () => <div>{count}</div>; 
  
  // ❌ BAD: Forces full component re-render
  const Counter = () => <div>{count.value}</div>;
  ```
* **Logic Mutation:** When mutating a signal inside a function or hook, you MUST use .value.
  ```tsx
  const increment = () => count.value++;
  ```

## 3. Component Architecture
* **Functional Components Only:** Class components are forbidden.
* **Strict TypeScript Props:** Every component MUST define its props using a TypeScript interface.

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
}
export const Button = ({ label, onClick }: ButtonProps) => (...)
```
* **Fragment Usage:** Use Preact Fragments (<> ... </>) to group elements without adding unneeded div wrappers to the DOM.

## 4. UI Injection & Styling (Content Scripts)
When building UI that will be injected into a host website (like a   tab manager overlay):
* **Shadow DOM is Mandatory:** You MUST mount the Preact <App /> inside a Shadow Root.
* **Scoped CSS:** Inject the extension's CSS directly into the Shadow Root so the host website's stylesheets do not distort the extension's UI.

## 5. Preact Anti-Patterns (NEVER DO THESE)
* **Prop Drilling:** Never pass props down more than 2 levels. If a deeply nested component needs data, create a shared signal in a separate store.ts file and import it directly.
* **Heavy Libraries:** Never install react-router-dom, framer-motion, or redux. Use native browser APIs, lightweight Preact alternatives, or simple state-driven routing.
* **Missing Cleanup:** If your Preact component adds a chrome.runtime.onMessage listener in a useEffect, you MUST return a cleanup function to remove the listener when the component unmounts.