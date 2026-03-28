# IcyCrow — Low-Level Technical Design (LLD)

**Version:** 1.0
**Date:** 2026-03-16
**Author:** AI-Generated (Principal Frontend Architect & MV3 Expert)
**Status:** Draft v1.0 — Strict Technical Contract for AI Coding Agents
**Parent Documents:** [PRD v3.1](./PRD.md) · [HLA v2.1](./HLA.md)

---

## Table of Contents

1. [Local Database Architecture & Data Models](#1-local-database-architecture--data-models)
2. [Internal API Contracts (Message Passing)](#2-internal-api-contracts-message-passing)
3. [Core Logic Design: The DOM Anchoring Algorithm](#3-core-logic-design-the-dom-anchoring-algorithm)
4. [State Management & MV3 Resilience](#4-state-management--mv3-resilience)

---

## 1. Local Database Architecture & Data Models

> [!IMPORTANT]
> There is **NO backend**. All persistent data lives in two browser-native stores:
> - **`chrome.storage.local`** — Settings, Spaces, Highlights, Chat Histories, Queue State (key-value, fast, survives extension updates).
> - **IndexedDB (`IcyCrowDB`)** — Articles, Embeddings, Annotations, ONNX model cache, Backup manifest (structured, supports blobs and cursors).
> - **`chrome.storage.session`** — Ephemeral per-session state (Gemini bridge health, CryptoKey lock status, derived key reference). Cleared on browser restart. **Never persisted.**

### 1.1 Shared Primitive Types

```typescript
/** Branded UUID string for compile-time type safety */
type UUID = string & { readonly __brand: 'UUID' };

/** ISO-8601 timestamp string */
type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

/** SHA-256 hex digest string */
type SHA256Hash = string & { readonly __brand: 'SHA256Hash' };

/** Encryption status for conditional decryption */
type EncryptionStatus = { encrypted: false } | {
  encrypted: true;
  iv: string;      // base64-encoded AES-GCM IV
  salt: string;    // base64-encoded PBKDF2 salt
};
```

---

### 1.2 IndexedDB Object Stores — `IcyCrowDB`

> [!NOTE]
> Access IndexedDB via the **`idb`** library (lightweight Promise wrapper). The schema version starts at `1`. All migrations live in `lib/idb-migrations.ts` and execute sequentially in `onupgradeneeded`.

#### Store: `articles`

```typescript
interface IDBArticle {
  /** Primary key — UUIDv4 */
  id: UUID;
  /** Canonical page URL */
  url: string;
  /** Page title at save time */
  title: string;
  /** Full extracted text content (plain text, DOMPurify-sanitised) */
  fullText: string;
  /** AI-generated summary (Gemini or Ollama) — may be null if generation pending */
  aiSummary: string | null;
  /** User-authored Markdown notes */
  userNotes: string;
  /** Timestamp of save */
  savedAt: ISOTimestamp;
  /** Optional Space association */
  spaceId: UUID | null;
  /** Encryption metadata */
  encryption: EncryptionStatus;
}
// Key path: 'id'
// Indexes: 'url', 'savedAt', 'spaceId'
```

#### Store: `embeddings`

```typescript
interface IDBEmbedding {
  /** Foreign key → articles.id */
  articleId: UUID;
  /** 384-dimensional vector from all-MiniLM-L6-v2 */
  vector: Float32Array;
  /** Integer model version — used for stale-detection on model update */
  modelVersion: number;
  /** Timestamp of embedding generation */
  createdAt: ISOTimestamp;
}
// Key path: 'articleId'
// Indexes: 'modelVersion'
```

#### Store: `annotations`

```typescript
/** All possible annotation visual types */
type AnnotationType = 'drawing' | 'comment' | 'shape';

interface IDBAnnotation {
  /** Primary key — UUIDv4 */
  id: UUID;
  /** Page URL this annotation belongs to */
  url: string;
  /** Type discriminator */
  type: AnnotationType;
  /** Type-specific payload */
  data: DrawingData | CommentData | ShapeData;
  /** Timestamp of creation */
  createdAt: ISOTimestamp;
}

interface DrawingData {
  kind: 'drawing';
  /** Serialised SVG path data */
  paths: string[];
  /** Stroke colour (hex) */
  strokeColor: string;
  /** Stroke width in px */
  strokeWidth: number;
  /** Viewport-relative bounding box */
  bounds: { x: number; y: number; width: number; height: number };
}

interface CommentData {
  kind: 'comment';
  /** Comment text (Markdown) */
  body: string;
  /** Where on the page the comment is anchored */
  anchor: TextQuoteAnchor;
}

interface ShapeData {
  kind: 'shape';
  shapeType: 'rect' | 'circle' | 'arrow';
  bounds: { x: number; y: number; width: number; height: number };
  strokeColor: string;
  fillColor: string | null;
}
// Key path: 'id'
// Indexes: 'url'
```

#### Store: `taskQueue`

```typescript
type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';

interface IDBTask {
  /** Primary key — UUIDv4 */
  id: UUID;
  /** User's prompt text */
  prompt: string;
  /** Tab IDs selected as context */
  contextTabs: Array<{
    tabId: number;
    url: string;
    title: string;
    /** Scraped text content (populated by content-scraper) */
    content?: string;
  }>;
  /** Current task lifecycle status */
  status: TaskStatus;
  /** AI response text (populated on completion) */
  result: string | null;
  /** Error message (populated on failure) */
  error: string | null;
  /** Number of retry attempts so far */
  retryCount: number;
  /** Timestamp of task creation */
  createdAt: ISOTimestamp;
  /** Timestamp of last status change */
  updatedAt: ISOTimestamp;
}
// Key path: 'id'
// Indexes: 'status', 'createdAt'
```

#### Store: `onnxModelCache`

```typescript
interface IDBOnnxModel {
  /** Model identifier, e.g. 'all-MiniLM-L6-v2' */
  modelName: string;
  /** Raw ONNX model binary */
  modelData: ArrayBuffer;
  /** Integer version tag — must match settings.archive.embeddingModelVersion */
  version: number;
  /** Timestamp of cache write */
  cachedAt: ISOTimestamp;
}
// Key path: 'modelName'
```

#### Store: `backupManifest`

```typescript
interface IDBBackupManifest {
  /** Primary key — UUIDv4 */
  id: UUID;
  /** ISO-8601 timestamp of backup */
  timestamp: ISOTimestamp;
  /** File size in bytes */
  fileSize: number;
  /** HMAC-SHA256 checksum of the export file */
  checksum: string;
  /** Human-readable location, e.g. 'Downloads/icycrow-backup-2026-03-16.icycrow' */
  location: string;
}
// Key path: 'id'
// Indexes: 'timestamp'
```

#### IDB Upgrade Registry — `idb-migrations.ts`

```typescript
import { type IDBPDatabase } from 'idb';

type MigrationFn = (db: IDBPDatabase, tx: IDBPTransaction) => void;

/** Registry of all schema migrations. NEVER delete old entries. */
const MIGRATIONS: Record<number, MigrationFn> = {
  1: (db) => {
    const articles = db.createObjectStore('articles', { keyPath: 'id' });
    articles.createIndex('url', 'url');
    articles.createIndex('savedAt', 'savedAt');
    articles.createIndex('spaceId', 'spaceId');

    const embeddings = db.createObjectStore('embeddings', { keyPath: 'articleId' });
    embeddings.createIndex('modelVersion', 'modelVersion');

    const annotations = db.createObjectStore('annotations', { keyPath: 'id' });
    annotations.createIndex('url', 'url');

    const taskQueue = db.createObjectStore('taskQueue', { keyPath: 'id' });
    taskQueue.createIndex('status', 'status');
    taskQueue.createIndex('createdAt', 'createdAt');

    db.createObjectStore('onnxModelCache', { keyPath: 'modelName' });

    const backups = db.createObjectStore('backupManifest', { keyPath: 'id' });
    backups.createIndex('timestamp', 'timestamp');
  },
  // Future: 2: (db, tx) => { ... }
};

export const DB_NAME = 'IcyCrowDB';
export const DB_VERSION = 1; // bump on every schema change
```

---

### 1.3 `chrome.storage.local` Structures

#### Settings

```typescript
interface IcyCrowSettings {
  hibernation: {
    enabled: boolean;
    inactiveThresholdMinutes: number; // default: 15
  };
  antiDetection: {
    typingDelayMin: number;  // ms, default: 50
    typingDelayMax: number;  // ms, default: 200
    jitterEnabled: boolean;
  };
  archive: {
    embeddingModel: string;           // default: 'all-MiniLM-L6-v2'
    embeddingModelVersion: number;    // default: 1 — bumped on model upgrade
    ollamaEndpoint: string;           // default: 'http://localhost:11434'
  };
  gemini: {
    /** Glob pattern for tab detection — configurable for URL changes */
    urlPattern: string;  // default: '*://gemini.google.com/*'
    /** User-set custom URL (overrides pattern if set) */
    customUrl: string | null;
  };
  encryption: {
    enabled: boolean;                 // default: false (opt-in)
    autoLockMinutes: number;          // default: 30
  };
  backup: {
    enabled: boolean;                 // default: true
    intervalDays: number;             // default: 7
    maxBackups: number;               // default: 5
    lastSuccessAt: ISOTimestamp | null;
  };
  theme: 'light' | 'dark' | 'system'; // default: 'system'
}
// Storage key: 'settings'
```

#### Spaces

```typescript
interface SpaceTab {
  id: UUID;
  url: string;
  title: string;
  /** Inline data URI (base64 favicon) — avoids network requests */
  favicon: string | null;
  scrollPosition: number;
  /** Populated when tabs are open in browser — null when space is saved/closed */
  chromeTabId: number | null;
}

interface Space {
  id: UUID;
  name: string;
  color: string;        // hex colour for visual grouping
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  tabs: SpaceTab[];
}

type SpacesStore = Record<UUID, Space>;
// Storage key: 'spaces'
```

#### Highlights (Per-URL Key)

```typescript
/**
 * W3C Web Annotation TextQuoteSelector-based anchor.
 * Primary matching strategy — survives DOM restructuring.
 */
interface TextQuoteAnchor {
  /** Selector type discriminator */
  type: 'TextQuoteSelector';
  /** The exact selected text, verbatim */
  exact: string;
  /** 50 characters before the selection (for disambiguation) */
  prefix: string;
  /** 50 characters after the selection (for disambiguation) */
  suffix: string;
  /** Best-effort XPath to the anchor container node */
  xpathFallback: string;
  /** Best-effort CSS selector for the container node */
  cssFallback: string;
  /** Character offset within the container's text content where selection starts */
  startOffset: number;
  /** Character offset within the container's text content where selection ends */
  endOffset: number;
}

interface PageMeta {
  /** Document title at highlight time */
  title: string;
  /**
   * SHA-256 of the first 500 chars of document.body.innerText.
   * Used to detect page content changes (auth-gated redirects,
   * CMS updates). If fingerprint differs on restore, highlights
   * become "ghost" entries.
   */
  domFingerprint: SHA256Hash;
}

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

interface Highlight {
  id: UUID;
  /** Original page URL (unhashed, for display) */
  url: string;
  /** The selected text content */
  text: string;
  /** Visual colour of the highlight */
  color: HighlightColor;
  /** Optional user note attached to this highlight */
  note: string | null;
  /** W3C TextQuoteSelector-based anchor (primary matching strategy) */
  anchor: TextQuoteAnchor;
  /** Page metadata for change detection */
  pageMeta: PageMeta;
  createdAt: ISOTimestamp;
  /** Optional Space association */
  spaceId: UUID | null;
}

type HighlightsStore = Highlight[];
// Storage key: `highlights:${SHA256(canonicalUrl)}`
// One key per unique URL — hashed to avoid key collisions from colons in URLs
```

#### Chat Histories (Per-Space Key)

```typescript
type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: UUID;
  role: ChatRole;
  /** Markdown content */
  content: string;
  timestamp: ISOTimestamp;
  /** Which tabs were used as context for this message */
  contextTabIds: UUID[];
  /** Task ID if this message was generated from a queued task */
  taskId: UUID | null;
}

type ChatHistoryStore = ChatMessage[];
// Storage key: `chatHistories:${spaceId}`
// One key per Space — prevents loading all chats on panel open
```

#### Queue State (Crash Recovery)

```typescript
interface QueueState {
  /** Currently active task ID (or null if idle) */
  activeTaskId: UUID | null;
  /** Ordered list of pending task IDs */
  pendingTaskIds: UUID[];
  /** Timestamp of last queue activity — used for idle detection */
  lastActivityAt: ISOTimestamp;
  /** Consecutive failure count — triggers circuit breaker at 3 */
  consecutiveFailures: number;
  /** If true, queue is paused (circuit breaker tripped) */
  circuitBreakerOpen: boolean;
}
// Storage key: 'queueState'
```

---

### 1.4 `chrome.storage.session` Structures (Ephemeral)

> [!NOTE]
> `chrome.storage.session` is cleared on every browser restart. It holds runtime state that must not persist but needs to survive Service Worker restarts within a session.

```typescript
interface SessionState {
  /** Gemini tab ID — null if not detected */
  geminiTabId: number | null;
  /** Whether the Gemini bridge is responsive */
  geminiBridgeHealthy: boolean;
  /** Last selector health-check timestamp */
  lastSelectorCheckAt: ISOTimestamp | null;
  /** Whether the CryptoKey is currently in memory (not locked) */
  cryptoKeyUnlocked: boolean;
  /** Timestamp when the CryptoKey was last used — for auto-lock timer */
  cryptoKeyLastUsedAt: ISOTimestamp | null;
  /** Service Worker boot timestamp — for uptime tracking */
  swBootedAt: ISOTimestamp;
  /** Count of SW restarts this session — for diagnostics */
  swRestartCount: number;
}
// Storage key: 'sessionState'
```

---

## 2. Internal API Contracts (Message Passing)

> [!IMPORTANT]
> There are **NO REST APIs**. All communication between Content Scripts ↔ Service Worker ↔ Side Panel flows through `chrome.runtime.sendMessage()` and `chrome.runtime.onMessage`. Every message is validated by Zod in the Service Worker before processing.

### 2.1 Base Message Protocol

```typescript
/** Discriminated union base for all messages */
interface BaseMessage<T extends string, P = undefined> {
  type: T;
  payload: P;
  /** Sender context (auto-populated by the message router) */
  _meta?: {
    senderId: string;
    timestamp: ISOTimestamp;
  };
}

/** Standard success response */
interface SuccessResponse<T = undefined> {
  ok: true;
  data: T;
}

/** Standard error response */
interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T = undefined> = SuccessResponse<T> | ErrorResponse;
```

---

### 2.2 Highlight Actions

#### `HIGHLIGHT_CREATE`

```typescript
// ── Request ──
type HighlightCreateMsg = BaseMessage<'HIGHLIGHT_CREATE', {
  url: string;
  urlHash: SHA256Hash;
  text: string;
  color: HighlightColor;
  anchor: TextQuoteAnchor;
  pageMeta: PageMeta;
  spaceId: UUID | null;
}>;

// ── Response ──
type HighlightCreateRes = ApiResponse<{
  id: UUID;
  createdAt: ISOTimestamp;
}>;

// Error codes: 'VALIDATION_ERROR', 'STORAGE_WRITE_FAILED', 'ENCRYPTION_LOCKED'
```

#### `HIGHLIGHT_DELETE`

```typescript
type HighlightDeleteMsg = BaseMessage<'HIGHLIGHT_DELETE', {
  urlHash: SHA256Hash;
  highlightId: UUID;
}>;

type HighlightDeleteRes = ApiResponse<{ deleted: boolean }>;
```

#### `HIGHLIGHTS_FETCH`

```typescript
type HighlightsFetchMsg = BaseMessage<'HIGHLIGHTS_FETCH', {
  urlHash: SHA256Hash;
  currentDomFingerprint: SHA256Hash;
}>;

type HighlightsFetchRes = ApiResponse<{
  highlights: Highlight[];
  /** True if the stored domFingerprint differs from currentDomFingerprint */
  pageChanged: boolean;
}>;

// Error codes: 'ENCRYPTION_LOCKED', 'KEY_NOT_FOUND'
```

#### `HIGHLIGHT_UPDATE`

```typescript
type HighlightUpdateMsg = BaseMessage<'HIGHLIGHT_UPDATE', {
  urlHash: SHA256Hash;
  highlightId: UUID;
  updates: Partial<Pick<Highlight, 'color' | 'note'>>;
}>;

type HighlightUpdateRes = ApiResponse<{ updated: boolean }>;
```

---

### 2.3 AI / Gemini Actions

#### `AI_QUERY`

```typescript
type AiQueryMsg = BaseMessage<'AI_QUERY', {
  prompt: string;
  /** Tab descriptors for context injection */
  contextTabs: Array<{
    tabId: number;
    url: string;
    title: string;
  }>;
  spaceId: UUID;
}>;

type AiQueryRes = ApiResponse<{
  taskId: UUID;
  position: number;  // position in FIFO queue (0 = processing now)
}>;

// Error codes: 'QUEUE_FULL', 'GEMINI_TAB_NOT_FOUND', 'CIRCUIT_BREAKER_OPEN'
```

#### `AI_QUERY_STATUS`

```typescript
type AiQueryStatusMsg = BaseMessage<'AI_QUERY_STATUS', {
  taskId: UUID;
}>;

type AiQueryStatusRes = ApiResponse<{
  status: TaskStatus;
  position: number | null;  // null if not pending
  result: string | null;    // populated if completed
  error: string | null;     // populated if failed
}>;
```

#### `AI_RESPONSE_STREAM`

```typescript
/** Pushed from SW → Side Panel via chrome.runtime.sendMessage (not request/response) */
type AiResponseStreamMsg = BaseMessage<'AI_RESPONSE_STREAM', {
  taskId: UUID;
  /** Incremental chunk of the response being scraped */
  chunk: string;
  /** True when the full response has been scraped */
  done: boolean;
}>;
```

---

### 2.4 Space Actions

#### `SPACE_CREATE`

```typescript
type SpaceCreateMsg = BaseMessage<'SPACE_CREATE', {
  name: string;
  color: string;
  /** If true, capture all currently open tabs into the Space */
  captureCurrentTabs: boolean;
}>;

type SpaceCreateRes = ApiResponse<{ space: Space }>;
```

#### `SPACE_RESTORE`

```typescript
type SpaceRestoreMsg = BaseMessage<'SPACE_RESTORE', {
  spaceId: UUID;
}>;

type SpaceRestoreRes = ApiResponse<{
  tabsOpened: number;
}>;
```

#### `SPACE_DELETE` / `SPACE_UPDATE`

```typescript
type SpaceDeleteMsg = BaseMessage<'SPACE_DELETE', { spaceId: UUID }>;
type SpaceDeleteRes = ApiResponse<{ deleted: boolean }>;

type SpaceUpdateMsg = BaseMessage<'SPACE_UPDATE', {
  spaceId: UUID;
  updates: Partial<Pick<Space, 'name' | 'color'>>;
}>;
type SpaceUpdateRes = ApiResponse<{ updated: boolean }>;
```

---

### 2.5 Archive & Search Actions

#### `ARTICLE_SAVE`

```typescript
type ArticleSaveMsg = BaseMessage<'ARTICLE_SAVE', {
  tabId: number;
  url: string;
  title: string;
  spaceId: UUID | null;
}>;

type ArticleSaveRes = ApiResponse<{
  articleId: UUID;
  /** Whether embedding generation has been kicked off */
  embeddingQueued: boolean;
}>;
```

#### `SEMANTIC_SEARCH`

```typescript
type SemanticSearchMsg = BaseMessage<'SEMANTIC_SEARCH', {
  query: string;
  topK: number;  // default: 10
}>;

type SemanticSearchRes = ApiResponse<{
  results: Array<{
    articleId: UUID;
    url: string;
    title: string;
    snippet: string;
    score: number; // cosine similarity 0..1
  }>;
  /** Number of articles with stale (wrong model version) embeddings */
  staleEmbeddingCount: number;
}>;

// Error codes: 'MODEL_NOT_LOADED', 'NO_ARTICLES'
```

---

### 2.6 Content Scraping

#### `SCRAPE_CONTENT`

```typescript
/** SW → Content Script (injected per-tab) */
type ScrapeContentMsg = BaseMessage<'SCRAPE_CONTENT', undefined>;

type ScrapeContentRes = ApiResponse<{
  url: string;
  title: string;
  /** Extracted text — streamed in ≤50KB chunks via Port if large */
  content: string;
  /** Byte count of the full text */
  byteLength: number;
}>;
```

---

### 2.7 Export / Import

#### `EXPORT_WORKSPACE`

```typescript
type ExportWorkspaceMsg = BaseMessage<'EXPORT_WORKSPACE', {
  password: string;
}>;

type ExportWorkspaceRes = ApiResponse<{
  /** Blob URL for the Side Panel to trigger File Save Picker */
  blobUrl: string;
  filename: string;
  sizeBytes: number;
}>;

// Error codes: 'WEAK_PASSWORD', 'EXPORT_IN_PROGRESS'
```

#### `IMPORT_WORKSPACE`

```typescript
type ImportWorkspaceMsg = BaseMessage<'IMPORT_WORKSPACE', {
  /** Raw file bytes from showOpenFilePicker */
  arrayBuffer: ArrayBuffer;
  password: string;
}>;

type ImportWorkspaceRes = ApiResponse<{
  stats: {
    articles: number;
    spaces: number;
    highlights: number;
    chatMessages: number;
  };
}>;

// Error codes: 'INVALID_FORMAT', 'HMAC_VERIFICATION_FAILED',
//              'DECRYPTION_FAILED', 'SCHEMA_VALIDATION_FAILED'
```

---

### 2.8 Gemini Bridge Health

#### `GEMINI_HEALTH_CHECK`

```typescript
type GeminiHealthCheckMsg = BaseMessage<'GEMINI_HEALTH_CHECK', undefined>;

type GeminiHealthCheckRes = ApiResponse<{
  geminiTabId: number | null;
  healthy: boolean;
  /** CSS selectors that failed the health check */
  failedSelectors: string[];
  lastCheckAt: ISOTimestamp;
}>;
```

---

### 2.9 Encryption Lock/Unlock

#### `CRYPTO_UNLOCK`

```typescript
type CryptoUnlockMsg = BaseMessage<'CRYPTO_UNLOCK', {
  passphrase: string;
}>;

type CryptoUnlockRes = ApiResponse<{
  unlocked: boolean;
  autoLockMinutes: number;
}>;

// Error codes: 'WRONG_PASSPHRASE'
```

#### `CRYPTO_LOCK`

```typescript
type CryptoLockMsg = BaseMessage<'CRYPTO_LOCK', undefined>;
type CryptoLockRes = ApiResponse<{ locked: boolean }>;
```

---

### 2.10 Full Message Type Union (for Zod Router)

```typescript
type InboundMessage =
  | HighlightCreateMsg
  | HighlightDeleteMsg
  | HighlightsFetchMsg
  | HighlightUpdateMsg
  | AiQueryMsg
  | AiQueryStatusMsg
  | SpaceCreateMsg
  | SpaceRestoreMsg
  | SpaceDeleteMsg
  | SpaceUpdateMsg
  | ArticleSaveMsg
  | SemanticSearchMsg
  | ExportWorkspaceMsg
  | ImportWorkspaceMsg
  | GeminiHealthCheckMsg
  | CryptoUnlockMsg
  | CryptoLockMsg;

/** Used in zod-schemas.ts to build discriminated union validator */
type MessageType = InboundMessage['type'];
```

---

## 3. Core Logic Design: The DOM Anchoring Algorithm

### 3.1 Overview

The anchoring system must solve two problems:
1. **Capture** — When the user selects text, compute a durable locator that survives page reloads.
2. **Restore** — When the page loads again, find the exact text and re-apply the highlight `<mark>`.

The primary strategy uses **W3C TextQuoteSelector** (text-based matching), with XPath and CSS selectors as fallbacks. This order is critical — XPath breaks on dynamic pages; text matching does not.

---

### 3.2 Phase 1 — Capture Algorithm

```
highlighter.ts → captureHighlight()

INPUT:  User selection via window.getSelection()
OUTPUT: TextQuoteAnchor + PageMeta

┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Validate Selection                                    │
│                                                                │
│   const selection = window.getSelection();                     │
│   if (!selection || selection.isCollapsed) return null;         │
│   const range = selection.getRangeAt(0);                       │
│   const selectedText = selection.toString().trim();            │
│   if (selectedText.length === 0) return null;                  │
│   if (selectedText.length > 10_000) return null; // cap        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Extract TextQuoteSelector Fields                      │
│                                                                │
│   exact:  selectedText (verbatim)                              │
│                                                                │
│   prefix: Walk backwards from range.startContainer to collect  │
│           50 characters of preceding text.                     │
│           → Traverse previousSibling / parentNode text nodes.  │
│           → Normalise whitespace (collapse runs to single ' ') │
│                                                                │
│   suffix: Walk forward from range.endContainer to collect      │
│           50 characters of following text.                      │
│           → Traverse nextSibling / parentNode text nodes.      │
│           → Normalise whitespace.                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Compute Character Offsets                             │
│                                                                │
│   startOffset: Number of characters from the beginning of      │
│                range.startContainer.textContent to the start   │
│                of the selection.  → range.startOffset           │
│                                                                │
│   endOffset:   range.endOffset in range.endContainer            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Compute Fallback XPath                                │
│                                                                │
│   Target: The lowest common ancestor of the range.             │
│   const container = range.commonAncestorContainer;             │
│   const element = container.nodeType === Node.TEXT_NODE         │
│     ? container.parentElement : container;                      │
│                                                                │
│   xpathFallback = computeXPath(element):                       │
│     Walk UP the tree. For each node, compute:                  │
│       tagName + position among same-tag siblings               │
│       e.g. "/html[1]/body[1]/div[2]/article[1]/p[3]"          │
│     Stop at <html>.                                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: Compute Fallback CSS Selector                         │
│                                                                │
│   cssFallback = computeUniqueSelector(element):                │
│     Prefer: element ID if present → "#myId"                    │
│     Else:   nth-child chain → "body > div:nth-child(2) > p"    │
│     Verify: document.querySelector(css) === element             │
│     If not unique: append :nth-of-type(N) until unique.        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: Compute Page Metadata                                 │
│                                                                │
│   pageMeta = {                                                 │
│     title: document.title,                                     │
│     domFingerprint: SHA256(document.body.innerText.slice(0,500))│
│   }                                                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 7: Wrap Selection in <mark>                              │
│                                                                │
│   const mark = document.createElement('mark');                 │
│   mark.className = 'icycrow-highlight';                        │
│   mark.dataset.id = 'pending'; // replaced with UUID on ack   │
│   mark.dataset.color = color;                                  │
│   range.surroundContents(mark);                                │
│                                                                │
│   ⚠️ If range spans multiple elements,                        │
│      surroundContents() throws. In that case:                  │
│      → Use extractContents() + insertNode() pattern.           │
│      → Split text nodes at boundaries.                         │
│      → Wrap each text node fragment individually.              │
│      → Link fragments via shared data-group-id attribute.      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
             Return { anchor: TextQuoteAnchor, pageMeta }
             Send to SW via HIGHLIGHT_CREATE message
```

---

### 3.3 Phase 2 — Restore Algorithm

```
highlighter.ts → restoreHighlights()

INPUT:  Highlight[] from HIGHLIGHTS_FETCH response + pageChanged flag
OUTPUT: <mark> elements rendered on the live DOM (or ghost entries)

For EACH highlight in the array:

┌──────────────────────────────────────────────────────────────┐
│ STRATEGY 1: TextQuoteSelector (PRIMARY — always attempted)   │
│                                                                │
│   1. Get fullText = document.body.innerText                    │
│   2. Search for highlight.anchor.exact in fullText             │
│      → If multiple matches, disambiguate via prefix/suffix:    │
│        a. For each match position:                             │
│           - Extract 50 chars before and after the match.       │
│           - Compare with anchor.prefix and anchor.suffix.      │
│           - Score = (prefixMatchLen + suffixMatchLen) / 100    │
│        b. Pick the match with the highest score.               │
│   3. If exactMatch found:                                      │
│      → Map the character offset in innerText to a DOM Range:   │
│        a. Walk the DOM tree (TreeWalker, TEXT_NODEs only).     │
│        b. Accumulate character counts.                         │
│        c. When accumulated count reaches matchStart:            │
│           → range.setStart(currentTextNode, localOffset)       │
│        d. When accumulated count reaches matchEnd:              │
│           → range.setEnd(currentTextNode, localOffset)         │
│      → GOTO: WRAP RANGE                                        │
│   4. If NOT found: FALL THROUGH to Strategy 2.                 │
└──────────────────────────────────────────────────────────────┘
                              │ (not found)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STRATEGY 2: XPath Fallback                                    │
│                                                                │
│   1. Evaluate anchor.xpathFallback:                            │
│      const result = document.evaluate(                         │
│        xpathFallback, document, null,                          │
│        XPathResult.FIRST_ORDERED_NODE_TYPE, null               │
│      );                                                        │
│      const containerNode = result.singleNodeValue;             │
│   2. If containerNode exists:                                  │
│      → Search for anchor.exact within containerNode.textContent│
│      → If found at expected offset: build Range.               │
│      → GOTO: WRAP RANGE                                        │
│   3. If NOT found or node is null: FALL THROUGH.               │
└──────────────────────────────────────────────────────────────┘
                              │ (not found)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STRATEGY 3: CSS Selector Fallback                             │
│                                                                │
│   1. Query: document.querySelector(anchor.cssFallback)          │
│   2. If element exists:                                        │
│      → Search for anchor.exact in element.textContent          │
│      → If found: build Range → GOTO: WRAP RANGE               │
│   3. If NOT found: FALL THROUGH.                               │
└──────────────────────────────────────────────────────────────┘
                              │ (not found)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ STRATEGY 4: Fuzzy Text Search (Last Resort)                   │
│                                                                │
│   1. Use a sliding-window substring search across              │
│      document.body.innerText.                                  │
│   2. For each window of length = exact.length ± 20%:           │
│      → Compute Levenshtein distance to anchor.exact            │
│      → Track best match (lowest distance / length ratio)       │
│   3. If best match ratio < 0.3 (70%+ similarity):             │
│      → Build Range from the match position.                    │
│      → GOTO: WRAP RANGE                                        │
│   4. If no match: MARK AS GHOST.                               │
└──────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           ▼                                      ▼
┌─────────────────────┐              ┌──────────────────────┐
│ WRAP RANGE           │              │ MARK AS GHOST         │
│                     │              │                      │
│ Split text nodes if │              │ Do NOT render <mark> │
│ range spans multiple│              │ on the page.          │
│ elements.           │              │                      │
│ Create <mark> with: │              │ Report to Side Panel: │
│  .icycrow-highlight │              │ { id, status: 'ghost',│
│  data-id = uuid     │              │   reason: 'anchor_   │
│  data-color = color  │              │   not_found' }        │
│ Insert into DOM.    │              │                      │
│                     │              │ Show ⚠️ badge in     │
│ Report: { id,       │              │ HighlightsPanel.     │
│   status: 'rendered'}│              └──────────────────────┘
└─────────────────────┘
```

---

### 3.4 Multi-Element Highlight Handling

When a selection spans multiple DOM elements (e.g., across `<p>` and `<li>` tags), `Range.surroundContents()` throws. The fallback:

```typescript
function wrapCrossElementRange(range: Range, highlightId: string, color: string): void {
  const groupId = highlightId; // all fragments share this

  // 1. Extract the contents into a DocumentFragment
  const fragment = range.extractContents();

  // 2. Walk all text nodes in the fragment
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  // 3. Wrap each text node in a <mark>
  for (const textNode of textNodes) {
    if (textNode.textContent?.trim()) {
      const mark = document.createElement('mark');
      mark.className = 'icycrow-highlight';
      mark.dataset.id = highlightId;
      mark.dataset.groupId = groupId;
      mark.dataset.color = color;
      textNode.parentNode!.insertBefore(mark, textNode);
      mark.appendChild(textNode);
    }
  }

  // 4. Re-insert the wrapped fragment at the original position
  range.insertNode(fragment);
}
```

---

## 4. State Management & MV3 Resilience

### 4.1 The MV3 Problem

Chrome's Manifest V3 Service Worker has three critical constraints:

| Constraint | Implication | IcyCrow Impact |
|---|---|---|
| **30s idle termination** | SW is killed after ~30s of inactivity. All in-memory state is lost. | Every piece of state must be persistable to `chrome.storage`. In-memory caches are convenience-only. |
| **5-min hard limit** | SW is killed after ~5 min of continuous activity, even if busy. | Long-running tasks (batch embedding, export) must NOT run in the SW itself. |
| **No DOM access** | SW cannot create `<canvas>`, `<audio>`, or interact with any DOM. | Visual operations, File Picker APIs, and DOM-dependent libraries must run in Side Panel or Offscreen Document. |

---

### 4.2 State Persistence Pattern

```
┌──────────────────────────────────────────────────────────────┐
│            SERVICE WORKER STATE FLOW                          │
│                                                                │
│   ┌─────────────┐     ┌──────────────┐     ┌──────────────┐  │
│   │ In-Memory    │◄───│ Boot Loader   │────►│ chrome.storage│  │
│   │ (fast cache) │     │ (on activate) │     │ .local/.session│ │
│   │              │     │              │     │              │  │
│   │ • queueState │     │ Reads storage │     │ SOURCE OF    │  │
│   │ • settings   │     │ into memory   │     │ TRUTH        │  │
│   │ • geminiTabId│     │ on every SW   │     │              │  │
│   │ • cryptoKey  │     │ (re)start.    │     │ Every write  │  │
│   └──────┬───────┘     └──────────────┘     │ goes HERE    │  │
│          │                                   │ first.       │  │
│          │ On EVERY mutation:                 └──────────────┘  │
│          │  1. Write to chrome.storage (async)                  │
│          │  2. Update in-memory cache (sync)                    │
│          │  3. Ack to caller                                    │
└──────────────────────────────────────────────────────────────┘
```

#### Boot Sequence — `service-worker.ts`

```typescript
// ── service-worker.ts ──

let state: {
  settings: IcyCrowSettings | null;
  queueState: QueueState | null;
  geminiTabId: number | null;
  cryptoKey: CryptoKey | null;  // NEVER persisted — auto-lock wipes this
} = {
  settings: null,
  queueState: null,
  geminiTabId: null,
  cryptoKey: null,
};

/** Runs on every SW activation (including cold restarts) */
async function boot(): Promise<void> {
  // 1. Load persisted state into memory
  const stored = await chrome.storage.local.get(['settings', 'queueState']);
  state.settings = stored.settings ?? DEFAULT_SETTINGS;
  state.queueState = stored.queueState ?? DEFAULT_QUEUE_STATE;

  // 2. Load session-only state
  const session = await chrome.storage.session.get(['sessionState']);
  const sessionState: SessionState = session.sessionState ?? newSessionState();
  sessionState.swRestartCount += 1;
  sessionState.swBootedAt = new Date().toISOString() as ISOTimestamp;
  await chrome.storage.session.set({ sessionState });

  // 3. Detect Gemini tab
  state.geminiTabId = await detectGeminiTab(state.settings!.gemini.urlPattern);

  // 4. Resume any interrupted queue tasks
  if (state.queueState?.activeTaskId) {
    console.warn('[SW Boot] Resuming interrupted task:', state.queueState.activeTaskId);
    await resumeTask(state.queueState.activeTaskId);
  }

  // 5. Start keep-alive alarm
  chrome.alarms.create('keepalive', { periodInMinutes: 0.4 }); // every 24s
  chrome.alarms.create('backup-check', { periodInMinutes: 1440 }); // every 24h
  chrome.alarms.create('crypto-autolock', { periodInMinutes: 1 }); // check every 1 min
}

self.addEventListener('activate', () => boot());

// Keep-alive: the alarm triggers onAlarm, which prevents idle termination
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') { /* no-op — just prevents idle kill */ }
  if (alarm.name === 'backup-check') { checkScheduledBackup(); }
  if (alarm.name === 'crypto-autolock') { checkCryptoAutoLock(); }
});
```

---

### 4.3 `chrome.offscreen` for Heavy Compute

> [!IMPORTANT]
> MV3 Service Workers cannot create Web Workers in all Chrome versions reliably. The `chrome.offscreen` API provides a hidden DOM page that **persists independently** of the SW lifecycle and can host long-running Web Workers.

#### Architecture

```
┌─────────────────────────┐
│ Service Worker           │
│ (orchestrator, dies often)│
│                         │
│  Receives message:       │
│  "SEMANTIC_SEARCH"       │
│         │                │
│         ▼                │
│  Creates offscreen       │
│  document (if not exist) │
│         │                │
│         ▼                │
│  chrome.runtime          │
│  .sendMessage() to       │
│  offscreen page          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Offscreen Document       │
│ offscreen.html           │
│ (invisible, persistent)  │
│                         │
│  Hosts Web Workers:      │
│  ┌───────────────────┐  │
│  │ embedding-worker   │  │
│  │ (ONNX in WASM)     │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ export-worker      │  │
│  │ (crypto + serial)  │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ pdf-worker         │  │
│  │ (pdf.js extract)   │  │
│  └───────────────────┘  │
│                         │
│  Survives SW restarts!  │
└─────────────────────────┘
```

#### Offscreen Lifecycle Manager — `offscreen-manager.ts`

```typescript
const OFFSCREEN_URL = 'offscreen.html';
const OFFSCREEN_REASONS = ['WORKERS'] as const;

async function ensureOffscreenDocument(): Promise<void> {
  // Check if already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });

  if (existingContexts.length > 0) return; // already alive

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: 'Run ONNX embedding model and export crypto in Web Workers',
  });
}

/** Send a task to the offscreen document */
async function dispatchToOffscreen<T>(message: InboundMessage): Promise<T> {
  await ensureOffscreenDocument();
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
```

#### `offscreen.html` + `offscreen.ts`

```html
<!-- offscreen.html — NEVER visible to user -->
<!DOCTYPE html>
<script src="offscreen.ts" type="module"></script>
```

```typescript
// offscreen.ts — message relay to/from Web Workers

import EmbeddingWorker from './workers/embedding-worker?worker';
import ExportWorker from './workers/export-worker?worker';

const embeddingWorker = new EmbeddingWorker();
const exportWorker = new ExportWorker();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SEMANTIC_SEARCH' || msg.type === 'EMBED_ARTICLE') {
    embeddingWorker.postMessage(msg);
    embeddingWorker.onmessage = (e) => sendResponse(e.data);
    return true; // async response
  }

  if (msg.type === 'EXPORT' || msg.type === 'IMPORT') {
    exportWorker.postMessage(msg);
    exportWorker.onmessage = (e) => sendResponse(e.data);
    return true;
  }
});
```

---

### 4.4 Gemini Bridge Health Monitoring

The Gemini Bridge is fragile — Google can change the DOM at any time. The system implements continuous monitoring:

#### Selector Health Check

```typescript
// gemini-selectors.ts — centralised DOM selectors

export const GEMINI_SELECTORS = {
  INPUT_FIELD: [
    'div[contenteditable="true"][aria-label*="prompt"]',    // primary
    'rich-textarea .ql-editor',                             // fallback v1
    'textarea[aria-label*="Enter a prompt"]',               // fallback v2
  ],
  SUBMIT_BUTTON: [
    'button[aria-label="Send message"]',                    // primary
    'button[data-test-id="send-button"]',                   // fallback
    'mat-icon-button[aria-label*="Send"]',                  // fallback v2
  ],
  RESPONSE_CONTAINER: [
    'message-content .markdown',                            // primary
    '.model-response-text',                                 // fallback
    'div[data-message-author-role="model"]',                // fallback v2
  ],
  LOADING_INDICATOR: [
    '.loading-indicator',
    'mat-progress-bar',
    '[aria-label*="Loading"]',
  ],
} as const;
```

#### Health Check Loop

```typescript
interface BridgeHealthReport {
  healthy: boolean;
  geminiTabId: number | null;
  failedSelectors: string[];
  timestamp: ISOTimestamp;
}

async function checkBridgeHealth(): Promise<BridgeHealthReport> {
  const report: BridgeHealthReport = {
    healthy: true,
    geminiTabId: state.geminiTabId,
    failedSelectors: [],
    timestamp: new Date().toISOString() as ISOTimestamp,
  };

  // 1. Is the Gemini tab still open?
  if (!state.geminiTabId) {
    report.healthy = false;
    return report;
  }

  try {
    const tab = await chrome.tabs.get(state.geminiTabId);
    if (!tab || !tab.url?.match(state.settings!.gemini.urlPattern)) {
      report.healthy = false;
      report.geminiTabId = null;
      return report;
    }
  } catch {
    report.healthy = false;
    report.geminiTabId = null;
    return report;
  }

  // 2. Can we find all critical selectors?
  const selectorChecks = await chrome.scripting.executeScript({
    target: { tabId: state.geminiTabId },
    func: (selectors: Record<string, string[]>) => {
      const failed: string[] = [];
      for (const [name, candidates] of Object.entries(selectors)) {
        const found = candidates.some(sel =>
          document.querySelector(sel) !== null
        );
        if (!found) failed.push(name);
      }
      return failed;
    },
    args: [GEMINI_SELECTORS],
  });

  report.failedSelectors = selectorChecks[0]?.result ?? [];
  report.healthy = report.failedSelectors.length === 0;

  // 3. Update session state
  await chrome.storage.session.set({
    sessionState: {
      ...await getSessionState(),
      geminiBridgeHealthy: report.healthy,
      lastSelectorCheckAt: report.timestamp,
    },
  });

  return report;
}

// Run health check:
//  • On every SW boot
//  • Before every AI_QUERY dispatch
//  • Every 5 minutes via chrome.alarms
chrome.alarms.create('gemini-health', { periodInMinutes: 5 });
```

#### Graceful Degradation Flow

```
Bridge Health Check
    │
    ├─ ALL selectors found → ✅ Healthy. Proceed with AI query.
    │
    ├─ INPUT_FIELD not found → ⚠️ Degraded.
    │   → Try fallback selectors (up to 3 candidates per role).
    │   → If all fail: pause queue, show banner:
    │     "Gemini UI has changed. IcyCrow AI is temporarily unavailable."
    │
    ├─ RESPONSE_CONTAINER not found → ⚠️ Degraded.
    │   → Can still TYPE but cannot read response.
    │   → Pause queue. Show: "Cannot read Gemini responses. Waiting for fix."
    │
    └─ Gemini tab closed → ❌ Unhealthy.
        → Attempt auto-detection of any Gemini tab.
        → If found: re-pin, resume queue.
        → If not found: show: "Please open gemini.google.com to use AI features."
```

---

### 4.5 Storage-Mutex — Preventing Write Races

```typescript
// lib/storage-mutex.ts

/**
 * A Promise-chain based mutex to prevent concurrent async operations
 * from clobbering each other. Locks are maintained per string key.
 */
class StorageMutex {
  private locks: Map<string, Promise<any>> = new Map();

  async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previousTask = this.locks.get(key) || Promise.resolve();

    const nextTask = (async () => {
      try {
        await previousTask;
      } catch {
        // Prevent previous failures from blocking the queue
      }
      return task();
    })();

    this.locks.set(key, nextTask);

    nextTask.finally(() => {
      if (this.locks.get(key) === nextTask) {
        this.locks.delete(key);
      }
    });

    return nextTask;
  }
}

// Usage in lib/storage.ts:
export async function updateHighlights(
  urlHash: string, 
  updater: (highlights: Highlight[]) => Highlight[]
): Promise<void> {
  const key = `highlights:${urlHash}`;
  return mutex.withLock(key, async () => {
    const current = await getHighlights(urlHash);
    const updated = updater(current);
    await chrome.storage.local.set({ [key]: updated });
  });
}
```

---

### 4.6 Crypto Manager — Key Lifecycle

```typescript
// background/crypto-manager.ts

class CryptoManager {
  private key: CryptoKey | null = null;
  private lastUsedAt: number = 0;
  private autoLockMs: number = 30 * 60 * 1000; // 30 min default

  /** Derive key from passphrase. Key is NON-EXTRACTABLE. */
  async unlock(passphrase: string): Promise<boolean> {
    const salt = await this.getOrCreateSalt();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false, // non-extractable
      ['deriveKey'],
    );

    this.key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable — CRITICAL
      ['encrypt', 'decrypt'],
    );

    this.lastUsedAt = Date.now();
    await this.updateSessionState(true);
    return true;
  }

  /** Wipe key from memory. User must re-enter passphrase. */
  lock(): void {
    this.key = null;
    this.lastUsedAt = 0;
    this.updateSessionState(false);
  }

  /** Called by crypto-autolock alarm every 1 minute */
  checkAutoLock(): void {
    if (this.key && (Date.now() - this.lastUsedAt > this.autoLockMs)) {
      this.lock();
    }
  }

  /** Encrypt a single record. Atomic — safe against SW termination. */
  async encrypt(data: string): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    if (!this.key) throw new Error('ENCRYPTION_LOCKED');
    this.lastUsedAt = Date.now();

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      new TextEncoder().encode(data),
    );

    return { ciphertext, iv };
  }

  async decrypt(ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
    if (!this.key) throw new Error('ENCRYPTION_LOCKED');
    this.lastUsedAt = Date.now();

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      ciphertext,
    );

    return new TextDecoder().decode(plaintext);
  }

  private async updateSessionState(unlocked: boolean): Promise<void> {
    const session = await chrome.storage.session.get('sessionState');
    await chrome.storage.session.set({
      sessionState: {
        ...session.sessionState,
        cryptoKeyUnlocked: unlocked,
        cryptoKeyLastUsedAt: unlocked ? new Date().toISOString() : null,
      },
    });
  }

  private async getOrCreateSalt(): Promise<Uint8Array> {
    const { encryptionSalt } = await chrome.storage.local.get('encryptionSalt');
    if (encryptionSalt) return new Uint8Array(encryptionSalt);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    await chrome.storage.local.set({ encryptionSalt: Array.from(salt) });
    return salt;
  }
}

export const cryptoManager = new CryptoManager();
```

---

## 5. Pro Toolbar Engine (Epic S20)

### 5.1 State Model (`toolbar-state.ts`)
- `toolbarPosition`: `'top' | 'bottom' | 'left' | 'right' | 'floating'`.
- `floatingCoordinates`: `{ x, y }` clamped to viewport.
- `toolsOrder`: `ToolId[]` persistent list.
- `toolbarIsDragging`: Boolean interaction lock.

### 5.2 Interaction Logic (`ToolbarManager.tsx`)
- **Docking Proximity:** < 50px triggers preview/snap.
- **Undocking Hysteresis:** > 100px drag required to break edge stickiness.
- **Performance:** rAF-throttled pointer move updates.

### 5.3 UI Geometry (`CircularToolbar.tsx`)
- Tools distributed via `[r*cos(θ), r*sin(θ)]`.
- Reorder Mode via linear list overlay to avoid circular D&D complexity.

> **End of LLD v1.1** — Updated with S20 Toolbar Engine.
