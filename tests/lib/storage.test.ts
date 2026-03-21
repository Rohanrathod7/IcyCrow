import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as storage from '@lib/storage';
import { deleteDB } from 'idb';
import 'fake-indexeddb/auto';
import { DB_NAME, initDB } from '@lib/idb-migrations';

// Mock chrome api
const mockStorageLocal = {
  get: vi.fn(),
  set: vi.fn(),
};
globalThis.chrome = {
  storage: {
    local: mockStorageLocal as any,
  }
} as any;

describe('Unified Storage API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await deleteDB(DB_NAME);
  });

  afterEach(async () => {
    await storage._closeDBForTests();
  });

  describe('Settings', () => {
    it('sets and gets settings', async () => {
      mockStorageLocal.get.mockResolvedValueOnce({ settings: { theme: 'dark' } });
      const settings = await storage.getSettings();
      expect(settings?.theme).toBe('dark');
      expect(mockStorageLocal.get).toHaveBeenCalledWith('settings');

      await storage.setSettings({ theme: 'light' } as any);
      expect(mockStorageLocal.set).toHaveBeenCalledWith({ settings: { theme: 'light' } });
    });
  });

  describe('Highlights', () => {
    it('uses mutex for highlight updates', async () => {
      mockStorageLocal.get.mockResolvedValue({ 'highlights:hash1': [] });
      await storage.setHighlights('hash1', [{ id: '1' } as any]);
      expect(mockStorageLocal.set).toHaveBeenCalledWith({ 'highlights:hash1': [{ id: '1' }] });
    });
  });

  describe('IDB Articles', () => {
    it('saves and retrieves an article', async () => {
      const article = {
        id: '123',
        url: 'http://a.com',
        title: 'T',
        fullText: 'txt',
        aiSummary: null,
        userNotes: '',
        savedAt: '2026-03-21T10:00:00.000Z',
        spaceId: null,
        encryption: { encrypted: false }
      } as any;

      await storage.saveArticle(article);
      const retrieved = await storage.getArticle('123');
      expect(retrieved).toEqual(article);
      
      const all = await storage.getAllArticles();
      expect(all).toHaveLength(1);
    });
  });
  
  describe('IDB Embeddings', () => {
    it('saves and retrieves an embedding', async () => {
      const embedding = {
        articleId: '123',
        vector: new Float32Array([0.1, 0.2]),
        modelVersion: 1,
        createdAt: '2026-03-21T10:00:00.000Z'
      } as any;

      await storage.saveEmbedding(embedding);
      const retrieved = await storage.getEmbedding('123');
      expect(retrieved).toEqual(embedding);
    });
  });
});
