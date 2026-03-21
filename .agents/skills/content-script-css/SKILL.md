---
name: content-script-css
description: Master Guide for CSS isolation and UI injection in Content Scripts. Use this skill WHENEVER building UI that lives inside a host webpage. It enforces Shadow DOM isolation, reset-styles, and prevents CSS bleed between the extension and the website.
---

# 🛡️ Content Script CSS: The Isolation Protocol

When injecting UI into a host webpage, you are entering a "hostile" CSS environment. You MUST use this protocol to protect IcyCrow's UI and prevent breaking the user's current webpage.

## 1. The Shadow DOM Mandate
Never append raw HTML/Preact directly to `document.body`. You MUST use an open Shadow Root to create a style boundary.

**The Mounting Pattern:**
```typescript
const host = document.createElement('div');
host.id = 'icycrow-root';
const shadow = host.attachShadow({ mode: 'open' });
document.body.appendChild(host);

// All Preact rendering and <style> tags go INSIDE 'shadow'
```

## 2. CSS Injection Strategies
Since the Shadow DOM blocks global styles, you must explicitly inject your extension's CSS into the shadow root.

### Option A: Inline Styles (Recommended for Vite)
Import your CSS as a string and inject a <style> tag.

```typescript
import styles from './Overlay.css?inline';
// ... inside mount logic
const sheet = new CSSStyleSheet();
sheet.replaceSync(styles);
shadow.adoptedStyleSheets = [sheet];
```

### Option B: Adopted StyleSheets
Use adoptedStyleSheets for high performance. This prevents the browser from re-parsing the CSS for every instance of the UI.

## 3. The "Aggressive Reset" (CSS Reset)
Even with a Shadow DOM, some styles (like line-height, color, and font-family) can inherit from the host. You MUST start your CSS with a hard reset inside the :host selector.

```css
:host {
  /* Reset inheritance */
  all: initial; 
  display: block;
  contain: content;
  
  /* Set Extension Defaults */
  font-family: system-ui, -apple-system, sans-serif;
  color: #1a1a1a;
  line-height: 1.5;
  text-rendering: optimizeLegibility;
}

/* Ensure box-sizing doesn't break from host site rules */
* {
  box-sizing: border-box !important;
}
```

## 4. Relative Units (The 'rem' Trap)
Host websites often redefine html { font-size: 62.5% } to make 1rem = 10px. If you use rem in your extension, your UI will shrink or grow depending on the website.

**The Rule:** NEVER use rem units in Content Scripts.

**The Fix:** Always use px or em for absolute control, or define a local CSS variable for your base font size inside the :host.

## 5. Z-Index Warfare
Host sites often have "Sticky" headers or modals with z-index: 999999.

**The Rule:** Always set the IcyCrow host container to a high, safe z-index, but use max-content or fixed positioning to ensure it stays in the viewport.

**Strategy:** Use 2147483647 (the maximum 32-bit integer) only if the UI must stay on top of everything (like an overlay).

## 6. CSS Anti-Patterns (NEVER DO THESE)

* ❌ Global Injection: Never add css: ["style.css"] to the manifest.json for content scripts. This will break the host website's layout. Always inject CSS into your Shadow Root via JS.

* ❌ !important Overuse: If you find yourself using !important on every line, your Shadow DOM setup is likely broken.

* ❌ Fixed Image Paths: Always use chrome.runtime.getURL('assets/logo.png') for images in CSS, as relative paths will try to load from the host site's domain (and fail).