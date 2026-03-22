import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadModel, embed, cosineSimilarity, topK } from '../../src/lib/embedding-worker';

// Mock ONNX Runtime
vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(async () => ({
      run: vi.fn(async () => ({
        last_hidden_state: {
          data: new Float32Array(384).fill(0.5),
          dims: [1, 1, 384]
        }
      }))
    }))
  },
  Tensor: class {
    constructor(type: string, data: any, dims: number[]) {
      this.data = data;
      this.dims = dims;
    }
    data: any;
    dims: number[];
  }
}));

describe('Embedding Worker Logic', () => {
  it('calculates cosine similarity correctly', () => {
    const v1 = new Float32Array([1, 0, 0]);
    const v2 = new Float32Array([1, 0, 0]);
    const v3 = new Float32Array([0, 1, 0]);
    const v4 = new Float32Array([-1, 0, 0]);

    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0);
    expect(cosineSimilarity(v1, v4)).toBeCloseTo(-1);
  });

  it('embeds text (mocked)', async () => {
    const mockSession = {
      run: vi.fn(async () => ({
        last_hidden_state: {
          data: new Float32Array(384).fill(0.5),
          dims: [1, 1, 384]
        }
      }))
    } as any;
    const vector = await embed('hello world', mockSession);
    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector.length).toBe(384);
    expect(mockSession.run).toHaveBeenCalled();
  });

  it('finds top-K similar results', () => {
    const query = new Float32Array([1, 0, 0]);
    const stored = [
      { id: '1', vector: new Float32Array([0.9, 0.1, 0]) }, // Score ~0.9
      { id: '2', vector: new Float32Array([0.1, 0.9, 0]) }, // Score ~0.1
      { id: '3', vector: new Float32Array([-0.8, 0, 0.1]) }, // Score ~-0.8
    ];

    const results = topK(query, stored as any, 2);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('2');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
