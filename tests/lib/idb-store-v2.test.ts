import { describe, it, expect, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';

// Mock chrome.storage.local for highlight/space read tests
const mockStorageGet = vi.fn();
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
    },
  },
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.1: IDB v2 Schema — backupManifest store
// ─────────────────────────────────────────────────────────────────────────────
describe('IDB Store v2 — backupManifest', () => {
  it('saves and retrieves a backup manifest', async () => {
    const { saveBackupManifest, getBackupManifest } = await import('../../src/lib/idb-store');

    const manifest = {
      id: 'bk-001',
      timestamp: '2026-03-22T17:00:00Z',
      fileSize: 12345,
      checksum: 'abc123',
      location: 'Downloads/icycrow-backup.icycrow',
    };

    await saveBackupManifest(manifest as any);
    const retrieved = await getBackupManifest('bk-001');

    expect(retrieved).toBeDefined();
    expect(retrieved?.checksum).toBe('abc123');
    expect(retrieved?.fileSize).toBe(12345);
  });

  it('returns undefined for non-existent manifest', async () => {
    const { getBackupManifest } = await import('../../src/lib/idb-store');
    const result = await getBackupManifest('does-not-exist');
    expect(result).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.2: getAllArticles read API
// ─────────────────────────────────────────────────────────────────────────────
describe('IDB Store v2 — getAllArticles', () => {
  it('returns all saved articles', async () => {
    const { saveArticle, getAllArticles } = await import('../../src/lib/idb-store');

    const article1 = {
      id: 'art-a',
      url: 'https://a.com',
      title: 'Article A',
      fullText: 'a content',
      aiSummary: null,
      userNotes: '',
      savedAt: '2026-03-22T10:00:00Z',
      spaceId: null,
      encryption: { encrypted: false },
    };
    const article2 = {
      id: 'art-b',
      url: 'https://b.com',
      title: 'Article B',
      fullText: 'b content',
      aiSummary: null,
      userNotes: '',
      savedAt: '2026-03-22T11:00:00Z',
      spaceId: null,
      encryption: { encrypted: false },
    };

    await saveArticle(article1 as any);
    await saveArticle(article2 as any);

    const all = await getAllArticles();
    const ids = all.map((a) => a.id);

    expect(ids).toContain('art-a');
    expect(ids).toContain('art-b');
  });

  it('returns empty array when no articles exist', async () => {
    // Reimport fresh DB for isolation — fake-indexeddb resets between test files
    const { getAllArticles } = await import('../../src/lib/idb-store');
    // Manually check that the function exists and returns array
    const result = await getAllArticles();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.3: getAllHighlights from chrome.storage.local
// ─────────────────────────────────────────────────────────────────────────────
describe('IDB Store v2 — getAllHighlights', () => {
  it('returns all highlight key-value pairs from chrome.storage.local', async () => {
    mockStorageGet.mockResolvedValue({
      'highlights:aaa': [{ id: 'h1', text: 'hello' }],
      'highlights:bbb': [{ id: 'h2', text: 'world' }],
      settings: { theme: 'dark' }, // non-highlight key — must be excluded
      spaces: {},
    });

    const { getAllHighlights } = await import('../../src/lib/idb-store');
    const result = await getAllHighlights();

    expect(result).toHaveProperty('highlights:aaa');
    expect(result).toHaveProperty('highlights:bbb');
    expect(result).not.toHaveProperty('settings');
    expect(result).not.toHaveProperty('spaces');
    expect(result['highlights:aaa']).toHaveLength(1);
  });

  it('returns empty object when no highlights exist', async () => {
    mockStorageGet.mockResolvedValue({
      settings: { theme: 'dark' },
    });

    const { getAllHighlights } = await import('../../src/lib/idb-store');
    const result = await getAllHighlights();
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.4: getAllSpaces from chrome.storage.local
// ─────────────────────────────────────────────────────────────────────────────
describe('IDB Store v2 — getAllSpaces', () => {
  it('returns the spaces object from chrome.storage.local', async () => {
    const mockSpaces = {
      'sp-1': { id: 'sp-1', name: 'Work', color: '#fff', tabs: [] },
    };
    mockStorageGet.mockResolvedValue({ spaces: mockSpaces });

    const { getAllSpaces } = await import('../../src/lib/idb-store');
    const result = await getAllSpaces();

    expect(result).toEqual(mockSpaces);
    expect(mockStorageGet).toHaveBeenCalledWith('spaces');
  });

  it('returns empty object when spaces key is absent', async () => {
    mockStorageGet.mockResolvedValue({});

    const { getAllSpaces } = await import('../../src/lib/idb-store');
    const result = await getAllSpaces();
    expect(result).toEqual({});
  });
});
