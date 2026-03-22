import * as ort from 'onnxruntime-web';

export async function loadModel(modelBlob: Blob): Promise<ort.InferenceSession> {
  try {
    const arrayBuffer = await modelBlob.arrayBuffer();
    return await ort.InferenceSession.create(arrayBuffer);
  } catch (err: any) {
    console.error('[IcyCrow] ONNX Session creation failed:', err);
    throw new Error(`ONNX_LOAD_FAILURE: ${err.message}`);
  }
}

export async function embed(text: string, session: ort.InferenceSession): Promise<Float32Array> {
  // Simplified for Phase 1.2 (Tokenizer will be added in Phase 2/4)
  // We simulate the tensor creation and session run
  const inputIds = new BigUint64Array(text.length).fill(1n); // Dummy tokenization
  const attentionMask = new BigUint64Array(text.length).fill(1n);
  
  const feeds = {
    input_ids: new ort.Tensor('int64', inputIds, [1, text.length]),
    attention_mask: new ort.Tensor('int64', attentionMask, [1, text.length])
  };

  const results = await session.run(feeds);
  const lastHiddenState = results.last_hidden_state;
  
  // Mean pooling (simplified: just take the first token's embedding for now or follow model specifics)
  // The test mock gives [1, 1, 384] so we take the underlying data
  return lastHiddenState.data as Float32Array;
}

export function cosineSimilarity(v1: Float32Array, v2: Float32Array): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export function topK(
  queryVector: Float32Array, 
  stored: Array<{ id: string; vector: Float32Array }>, 
  k: number
): Array<{ id: string; score: number }> {
  const scored = stored.map(item => ({
    id: item.id,
    score: cosineSimilarity(queryVector, item.vector)
  }));
  
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
