// Shared Primitive Types
export type UUID = string & { readonly __brand: 'UUID' };
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };
export type SHA256Hash = string & { readonly __brand: 'SHA256Hash' };

export type EncryptionStatus = { encrypted: false } | {
  encrypted: true;
  iv: string;      // base64-encoded AES-GCM IV
  salt: string;    // base64-encoded PBKDF2 salt
};

// IDB Store: articles
export interface IDBArticle {
  id: UUID;
  url: string;
  title: string;
  fullText: string;
  aiSummary: string | null;
  userNotes: string;
  savedAt: ISOTimestamp;
  spaceId: UUID | null;
  encryption: EncryptionStatus;
}

export interface ScrapedTab {
  url: string;
  title: string;
  content: string;
  byteLength: number;
}

// IDB Store: embeddings
export interface IDBEmbedding {
  articleId: UUID;
  vector: Float32Array;
  modelVersion: number;
  createdAt: ISOTimestamp;
}

// IDB Store: annotations
export type AnnotationType = 'drawing' | 'comment' | 'shape';

export interface DrawingData {
  kind: 'drawing';
  paths: string[];
  strokeColor: string;
  strokeWidth: number;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface CommentData {
  kind: 'comment';
  body: string;
  anchor: TextQuoteAnchor;
}

export interface ShapeData {
  kind: 'shape';
  shapeType: 'rect' | 'circle' | 'arrow';
  bounds: { x: number; y: number; width: number; height: number };
  strokeColor: string;
  fillColor: string | null;
}

export interface IDBAnnotation {
  id: UUID;
  url: string;
  type: AnnotationType;
  data: DrawingData | CommentData | ShapeData;
  createdAt: ISOTimestamp;
}

// IDB Store: taskQueue
export type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface IDBTask {
  id: UUID;
  prompt: string;
  contextTabs: Array<{
    tabId: number;
    url: string;
    title: string;
    content?: string;
  }>;
  status: TaskStatus;
  result: string | null;
  error: string | null;
  retryCount: number;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// IDB Store: onnxModelCache
export interface IDBOnnxModel {
  modelName: string;
  modelData: ArrayBuffer;
  version: number;
  cachedAt: ISOTimestamp;
}

// IDB Store: backupManifest
export interface IDBBackupManifest {
  id: UUID;
  timestamp: ISOTimestamp;
  fileSize: number;
  checksum: string;
  location: string;
}

// chrome.storage.local: Settings
export interface IcyCrowSettings {
  hibernation: {
    enabled: boolean;
    inactiveThresholdMinutes: number;
  };
  antiDetection: {
    typingDelayMin: number;
    typingDelayMax: number;
    jitterEnabled: boolean;
  };
  archive: {
    embeddingModel: string;
    embeddingModelVersion: number;
    ollamaEndpoint: string;
  };
  gemini: {
    urlPattern: string;
    customUrl: string | null;
  };
  encryption: {
    enabled: boolean;
    autoLockMinutes: number;
  };
  backup: {
    enabled: boolean;
    intervalDays: number;
    maxBackups: number;
    lastSuccessAt: ISOTimestamp | null;
  };
  theme: 'light' | 'dark' | 'system';
}

// chrome.storage.local: Spaces
export interface SpaceTab {
  id: UUID;
  url: string;
  title: string;
  favicon: string | null;
  scrollPosition: number;
  chromeTabId: number | null;
}

export interface Space {
  id: UUID;
  name: string;
  color: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  tabs: SpaceTab[];
}

export type SpacesStore = Record<UUID, Space>;

// chrome.storage.local: Highlights
export interface TextQuoteAnchor {
  type: 'TextQuoteSelector';
  exact: string;
  prefix: string;
  suffix: string;
  xpathFallback: string;
  cssFallback: string;
  startOffset: number;
  endOffset: number;
}

export interface PageMeta {
  title: string;
  domFingerprint: SHA256Hash;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface Highlight {
  id: UUID;
  url: string;
  text: string;
  color: HighlightColor;
  note: string | null;
  anchor: TextQuoteAnchor;
  pageMeta: PageMeta;
  createdAt: ISOTimestamp;
  spaceId: UUID | null;
}

export type HighlightsStore = Highlight[];

// chrome.storage.local: Chat Histories
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: UUID;
  role: ChatRole;
  content: string;
  timestamp: ISOTimestamp;
  contextTabIds: UUID[];
  taskId: UUID | null;
}

export type ChatHistoryStore = ChatMessage[];

export interface WorkspaceBundle {
  articles: IDBArticle[];
  embeddings: IDBEmbedding[];
  highlights: Record<string, Highlight[]>; // highlights:<urlHash> -> Highlight[]
  spaces: SpacesStore;
  chatHistories: ChatHistoryStore;
}

// chrome.storage.local: Queue State
export interface QueueState {
  activeTaskId: UUID | null;
  pendingTaskIds: UUID[];
  lastActivityAt: ISOTimestamp;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
}

// chrome.storage.session: Session State
export interface SessionState {
  geminiTabId: number | null;
  geminiBridgeHealthy: boolean;
  lastSelectorCheckAt: ISOTimestamp | null;
  cryptoKeyUnlocked: boolean;
  cryptoKeyLastUsedAt: ISOTimestamp | null;
  swBootedAt: ISOTimestamp;
  swRestartCount: number;
}

// Internal API Contracts (Message Passing)
export interface BaseMessage<T extends string, P = undefined> {
  type: T;
  payload: P;
  _meta?: {
    senderId: string;
    timestamp: ISOTimestamp;
  };
}

export interface SuccessResponse<T = undefined> {
  ok: true;
  data: T;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = undefined> = SuccessResponse<T> | ErrorResponse;

// Messages
export type HighlightCreateMsg = BaseMessage<'HIGHLIGHT_CREATE', {
  url: string;
  urlHash: SHA256Hash;
  text: string;
  color: HighlightColor;
  anchor: TextQuoteAnchor;
  pageMeta: PageMeta;
  spaceId: UUID | null;
}>;
export type HighlightCreateRes = ApiResponse<{
  id: UUID;
  createdAt: ISOTimestamp;
}>;

export type HighlightDeleteMsg = BaseMessage<'HIGHLIGHT_DELETE', {
  urlHash: SHA256Hash;
  highlightId: UUID;
}>;
export type HighlightDeleteRes = ApiResponse<{ deleted: boolean }>;

export type HighlightsFetchMsg = BaseMessage<'HIGHLIGHTS_FETCH', {
  urlHash: SHA256Hash;
  currentDomFingerprint: SHA256Hash;
}>;
export type HighlightsFetchRes = ApiResponse<{
  highlights: Highlight[];
  pageChanged: boolean;
}>;

export type HighlightUpdateMsg = BaseMessage<'HIGHLIGHT_UPDATE', {
  urlHash: SHA256Hash;
  highlightId: UUID;
  updates: Partial<Pick<Highlight, 'color' | 'note'>>;
}>;
export type HighlightUpdateRes = ApiResponse<{ updated: boolean }>;

export type AiQueryMsg = BaseMessage<'AI_QUERY', {
  prompt: string;
  contextTabs: Array<{
    tabId: number;
    url: string;
    title: string;
  }>;
  spaceId: UUID;
}>;
export type AiQueryRes = ApiResponse<{
  taskId: UUID;
  position: number;
}>;

export type AiQueryStatusMsg = BaseMessage<'AI_QUERY_STATUS', {
  taskId: UUID;
}>;
export type AiQueryStatusRes = ApiResponse<{
  status: TaskStatus;
  position: number | null;
  result: string | null;
  error: string | null;
}>;

export type AiResponseStreamMsg = BaseMessage<'AI_RESPONSE_STREAM', {
  taskId: UUID;
  chunk: string;
  done: boolean;
}>;

export type SpaceCreateMsg = BaseMessage<'SPACE_CREATE', {
  name: string;
  color: string;
  captureCurrentTabs: boolean;
}>;
export type SpaceCreateRes = ApiResponse<{ space: Space }>;

export type SpaceRestoreMsg = BaseMessage<'SPACE_RESTORE', {
  spaceId: UUID;
}>;
export type SpaceRestoreRes = ApiResponse<{ tabsOpened: number }>;

export type SpaceDeleteMsg = BaseMessage<'SPACE_DELETE', { spaceId: UUID }>;
export type SpaceDeleteRes = ApiResponse<{ deleted: boolean }>;

export type SpaceUpdateMsg = BaseMessage<'SPACE_UPDATE', {
  spaceId: UUID;
  updates: Partial<Pick<Space, 'name' | 'color'>>;
}>;
export type SpaceUpdateRes = ApiResponse<{ updated: boolean }>;

export type ArticleSaveMsg = BaseMessage<'ARTICLE_SAVE', {
  tabId: number;
  url: string;
  title: string;
  spaceId: UUID | null;
}>;
export type ArticleSaveRes = ApiResponse<{
  articleId: UUID;
  embeddingQueued: boolean;
}>;

export type SemanticSearchMsg = BaseMessage<'SEMANTIC_SEARCH', {
  query: string;
  topK: number;
}>;
export type SemanticSearchRes = ApiResponse<{
  results: Array<{
    articleId: UUID;
    url: string;
    title: string;
    snippet: string;
    score: number;
  }>;
  staleEmbeddingCount: number;
}>;

export type ScrapeContentMsg = BaseMessage<'SCRAPE_CONTENT', undefined>;
export type ScrapeContentRes = ApiResponse<{
  url: string;
  title: string;
  content: string;
  byteLength: number;
}>;

export type ExportWorkspaceMsg = BaseMessage<'EXPORT_WORKSPACE', {
  password: string;
}>;
export type ExportWorkspaceRes = ApiResponse<{
  blobUrl: string;
  filename: string;
  sizeBytes: number;
}>;

export type ImportWorkspaceMsg = BaseMessage<'IMPORT_WORKSPACE', {
  arrayBuffer: ArrayBuffer;
  password: string;
}>;
export type ImportWorkspaceRes = ApiResponse<{
  stats: {
    articles: number;
    spaces: number;
    highlights: number;
    chatMessages: number;
  };
}>;

export type GeminiHealthCheckMsg = BaseMessage<'GEMINI_HEALTH_CHECK', undefined>;
export type GeminiHealthCheckRes = ApiResponse<{
  geminiTabId: number | null;
  healthy: boolean;
  failedSelectors: string[];
  lastCheckAt: ISOTimestamp;
}>;

export type CryptoUnlockMsg = BaseMessage<'CRYPTO_UNLOCK', {
  passphrase: string;
}>;
export type CryptoUnlockRes = ApiResponse<{
  unlocked: boolean;
  autoLockMinutes: number;
}>;

export type CryptoLockMsg = BaseMessage<'CRYPTO_LOCK', undefined>;
export type CryptoLockRes = ApiResponse<{ locked: boolean }>;

export type InboundMessage =
  | HighlightCreateMsg
  | HighlightDeleteMsg
  | HighlightsFetchMsg
  | HighlightUpdateMsg
  | AiQueryMsg
  | AiQueryStatusMsg
  | AiResponseStreamMsg
  | SpaceCreateMsg
  | SpaceRestoreMsg
  | SpaceDeleteMsg
  | SpaceUpdateMsg
  | ArticleSaveMsg
  | SemanticSearchMsg
  | ScrapeContentMsg
  | ExportWorkspaceMsg
  | ImportWorkspaceMsg
  | GeminiHealthCheckMsg
  | CryptoUnlockMsg
  | CryptoLockMsg;

export type MessageType = InboundMessage['type'];
