# IcyCrow Viva Q&A Prep Guide
## Potential Examination Questions & Code-Level Answers

This guide is structured into logical categories that examiners typically focus on when evaluating browser extensions, security systems, state stores, and local AI projects.

---

### CATEGORY 1: MANIFEST V3 & CHROME ARCHITECTURE

#### Q1: Why did you choose Manifest V3 (MV3) instead of Manifest V2? What are the core architectural differences?
*   **Examiner's Intent**: To check if you understand modern browser extension standards and are not presenting outdated MV2 code.
*   **Answer**: 
    "Manifest V3 is the modern security and performance standard mandated by Google for Chrome extensions. The core difference lies in how background execution is handled. MV2 used persistent background pages that ran constantly in memory, causing RAM drain. MV3 replaced this with ephemeral **Service Workers** (our `service-worker.ts`) which run on an event-driven model. The browser automatically terminates the service worker after 5 minutes of inactivity to save resources, waking it up only when an event listener fires (like `chrome.tabs.onUpdated` or `chrome.runtime.onMessage`). Additionally, MV3 introduces stricter Content Security Policies (CSPs), blocking execution of remote code (no remote CDNs allowed; all libraries must be bundled locally)."

#### Q2: How does the side panel communicate with the service worker, and how do you prevent blocking the main thread?
*   **Examiner's Intent**: To verify your understanding of Chrome Extension IPC (Inter-Process Communication).
*   **Answer**:
    "We use **Chrome Runtime Messaging** for asynchronous IPC. When the side panel UI (Presentation Layer) needs to create a space, it sends a message using `chrome.runtime.sendMessage` (wrapped in our helper `sendToSW` in `messaging.ts`). The background service worker (Application Layer) intercepts it via `chrome.runtime.onMessage.addListener`.
    To prevent blocking the main thread:
    1. We use asynchronous routers in our message listener (`chrome.runtime.onMessage.addListener` returns `true` or handles promises asynchronously).
    2. We offload heavy computations, such as deriving cryptographic keys or serializing tab structures, to helper modules (`crypto-manager.ts` and `space-manager.ts`).
    3. We run database storage operations asynchronously using Chrome's promise-based storage APIs."

#### Q3: What is the purpose of `chrome.storage.session`, and how does it differ from `chrome.storage.local`?
*   **Examiner's Intent**: To check your knowledge of MV3 ephemeral memory constraints.
*   **Answer**:
    "`chrome.storage.local` persists data permanently on disk even when the browser is closed (which is where we store our `spaces`, `standaloneTabs`, and `settings`). 
    However, because MV3 service workers restart constantly, in-memory global variables are wiped. To store transient session state that should survive service worker sleep cycles but clear when the browser is closed, we use `chrome.storage.session`. In `IcyCrow`, we store:
    1. `cryptoKeyUnlocked` (whether the decryption key is active).
    2. `manualGeminiTabId` (the active tab ID mapping our Gemini bridge).
    3. `swRestartCount` (debugging metric for service worker lifecycles).
    This ensures that even if the service worker is terminated, the user does not have to re-enter their passphrase every 5 minutes."

---

### CATEGORY 2: MEMORY MANAGEMENT & PERFORMANCE

#### Q4: How does your extension save RAM/CPU? Explain the tab discarding process.
*   **Examiner's Intent**: To evaluate how your project implements its "Memory Optimization" value proposition.
*   **Answer**:
    "When a user launches a Space containing multiple tabs, we open all of them immediately so their tabs are present in the browser UI, but we discard (suspend) all background tabs from RAM using the native `chrome.tabs.discard` API. 
    In `space-manager.ts:openSpace`, we first open the active tab, then open background tabs using `chrome.tabs.create({ url, active: false })`. We wait for a 1.5-second stability delay to let Chrome establish the socket and resolve URL changes, then iterate through the background tab IDs and call `chrome.tabs.discard(id)`. This unloads the DOM and javascript contexts of the background tabs from memory, reducing RAM consumption to nearly zero until the user clicks on them to wake them up."

#### Q5: What is the "Stability Delay" before tab discarding, and what happens if you discard immediately?
*   **Examiner's Intent**: To check if you handled edge cases and race conditions in browser APIs.
*   **Answer**:
    "When `chrome.tabs.create` is invoked, it returns immediately before the tab has actually loaded or committed its destination URL. If we call `chrome.tabs.discard` immediately, Chrome unloads the tab before it has resolved the destination URL. This results in the tab discarding into an empty state (`about:blank`), losing the URL. 
    By implementing a 1.5-second stability delay (`new Promise(resolve => setTimeout(resolve, 1500))`), we allow Chrome to commit the redirect parameters in the main frame, ensuring the browser remembers the URL when the tab is discarded."

#### Q6: How do you prevent event floods when a user reorganizes tabs or opens multiple pages simultaneously?
*   **Examiner's Intent**: To verify your understanding of debounce mechanisms and event filtering.
*   **Answer**:
    "If we synchronized state on every single event, we would crash Chrome's storage limits (MAX_WRITE_OPERATIONS_PER_HOUR) and lag the UI. We solve this in `sync-manager.ts` in two ways:
    1. **Event Filtering**: In `handleTabUpdated`, we ignore tab changes that don't shift the URL or title. If the update is just a loading spinner or scroll shift, we ignore it.
    2. **Debounced Writes**: In `queueUpdate()`, we use a debounce timer of `800ms`. When multiple tab events occur rapidly (e.g., during window restores), the timer is cleared and reset. We write the updated `spaces` map to `chrome.storage.local` only after events have settled for 800ms, minimizing I/O bottlenecks."

---

### CATEGORY 3: SECURITY, VAULT & ENCRYPTION

#### Q7: How does your workspace lock mechanism work? Where is the encryption key stored?
*   **Examiner's Intent**: To check if your encryption is secure and doesn't leak keys.
*   **Answer**:
    "Our encryption uses a strictly local, zero-knowledge architecture implemented in `crypto-manager.ts`. 
    When the user unlocks the vault with their password:
    1. We retrieve a locally generated 16-byte random salt from `chrome.storage.local`.
    2. We derive a 256-bit AES-GCM encryption key from the password and salt using PBKDF2 with 100,000 iterations and SHA-256.
    3. Crucially, the key is imported with `extractable: false`, meaning it is stored in the browser's protected memory space and cannot be read or dumped by scripts.
    4. The key is held strictly in the volatile memory of the service worker class instance. It is never written to disk. When the worker goes to sleep, the key is lost, and the state becomes locked. To survive short worker sleeps without re-entering the password, the unlock flag is written to `chrome.storage.session` which has session-level durability."

#### Q8: How do you prevent Cross-Site Scripting (XSS) when rendering Markdown responses from the AI?
*   **Examiner's Intent**: To verify that you sanitize raw HTML data before inject-rendering.
*   **Answer**:
    "The AI returns text formatted in Markdown, which we compile into HTML to render links and lists in our chat bubble. However, rendering raw HTML directly is vulnerable to XSS injection. 
    To secure this, in `ChatMessage.tsx`, we pass the compiled HTML string through **DOMPurify** (`DOMPurify.sanitize(rawHtml)`) before injecting it via Preact's `dangerouslySetInnerHTML`. DOMPurify parses the HTML and strip-filters any executable blocks (such as `<script>`, `<iframe>`, or handlers like `onload` and `onerror`), rendering only clean layout nodes."

#### Q9: What are Isolated Worlds in content scripts, and why are they important?
*   **Examiner's Intent**: To see if you understand the browser's security boundaries for extension scripts.
*   **Answer**:
    "Chrome content scripts run in an **Isolated World**. This means they share the same physical DOM layout with the host web page (so our script can read text ranges or insert tooltips), but their execution context (variables, functions, objects) is fully separated from the web page's JavaScript context. 
    This is a vital security feature: even if the user visits a malicious website, the scripts on that site cannot read our extension's internal state, steal our derived encryption keys, or manipulate our runtime messaging ports."

#### Q10: How does your content script inject UI elements into pages without messing up the host page's styling?
*   **Examiner's Intent**: To evaluate CSS encapsulation techniques in content scripts.
*   **Answer**:
    "To prevent style bleed (the host website's CSS breaking our tooltip, or our tooltip CSS breaking the host website), we use **Shadow DOM encapsulation** in `ui-root.tsx`.
    We create a host wrapper (`#icycrow-extension-root`) and attach a shadow root in `open` mode. Inside this shadow root, we append our mount point and a stylesheet containing a CSS reset (`all: initial !important`). Since the Shadow DOM establishes a styling boundary, styles declared inside it do not affect the main document, and styles declared on the host page do not pierce the shadow boundary, keeping our tooltip isolated and visually clean."

---

### CATEGORY 4: LOCAL AI & SCAPE ENGINE

#### Q11: Explain your "Nano-First" routing strategy for AI queries.
*   **Examiner's Intent**: To verify how you choose between local model access and web application scrapers.
*   **Answer**:
    "In `service-worker.ts:305` (case `'AI_QUERY'`), we execute a hybrid fallback routing pipeline:
    1. **Nano Engine**: We query `aiManager.checkCapabilities()` to see if the browser has Chrome's built-in Gemini Nano model readily active. If available, we route the prompt directly to `aiManager.queryBuiltIn()` which prompts the local model offline and streams the token chunks back without focusing tabs.
    2. **Gemini Bridge**: If Nano is unavailable, we fall back to our tab bridge scraper. This triggers a synchronization wakeup protocol: it activates the user's open `gemini.google.com` tab, types the prompt into the input text area, clicks send, and scrapes the response container in real-time."

#### Q12: How does the Gemini Tab Bridge type prompts and scrape dynamic responses?
*   **Examiner's Intent**: To evaluate automation scripting, shadow root traversal, and web scrapers.
*   **Answer**:
    "Since Gemini runs inside a separate web tab, our content script handles the interaction via [`gemini-bridge.ts`](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/gemini-bridge.ts):
    1. **Shadow Root Traversal**: Gemini's DOM contains nested Shadow roots. We use `querySelectorAllDeep()` to recursively search through shadow roots for input fields.
    2. **Typing Injection**: We use a multi-layered typing chain. We first try `execCommand('insertText')` on the input element to preserve ProseMirror schemas. If that fails, we dispatch clipboard events, or write `innerText` directly.
    3. **Polling Scraper**: Once submitted, `scrapeResponse()` checks the Gemini response containers. We use a polling routine that checks the state of the 'stop' button. Since the stop button is only present during generation, when the button disappears and text length stabilizes, we confirm the generation is done and return the final text to the side panel."
