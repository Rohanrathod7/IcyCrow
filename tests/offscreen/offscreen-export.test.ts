import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock lib/idb-store
const getAllArticlesMock = vi.fn();
const getAllHighlightsMock = vi.fn();
const getAllSpacesMock = vi.fn();
const getAllEmbeddingsMock = vi.fn();
const saveArticleMock = vi.fn();
const saveEmbeddingMock = vi.fn();

vi.mock('../../src/lib/idb-store', () => ({
  getAllArticles: getAllArticlesMock,
  getAllHighlights: getAllHighlightsMock,
  getAllSpaces: getAllSpacesMock,
  getAllEmbeddings: getAllEmbeddingsMock,
  saveArticle: saveArticleMock,
  saveEmbedding: saveEmbeddingMock,
  getCachedModel: vi.fn(),
  cacheModel: vi.fn()
}));

// Mock lib/export-worker
const exportWorkspaceMock = vi.fn();
const importWorkspaceMock = vi.fn();

vi.mock('../../src/lib/export-worker', () => ({
  exportWorkspace: exportWorkspaceMock,
  importWorkspace: importWorkspaceMock,
  EXPORT_LIMIT_BYTES: 50 * 1024 * 1024
}));

describe('Offscreen Export/Import Handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-id',
        onMessage: { addListener: vi.fn() },
        getURL: vi.fn((p) => `chrome-extension://id/${p}`)
      },
      storage: {
        local: {
          set: vi.fn().mockResolvedValue(undefined)
        }
      }
    });
  });

  it('handles EXPORT_WORKSPACE message', async () => {
    // 1. Setup mocks
    getAllArticlesMock.mockResolvedValue([{ id: 'a1' }]);
    getAllEmbeddingsMock.mockResolvedValue([{ articleId: 'a1' }]);
    getAllHighlightsMock.mockResolvedValue({ 'h1': [] });
    getAllSpacesMock.mockResolvedValue({ 's1': {} });
    exportWorkspaceMock.mockResolvedValue(new ArrayBuffer(100));

    // 2. Load offscreen script
    await import('../../src/offscreen/offscreen');
    const listener = (chrome.runtime.onMessage.addListener as any).mock.calls[0][0];

    // 3. Trigger message
    const response = await new Promise(resolve => {
      listener({ type: 'EXPORT_WORKSPACE', payload: { password: 'TestPassword123!' } }, { id: 'test-id' }, resolve);
    });

    // 4. Assert
    if (!(response as any).ok) {
       console.error('Export failed in test:', (response as any).error);
    }
    expect(getAllArticlesMock).toHaveBeenCalled();
    expect(exportWorkspaceMock).toHaveBeenCalled();
    expect(response).toEqual({
      ok: true,
      data: { buffer: expect.any(ArrayBuffer) }
    });
  });

  it('handles IMPORT_WORKSPACE message', async () => {
    // 1. Setup mocks
    const mockBundle = {
      articles: [{ id: 'a1' }],
      embeddings: [{ articleId: 'a1' }],
      highlights: { 'highlights:1': [] },
      spaces: { 's1': {} },
      chatHistories: []
    };
    importWorkspaceMock.mockResolvedValue(mockBundle);

    // 2. Load offscreen script
    await import('../../src/offscreen/offscreen');
    const listener = (chrome.runtime.onMessage.addListener as any).mock.calls[0][0];

    // 3. Trigger message
    const response = await new Promise(resolve => {
      listener({ 
        type: 'IMPORT_WORKSPACE', 
        payload: { arrayBuffer: new ArrayBuffer(10), password: 'TestPassword123!' } 
      }, { id: 'test-id' }, resolve);
    });

    // 4. Assert
    expect(importWorkspaceMock).toHaveBeenCalled();
    expect(saveArticleMock).toHaveBeenCalledWith(mockBundle.articles[0]);
    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(response).toEqual({
      ok: true,
      data: {
        stats: {
          articles: 1,
          spaces: 1,
          highlights: 1,
          chatMessages: 0
        }
      }
    });
  });
});
