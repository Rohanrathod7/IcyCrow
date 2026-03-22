import { describe, it, expect, vi } from 'vitest';
import { addListenerSpy } from './setup-offscreen';
import '../../src/offscreen/offscreen';

vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(async () => ({
      run: vi.fn(async () => ({
        last_hidden_state: {
          data: new Float32Array(384).fill(0.1),
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

// Mock idb-store to avoid real IDB calls
vi.mock('../../src/lib/idb-store', () => ({
  getCachedModel: vi.fn().mockResolvedValue(null),
  cacheModel: vi.fn().mockResolvedValue(undefined)
}));

describe('Offscreen Host', () => {
  it('registers onMessage listener on load', () => {
    expect(addListenerSpy).toHaveBeenCalled();
  });

  it('handles EMBED_TEXT message', async () => {
    const listener = addListenerSpy.mock.calls[0][0];
    
    const responsePromise = new Promise(resolve => {
      listener({ type: 'EMBED_TEXT', payload: { text: 'hello' } }, {}, (res: any) => resolve(res));
    });

    const response: any = await responsePromise;
    expect(response.ok).toBe(true);
  });
});
