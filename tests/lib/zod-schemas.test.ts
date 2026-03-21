import { describe, it, expect } from 'vitest';
import { InboundMessageSchema } from '@lib/zod-schemas';

describe('InboundMessageSchema Validation', () => {
  const meta = { senderId: 'tab-123', timestamp: '2026-03-21T10:00:00.000Z' };

  it('validates HIGHLIGHT_CREATE', () => {
    const valid = {
      type: 'HIGHLIGHT_CREATE',
      payload: {
        url: 'https://example.com',
        urlHash: 'hash',
        text: 'hello',
        color: 'yellow',
        anchor: {
          type: 'TextQuoteSelector',
          exact: 'hello',
          prefix: 'pre',
          suffix: 'suf',
          xpathFallback: '/',
          cssFallback: 'body',
          startOffset: 0,
          endOffset: 5
        },
        pageMeta: { title: 'T', domFingerprint: 'A' },
        spaceId: null
      },
      _meta: meta
    };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, color: 'invalid' }})).toThrow();
  });

  it('validates HIGHLIGHT_DELETE', () => {
    const valid = { type: 'HIGHLIGHT_DELETE', payload: { urlHash: 'h', highlightId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad' }, _meta: meta };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, highlightId: 123 }})).toThrow();
  });

  it('validates HIGHLIGHTS_FETCH', () => {
    const valid = { type: 'HIGHLIGHTS_FETCH', payload: { urlHash: 'h', currentDomFingerprint: 'f' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ type: 'HIGHLIGHTS_FETCH', payload: {} })).toThrow();
  });

  it('validates HIGHLIGHT_UPDATE', () => {
    const valid = { type: 'HIGHLIGHT_UPDATE', payload: { urlHash: 'h', highlightId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad', updates: { color: 'green' } } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, updates: { color: 'invalid' } } })).toThrow();
  });

  it('validates AI_QUERY', () => {
    const valid = { type: 'AI_QUERY', payload: { prompt: 'hi', contextTabs: [{ tabId: 1, url: 'http://a.com', title: 't' }], spaceId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, prompt: 123 } })).toThrow();
  });

  it('validates AI_QUERY_STATUS', () => {
    const valid = { type: 'AI_QUERY_STATUS', payload: { taskId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { taskId: 123 } })).toThrow();
  });

  it('validates AI_RESPONSE_STREAM', () => {
    const valid = { type: 'AI_RESPONSE_STREAM', payload: { taskId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad', chunk: 'a', done: false } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, done: 'false' } })).toThrow();
  });

  it('validates SPACE_CREATE', () => {
    const valid = { type: 'SPACE_CREATE', payload: { name: 'n', color: 'c', captureCurrentTabs: true } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, name: 123 } })).toThrow();
  });

  it('validates SPACE_RESTORE', () => {
    const valid = { type: 'SPACE_RESTORE', payload: { spaceId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { spaceId: 123 } })).toThrow();
  });

  it('validates SPACE_DELETE', () => {
    const valid = { type: 'SPACE_DELETE', payload: { spaceId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });

  it('validates SPACE_UPDATE', () => {
    const valid = { type: 'SPACE_UPDATE', payload: { spaceId: '6b6b801a-82bd-4849-81bc-b7ea6aa5bcad', updates: { name: 'n' } } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });

  it('validates ARTICLE_SAVE', () => {
    const valid = { type: 'ARTICLE_SAVE', payload: { tabId: 1, url: 'http://a.com', title: 't', spaceId: null } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, tabId: '1' } })).toThrow();
  });

  it('validates SEMANTIC_SEARCH', () => {
    const valid = { type: 'SEMANTIC_SEARCH', payload: { query: 'q', topK: 10 } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });

  it('validates SCRAPE_CONTENT', () => {
    const valid = { type: 'SCRAPE_CONTENT' };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });

  it('validates EXPORT_WORKSPACE', () => {
    const valid = { type: 'EXPORT_WORKSPACE', payload: { password: 'p' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });

  it('validates IMPORT_WORKSPACE', () => {
    const valid = { type: 'IMPORT_WORKSPACE', payload: { arrayBuffer: new ArrayBuffer(0), password: 'p' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
    expect(() => InboundMessageSchema.parse({ ...valid, payload: { ...valid.payload, arrayBuffer: 'not a buffer' } })).toThrow();
  });

  it('validates GEMINI_HEALTH_CHECK', () => {
    const valid = { type: 'GEMINI_HEALTH_CHECK' };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });

  it('validates CRYPTO_UNLOCK', () => {
    const valid = { type: 'CRYPTO_UNLOCK', payload: { passphrase: 'p' } };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });

  it('validates CRYPTO_LOCK', () => {
    const valid = { type: 'CRYPTO_LOCK' };
    expect(() => InboundMessageSchema.parse(valid)).not.toThrow();
  });
});
