import { describe, it, expect, vi } from 'vitest';
import { exportWorkspace, importWorkspace } from '../../src/lib/export-worker';
import type { WorkspaceBundle } from '../../src/lib/types';

describe('Export Worker Core', () => {
  const mockBundle: WorkspaceBundle = {
    articles: [
      { id: '1-1-1', url: 'https://a.com', title: 'A', fullText: 'Content A', savedAt: '2026-03-22T00:00:00Z', encryption: { encrypted: false } } as any
    ],
    embeddings: [
      { articleId: '1-1-1', vector: new Float32Array([0.1, 0.2]), modelVersion: 1, createdAt: '2026-03-22T00:01:00Z' } as any
    ],
    highlights: {
      'highlights:hash1': [{ id: 'h1', text: 'hi' }]
    },
    spaces: {
      's1': { id: 's1', name: 'Work', color: 'blue', tabs: [] }
    },
    chatHistories: []
  };

  const password = 'TestPassword123!';

  it('exports and imports a workspace bundle correctly (round-trip)', async () => {
    const buffer = await exportWorkspace(mockBundle, password);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(100);

    const restored = await importWorkspace(buffer, password);
    expect(restored.articles[0].title).toBe('A');
    expect(restored.highlights['highlights:hash1']).toHaveLength(1);
    expect(restored.spaces['s1'].name).toBe('Work');
  });

  it('throws HMAC_VERIFICATION_FAILED for wrong password', async () => {
    const buffer = await exportWorkspace(mockBundle, password);
    await expect(importWorkspace(buffer, 'WrongPass1!'))
      .rejects.toThrow('HMAC_VERIFICATION_FAILED');
  });

  it('throws HMAC_VERIFICATION_FAILED for tampered data', async () => {
    const buffer = await exportWorkspace(mockBundle, password);
    const view = new Uint8Array(buffer);
    
    // Tamper with a byte in the ciphertext area (after header/salt/iv/len)
    // Offset depends on implementation, but let's just pick a safe one near end before HMAC
    view[buffer.byteLength - 40] ^= 0xFF;

    await expect(importWorkspace(buffer, password))
      .rejects.toThrow('HMAC_VERIFICATION_FAILED');
  });

  it('throws INVALID_FORMAT for incorrect magic header', async () => {
    const buffer = new Uint8Array(100).fill(0);
    await expect(importWorkspace(buffer.buffer, password))
      .rejects.toThrow('INVALID_FORMAT');
  });
});
