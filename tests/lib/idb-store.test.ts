import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { saveArticle, getArticle, saveEmbedding, getEmbedding, cacheModel, getCachedModel } from '../../src/lib/idb-store';
import { UUID, ISOTimestamp } from '../../src/lib/types';

describe('IDB Store', () => {
  const mockArticle = {
    id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
    url: 'https://test.com',
    title: 'Test Article',
    fullText: 'Clean version of article content',
    aiSummary: null,
    userNotes: '',
    savedAt: '2026-03-22T12:00:00Z' as ISOTimestamp,
    spaceId: null,
    encryption: { encrypted: false }
  };

  const mockEmbedding = {
    articleId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
    vector: new Float32Array(384).fill(0.1),
    modelVersion: 1,
    createdAt: '2026-03-22T12:01:00Z' as ISOTimestamp
  };

  const mockModelCache = {
    modelName: 'all-MiniLM-L6-v2',
    modelData: new Uint8Array([1, 2, 3]).buffer,
    version: 1,
    cachedAt: '2026-03-22T12:02:00Z' as ISOTimestamp
  };

  it('saves and retrieves an article', async () => {
    await saveArticle(mockArticle as any);
    const retrieved = await getArticle(mockArticle.id);
    expect(retrieved).toEqual(mockArticle);
  });

  it('saves and retrieves an embedding', async () => {
    await saveEmbedding(mockEmbedding as any);
    const retrieved = await getEmbedding(mockEmbedding.articleId);
    expect(retrieved?.modelVersion).toBe(1);
    expect(retrieved?.vector).toBeInstanceOf(Float32Array);
    expect(retrieved?.vector[0]).toBeCloseTo(0.1);
  });

  it('returns undefined for non-existent items', async () => {
    const article = await getArticle('non-existent' as UUID);
    expect(article).toBeUndefined();
  });

  it('caches and retrieves ONNX model data', async () => {
    await cacheModel(mockModelCache as any);
    const cached = await getCachedModel(mockModelCache.modelName);
    expect(cached?.modelName).toBe(mockModelCache.modelName);
    expect(cached?.modelData.byteLength).toBe(3);
  });
});
