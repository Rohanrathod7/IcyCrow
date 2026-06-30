# Technical Report: IcyCrow Chrome Extension Architecture & Implementation
## Comprehensive A-to-Z Guide for Viva Presentation

---

## SECTION 1: SYSTEM ARCHITECTURE & MANIFEST V3 CORE

### 1.1 `manifest.json` Permission Matrix & Justifications

The project is declared as a Manifest V3 Extension. Under the strict rules of MV3, the permissions requested must be minimal, declared in the permission array, and explicitly justified.

| Permission | Technical Need & Justification |
| :--- | :--- |
| **`tabs`** | Enables the extension to query properties of browser tabs (such as `url`, `title`, and `favIconUrl`) in order to capture workspaces and serialize them into storage. |
| **`storage`** | Required to persist the user's workspaces, saved highlights, settings, and workspace security keys locally on the device using `chrome.storage.local`. |
| **`unlimitedStorage`** | Bypasses the default 5MB storage limit of `chrome.storage.local`. This is critical because IcyCrow caches Base64 favicons, highlights database files, and encrypted chat logs entirely offline. |
| **`sidePanel`** | Configures and opens the main user interface inside Chrome's native side panel overlay (`side-panel.html`), ensuring it remains visible while navigating tabs. |
| **`scripting`** | Allows the background script to dynamically execute code or inject stylesheets into host web pages when capturing page highlights or executing scraping routines. |
| **`offscreen`** | Creates a temporary offscreen DOM context (background window) to perform operations that require DOM parsing, text formatting, or large data exports. |
| **`declarativeNetRequest`** | Used to declare a static routing rule resource (`rules.json`) that intercepts raw requests matching `.pdf` URLs and redirects them to the extension's workspace. |
| **`declarativeNetRequestWithHostAccess`** | Extends DNR permissions to modify network requests matching host permissions dynamically without blocking threads or asking for excessive permissions. |
| **`idle`** | Monitors system inactivity states to trigger the cryptographic auto-lock handler (`crypto-autolock`) when the system is inactive for a user-specified duration. |
| **`alarms`** | Sets recurring low-priority background timers (e.g., `keepalive` every 24 seconds to prevent background service worker termination, and `crypto-autolock` every 1 minute). |

---

### 1.2 Architecture Flow: Message Passing & Data Lifecycles

The project consists of three separate execution environments (Presentation, Application, and Data layers) linked via dynamic IPC (Inter-Process Communication) and shared storage.

```mermaid
graph TD
    subgraph Presentation Layer [Presentation Layer (Preact UI)]
        A[Side Panel: Chat/Settings Views] <-->|Preact Signals| B[store.ts]
    end
    
    subgraph Application Layer [Application Layer (Service Worker)]
        C[background/service-worker.ts]
        D[managers/space-manager.ts]
        E[managers/sync-manager.ts]
        F[crypto-manager.ts]
        G[managers/ai-manager.ts]
    end
    
    subgraph Content Script Layer [Content Script Layer]
        H[content/content-script.ts]
        I[content/gemini-bridge.ts]
    end
    
    subgraph Data Layer [Data Layer (Browser Storage)]
        J[(chrome.storage.local)]
        K[(chrome.storage.session)]
    end

    %% Communication Flows
    B <-->|chrome.runtime.sendMessage| C
    H <-->|chrome.runtime.sendMessage| C
    I <-->|chrome.runtime.sendMessage| C
    C <-->|Method Calls| D
    C <-->|Method Calls| E
    C <-->|Method Calls| F
    C <-->|Method Calls| G
    
    %% Storage access
    B <-->|Read/Write| J
    B <-->|Read/Write| K
    C <-->|Read/Write| J
    C <-->|Read/Write| K
    H <-->|Read| J
```

#### How Data Moves Across the Boundary on Initialization:
1. **Service Worker Boot**: The service worker boots up and fires `boot()`. It updates the transient restart count inside `chrome.storage.session` and registers global listeners:
   ```typescript
   const result = await chrome.storage.session.get('sessionState');
   // Increment SW Restart Count and persist
   await chrome.storage.session.set({ sessionState: { ...currentState, swRestartCount } });
   ```
2. **UI Root Mount**: When the side panel mounts, `hydrateStore()` is called inside `store.ts`. It utilizes `Promise.all` to query `chrome.storage.local` and `chrome.storage.session` in parallel, hydrating Preact signals (`spaces`, `settings`, `isLocked`, `currentWindowId`).
3. **Reactive Synchronization**: Any writes made by components (e.g., toggling a theme) are written directly to `chrome.storage.local`. The global listener `chrome.storage.onChanged.addListener` in `store.ts` intercepts this update and triggers reactive re-renders across the Preact UI tree without requiring manual event dispatchers.

---

## SECTION 2: FILE-BY-FILE CODE MAP & RESPONSIBILITIES

### 2.1 Presentation & Front-end Components

#### 1. [`src/side-panel/App.tsx`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/App.tsx)
- **Primary Responsibility**: Core application shell of the side panel that routes views (`Home`, `Search`, `Chat`, `Settings`) and handles the global theme switcher hook.
- **Key Hooks & Functions**:
  - `applyTheme()`: Evaluates the reactive `settings.value.theme`. If set to `'system'`, evaluates media query `(prefers-color-scheme: dark)` and applies the appropriate `.theme-light` or `.theme-dark` class to `document.documentElement`.

#### 2. [`src/side-panel/store.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/store.ts)
- **Primary Responsibility**: Holds the global state as reactive Preact signals and provides transactional utilities for drag-and-drop tab manipulation.
- **Key Hooks & Functions**:
  - `hydrateStore()`: Asynchronously loads workspaces, security states, and settings from storage.
  - `calculateReorder()` / `calculateMove()`: Pure state manipulation functions that calculate new tab layouts during dragging using `@dnd-kit/sortable`.
  - `chrome.storage.onChanged.addListener`: Automatically fires whenever storage changes, maintaining state synchronization with background worker updates.

#### 3. [`src/side-panel/components/SettingsView.tsx`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/components/SettingsView.tsx)
- **Primary Responsibility**: Controls extension settings including theme toggles, engine provider selectors, local backup import/export, and workspace encryption locks.
- **Key Hooks & Functions**:
  - `updateTheme()` / `updateEngine()`: Modifies state signals and writes them to local storage.
  - `handleLock()` / `handleUnlock()`: Sends runtime messages to the background script to lock/unlock the cryptographic vault.
  - `handleExport()` / `handleImport()`: Triggers encrypted database export/import via runtime IPC messaging.

---

### 2.2 Background Services (Service Worker)

#### 4. [`src/background/service-worker.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/service-worker.ts)
- **Primary Responsibility**: Central request router and messaging hub. Keeps the extension running in the background and intercepts extension hotkeys.
- **Key Hooks & Functions**:
  - `chrome.runtime.onMessage.addListener`: Inspects incoming payload schemas via Zod (`InboundMessageSchema`) and routes requests to appropriate managers.
  - `boot()`: Runs on start, initializing alarms, keeps the service worker alive, and maintains session states.

#### 5. [`src/background/managers/space-manager.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/managers/space-manager.ts)
- **Primary Responsibility**: Implements the creation, opening, and deletion logic for spatial workspaces. Captures and serializes live tab states.
- **Key Hooks & Functions**:
  - `serializeTab()`: Converts a raw Chrome tab object to a simplified `SpaceTab` object. Downloads external favicons and serializes them into Base64 strings.
  - `openSpace()`: Opens a space's tab list inside a new window, focusing the first tab while suspending the rest in the background to prevent high memory usage.

#### 6. [`src/background/managers/sync-manager.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/managers/sync-manager.ts)
- **Primary Responsibility**: Reconciles changes in active browser windows with the database in real-time. Automatically updates tab URLs, titles, and layouts.
- **Key Hooks & Functions**:
  - `reconcile()`: Fired by window/tab update listeners. Fetches live tabs inside a window and compares them against the database. Automatically adopts new tabs or matches existing ones by matching URLs or tab IDs.
  - `queueUpdate()`: Debounces database writes by `800ms` to prevent storage write threshold limit errors.

#### 7. [`src/background/crypto-manager.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/crypto-manager.ts)
- **Primary Responsibility**: Cryptographic key VAULT. Derives keys from passphrases and performs AES-GCM encryption/decryption of local data.
- **Key Hooks & Functions**:
  - `unlock()`: Imports raw passphrases, runs 100,000 PBKDF2 iterations with a local salt, and derives a 256-bit AES-GCM key with `extractable: false`.
  - `encrypt()` / `decrypt()`: Performs GCM encryption/decryption using a randomized 12-byte initialization vector (IV).

#### 8. [`src/background/managers/ai-manager.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/managers/ai-manager.ts)
- **Primary Responsibility**: Direct bridge to Chrome's built-in model provider. Manages local AI model checking and query execution.
- **Key Hooks & Functions**:
  - `checkCapabilities()`: Uses `ai.assistant.capabilities()` to verify if Gemini Nano is installed on the user's host browser.
  - `queryBuiltIn()`: Instantiates local assistant sessions and prompts them via `session.promptStreaming()`.

---

### 2.3 Content Script Layer

#### 9. [`src/content/content-script.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/content-script.ts)
- **Primary Responsibility**: Injected script that listens for page text selection, draws highlight markers, and restores highlights from the local database.
- **Key Hooks & Functions**:
  - `performHighlight()`: Resolves selected ranges, queries anchoring metadata (text snippets, offsets), sends synchronization requests to the worker, and wraps text ranges in DOM `<span>` highlights.
  - `restoreHighlightsFromStorage()`: Queries saved highlights for the current canonical URL on load, and restores them on the page.

#### 10. [`src/content/gemini-bridge.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/gemini-bridge.ts)
- **Primary Responsibility**: Automation bridge inside the Gemini web tab. Focuses the input element, writes prompts, clicks the send button, and scrapes streaming content.
- **Key Hooks & Functions**:
  - `querySelectorAllDeep()`: Traverses the page recursively, including any nested open Shadow Roots, to find elements.
  - `injectPrompt()`: Simulates clipboard events and fallback typing to write prompt text into ProseMirror text fields and triggers submissions.
  - `scrapeResponse()`: Polls the active model container and reads generated text streams in real-time.

---

## SECTION 3: EXHAUSTIVE FEATURE DEEP-DIVES

### 3.1 Spatial Workspace Creation ("New Space" Button)

*   **(A) Practical Explanation**: When a user clicks the "New Space" button or captures their session, IcyCrow bundles all active tabs in the current browser window into a named, colored project space. Instead of a messy list of open tabs, users categorize their context. When they click a Space, it launches a dedicated clean window containing all those tabs, allowing them to resume their project instantly.
*   **(B) Technical Implementation**:
    1. **Tab Query**: Side panel triggers `saveCurrentSessionAsSpace()`. It calls `chrome.tabs.query({ currentWindow: true })` to capture active browser tabs.
    2. **Scrubbing & AI Categorization**: Captures titles and runs `inferSpaceName(titles)` using the local AI to automatically categorize the workspace name.
    3. **Serialization**: Passes the tabs to the background service worker `SPACE_CREATE` router. `SpaceManager.serializeTab()` is executed for each tab in parallel via `Promise.all`:
       ```typescript
       // space-manager.ts: serializeTab
       const sTab: SpaceTab = {
         id: crypto.randomUUID(),
         url: tab.url,
         title: tab.title,
         favicon: faviconBase64 // Captured by fetching tab.favIconUrl and converting to Base64
       }
       ```
    4. **Atomic Storage Write**: The newly created `Space` object is saved to the `spaces` dictionary in `chrome.storage.local`.

---

### 3.2 Memory Optimization Engine ("Suspend Tabs" / `chrome.tabs.discard`)

*   **(A) Practical Explanation**: If you open a workspace containing 15 tabs, browser performance drops as each tab consumes RAM in the background. IcyCrow solves this. It opens all 15 tabs in a new window so the list is visible, but immediately suspends (discards) the background 14 tabs from memory. The tabs remain in the tab bar, but use zero RAM until the user clicks on them to wake them up.
*   **(B) Technical Implementation**:
    1. **Open Space**: Triggered by opening a space. `SpaceManager` iterates through `space.tabs`.
    2. **Batch Tab Creation**: The first tab is opened in active state: `chrome.tabs.create({ url: firstTab.url, active: true })`.
    3. **Background Creation**: Subsequent tabs are opened in the background: `chrome.tabs.create({ url: otherTab.url, active: false })`. Their tab IDs are tracked inside `backgroundTabIds`.
    4. **Stability Delay**: A 1.5-second stability delay `new Promise(resolve => setTimeout(resolve, 1500))` is executed. This gives Chrome time to resolve DNS, establish sockets, and commit the destination URL to the frame.
    5. **Atomic Discard**:
       ```typescript
       // space-manager.ts: openSpace
       for (const id of backgroundTabIds) {
         const tab = await chrome.tabs.get(id);
         if (tab && tab.url && tab.url !== 'about:blank') {
           await chrome.tabs.discard(id); // Native browser memory suspension API
         }
       }
       ```
       Chrome unloads the DOM and tab resources, keeping only the tab's title and favicon in the UI header.

---

### 3.3 Background Sync & Active Tracking

*   **(A) Practical Explanation**: As you browse, rearrange tabs, add new pages, or close tabs in an active project window, IcyCrow silently and automatically saves those changes. You do not need to click a manual save button. If you close a window or open a new one, the extension updates the database to prevent desynchronization.
*   **(B) Technical Implementation**:
    1. **Tab & Window Listeners**: `SyncManager` initializes listeners on boot:
       - `chrome.tabs.onCreated` / `chrome.tabs.onRemoved` / `chrome.tabs.onMoved` / `chrome.tabs.onUpdated`.
    2. **Reconciliation Loop**: When a tab event fires in a window, `reconcile(windowId)` maps the window ID to its active `spaceId`.
    3. **Diffing and Matching**:
       - It fetches live window tabs using `chrome.tabs.query({ windowId })`.
       - It checks if any live tab ID (`tab.id`) matches a tab's `activeTabId` in the database.
       - If no exact match is found, it performs a fuzzy match on the URL. If matched, it re-bridges the live tab ID to the existing database UUID (re-bridging after restart).
       - If the URL is entirely new, it serializes the tab and appends it to the space's tab list.
    4. **Debounced Commit**: Writes to the local database are debounced by `800ms` to prevent storage access write limits from blocking the thread:
       ```typescript
       // sync-manager.ts
       private queueUpdate(spaces: SpacesStore) {
         if (this.debounceTimer) clearTimeout(this.debounceTimer);
         this.debounceTimer = setTimeout(async () => {
           await setSpaces(spaces);
         }, 800);
       }
       ```

---

### 3.4 AI Contextual Chat Layer & Encryption Management

*   **(A) Practical Explanation**: Users chat with a localized chatbot that has direct access to the web pages they are highlighting. To protect API keys or workspace data, IcyCrow secures everything locally on the browser. Users enter a passphrase to encrypt/decrypt settings and data, which is completely isolated from other pages or external servers.
*   **(B) Technical Implementation**:
    1. **PBKDF2 Key Derivation**: When the user unlocks the vault, the extension derives a 256-bit AES-GCM key from their passphrase:
       ```typescript
       // crypto-manager.ts
       const salt = await this.getOrCreateSalt();
       const keyMaterial = await crypto.subtle.importKey(
         'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
       );
       this.key = await crypto.subtle.deriveKey(
         { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
         keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
       );
       ```
    2. **Encrypted Storage**: The key is marked as `extractable: false`, meaning it cannot be read by any script in memory. Highlights or keys are encrypted on the fly via `crypto.subtle.encrypt` using the key and a random 12-byte initialization vector (IV) before writing to `chrome.storage.local`.
    3. **Local AI Stream**:
       - If Chrome AI is available, `ai-manager.ts` invokes local Gemini Nano using the browser's built-in `window.ai` API.
       - It checks availability via `ai.assistant.capabilities()`.
       - Prompts the model with streaming chunks:
         ```typescript
         const session = await ai.assistant.create();
         const stream = session.promptStreaming(prompt);
         for await (const chunk of stream) {
           onChunk(chunk); // Streams token chunks back to Preact UI
         }
         ```

---

## SECTION 4: SECURITY PROTOCOLS & PIPELINE

### 4.1 Content Security Policy (CSP)

Manifest V3 implements a strict Content Security Policy by default:
- **No Remote Code execution**: The manifest does not declare any external host permissions or CDNs for script execution.
- **`script-src 'self'`**: Only script files bundled within the extension's directory can be parsed and executed by the browser engine.
- **Prevention of XSS**: Evaluates like `eval()`, `new Function()`, or inline scripts (`<script>...</script>`) are blocked by Chrome, neutralizing common Cross-Site Scripting (XSS) attack vectors.

### 4.2 Sanitization Pipeline (Marked + DOMPurify)

When displaying AI responses in the chat bubble, formatting is rendered dynamically from Markdown text using the Preact component [`ChatMessage.tsx`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/components/ChatMessage.tsx).

```
[Markdown AI Output] ---> [Marked Parser] ---> [Raw HTML] ---> [DOMPurify Sanitizer] ---> [Preact rendering]
```

1. **Parser**: `marked.parse(message.content)` compiles raw Markdown syntax into an HTML string.
2. **Sanitize**: `DOMPurify.sanitize(rawHtml)` inspects the HTML string and strip-filters any malicious elements (like `<script>`, `<iframe src="...">`, or handlers like `onerror="..."`, `onload="..."`), returning a safe HTML string.
3. **Render**: The sanitized HTML string is rendered using Preact's `dangerouslySetInnerHTML={{ __html: htmlContent }}`.

### 4.3 Isolated Worlds

Content scripts (`content-script.ts`) operate in an **Isolated World** environment:
- **Shared DOM**: The content script shares the same document object model (DOM) with the host page (e.g., `gemini.google.com`), allowing it to read elements, write text, and register mouse events.
- **Isolated JS Execution Environment**: The JavaScript context of the content script is separated from the page's JavaScript context. The content script cannot access variables, objects, or functions defined by scripts on the host page, and scripts on the host page cannot access variables or the extension's runtime APIs (like `chrome.runtime`).
- **Data Protection**: This blocks malicious websites from intercepting `chrome.runtime` messaging channels or executing instructions inside the extension's background context.

---

## SECTION 5: PERFORMANCE OPTIMIZATION (CRITICAL FOR VIVA)

### 5.1 Tab Update Event Filtering

To prevent continuous writing to storage, `SyncManager` filters incoming events:
```typescript
async handleTabUpdated(tabId: number, changeInfo: any, tab: chrome.tabs.Tab) {
  if (tab.incognito) return; // Skip incognito
  const spaceId = await this.getSpaceForWindow(tab.windowId);
  if (!spaceId) return; // Skip windows not bound to workspaces
  
  if (changeInfo.url) {
      await this.reconcile(tab.windowId); // Only run sync logic on URL shifts
      return;
  }
}
```
If a tab updates its layout, changes scroll offset, or updates loading state, the event is discarded. The synchronization routine only executes when a tab's URL changes or a tab is created/deleted/moved, preventing UI stuttering and storage bottlenecks.

### 5.2 Hybrid Typography System

- **Workspace Viewer**: Uses `'Inter', system-ui, sans-serif`. Proportional sans-serif typography is highly readable in compact spaces, enabling dense grids of workspaces, action menus, and layouts to fit on limited side panel screen space.
- **Side Panel Interface**: Uses `monospace` (`ui-monospace, SFMono-Regular, etc.`). Monospace is used for technical chat elements, settings inputs, and code outputs.
- **Aesthetic Value**: This hybrid system ensures that user titles look clean and modern, while configuration options and code blocks remain structured and aligned.

### 5.3 Service Worker Ephemeral Lifecycles & State Hydration

Under Manifest V3, the service worker is transient. The browser shuts it down after 5 minutes of inactivity to conserve RAM and CPU.

1. **Transient Session State (`chrome.storage.session`)**:
   Since the service worker restarts frequently, global variables declared in memory are lost. To maintain lock states and health metrics, the application writes transient state to `chrome.storage.session` (e.g., `cryptoKeyUnlocked`).
2. **Session Lifetime**:
   Unlike memory variables, `chrome.storage.session` data persists as long as the user keeps the browser application open.
3. **Waking Protocol**:
   Alarms (alarms keepalive) trigger periodic calls to wake the service worker, while the side panel UI automatically hydrates variables from storage when initialized.
