import { z } from 'zod';
import type { UUID, ISOTimestamp, SHA256Hash } from './types';

// Reusable primitives
const UUIDSchema = z.string().uuid() as unknown as z.ZodType<UUID>;
// Use datetime without offsets to be safe or just string, standard ISO uses offset often, but Zod datetime assumes UTC 'Z' or offset. Let's use standard string for maximum compatibility if not strictly enforced.
const ISOTimestampSchema = z.string().datetime({ offset: true }) as unknown as z.ZodType<ISOTimestamp>;
const SHA256HashSchema = z.string() as unknown as z.ZodType<SHA256Hash>;

const TextQuoteAnchorSchema = z.object({
  type: z.literal('TextQuoteSelector'),
  exact: z.string(),
  prefix: z.string(),
  suffix: z.string(),
  xpathFallback: z.string(),
  cssFallback: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
});

const PageMetaSchema = z.object({
  title: z.string(),
  domFingerprint: SHA256HashSchema,
});

const HighlightColorSchema = z.enum(['yellow', 'green', 'blue', 'pink', 'orange']);

const MetaSchema = z.object({
  senderId: z.string(),
  timestamp: ISOTimestampSchema,
}).optional();

export const HighlightCreateSchema = z.object({
  type: z.literal('HIGHLIGHT_CREATE'),
  payload: z.object({
    url: z.string().url(),
    urlHash: SHA256HashSchema,
    text: z.string(),
    color: HighlightColorSchema,
    anchor: TextQuoteAnchorSchema,
    pageMeta: PageMetaSchema,
    spaceId: UUIDSchema.nullable(),
  }),
  _meta: MetaSchema,
});

export const HighlightDeleteSchema = z.object({
  type: z.literal('HIGHLIGHT_DELETE'),
  payload: z.object({
    urlHash: SHA256HashSchema,
    highlightId: UUIDSchema,
  }),
  _meta: MetaSchema,
});

export const HighlightsFetchSchema = z.object({
  type: z.literal('HIGHLIGHTS_FETCH'),
  payload: z.object({
    urlHash: SHA256HashSchema,
    currentDomFingerprint: SHA256HashSchema,
  }),
  _meta: MetaSchema,
});

export const HighlightUpdateSchema = z.object({
  type: z.literal('HIGHLIGHT_UPDATE'),
  payload: z.object({
    urlHash: SHA256HashSchema,
    highlightId: UUIDSchema,
    updates: z.object({
      color: HighlightColorSchema.optional(),
      note: z.string().nullable().optional(),
    }),
  }),
  _meta: MetaSchema,
});

export const AiQuerySchema = z.object({
  type: z.literal('AI_QUERY'),
  payload: z.object({
    prompt: z.string(),
    spaceId: UUIDSchema.nullable(),
    taskId: UUIDSchema,
  }),
  _meta: MetaSchema,
});

export const AiQueryStatusSchema = z.object({
  type: z.literal('AI_QUERY_STATUS'),
  payload: z.object({
    taskId: UUIDSchema,
  }),
  _meta: MetaSchema,
});

export const AiResponseStreamSchema = z.object({
  type: z.literal('AI_RESPONSE_STREAM'),
  payload: z.object({
    taskId: UUIDSchema,
    chunk: z.string(),
    done: z.boolean(),
    error: z.string().optional(),
    tabInfo: z.object({
      title: z.string(),
      url: z.string().url(),
      id: z.number(),
    }).optional(),
  }),
  _meta: MetaSchema,
});

export const SpaceCreateSchema = z.object({
  type: z.literal('SPACE_CREATE'),
  payload: z.object({
    name: z.string(),
    color: z.string(),
    captureCurrentTabs: z.boolean(),
    createTabGroup: z.boolean(),
  }),
  _meta: MetaSchema,
});

export const SpaceRestoreSchema = z.object({
  type: z.literal('SPACE_RESTORE'),
  payload: z.object({
    spaceId: UUIDSchema,
    createNativeGroup: z.boolean().optional(),
  }),
  _meta: MetaSchema,
});

export const SpaceDeleteSchema = z.object({
  type: z.literal('SPACE_DELETE'),
  payload: z.object({
    spaceId: UUIDSchema,
  }),
  _meta: MetaSchema,
});

export const SpaceUpdateSchema = z.object({
  type: z.literal('SPACE_UPDATE'),
  payload: z.object({
    spaceId: UUIDSchema,
    updates: z.object({
      name: z.string().optional(),
      color: z.string().optional(),
    }),
  }),
  _meta: MetaSchema,
});

export const ArticleSaveSchema = z.object({
  type: z.literal('ARTICLE_SAVE'),
  payload: z.object({
    tabId: z.number(),
    url: z.string().url(),
    title: z.string(),
    spaceId: UUIDSchema.nullable(),
  }),
  _meta: MetaSchema,
});

export const SemanticSearchSchema = z.object({
  type: z.literal('SEMANTIC_SEARCH'),
  payload: z.object({
    query: z.string(),
    topK: z.number(),
  }),
  _meta: MetaSchema,
});

export const ScrapeContentSchema = z.object({
  type: z.literal('SCRAPE_CONTENT'),
  payload: z.undefined(),
  _meta: MetaSchema,
});

export const ExportWorkspaceSchema = z.object({
  type: z.literal('EXPORT_WORKSPACE'),
  payload: z.object({
    password: z.string(),
  }),
  _meta: MetaSchema,
});

export const ImportWorkspaceSchema = z.object({
  type: z.literal('IMPORT_WORKSPACE'),
  payload: z.object({
    arrayBuffer: z.instanceof(ArrayBuffer),
    password: z.string(),
  }),
  _meta: MetaSchema,
});

export const GeminiHealthCheckSchema = z.object({
  type: z.literal('GEMINI_HEALTH_CHECK'),
  payload: z.undefined(),
  _meta: MetaSchema,
});

export const CryptoUnlockSchema = z.object({
  type: z.literal('CRYPTO_UNLOCK'),
  payload: z.object({
    passphrase: z.string(),
  }),
  _meta: MetaSchema,
});

export const CryptoLockSchema = z.object({
  type: z.literal('CRYPTO_LOCK'),
  payload: z.undefined(),
  _meta: MetaSchema,
});

export const ManualRegisterBridgeSchema = z.object({
  type: z.literal('MANUAL_REGISTER_BRIDGE'),
  payload: z.object({
    tabId: z.number(),
  }),
  _meta: MetaSchema,
});

export const WindowAiQuerySchema = z.object({
  type: z.literal('WINDOW_AI_QUERY'),
  payload: z.object({
    prompt: z.string(),
    taskId: UUIDSchema,
    spaceId: UUIDSchema.nullable(),
  }),
  _meta: MetaSchema,
});

export const ExplainTextRequestSchema = z.object({
  type: z.literal('EXPLAIN_TEXT_REQUEST'),
  payload: z.object({
    text: z.string(),
    action: z.enum(['explain', 'summarize']),
    spaceId: UUIDSchema.nullable().optional(),
    pdfTitle: z.string().optional(),
  }),
  _meta: MetaSchema,
});

export const InboundMessageSchema = z.discriminatedUnion('type', [
  HighlightCreateSchema,
  HighlightDeleteSchema,
  HighlightsFetchSchema,
  HighlightUpdateSchema,
  AiQuerySchema,
  AiQueryStatusSchema,
  AiResponseStreamSchema,
  SpaceCreateSchema,
  SpaceRestoreSchema,
  SpaceDeleteSchema,
  SpaceUpdateSchema,
  ArticleSaveSchema,
  SemanticSearchSchema,
  ScrapeContentSchema,
  ExportWorkspaceSchema,
  ImportWorkspaceSchema,
  GeminiHealthCheckSchema,
  CryptoUnlockSchema,
  CryptoLockSchema,
  WindowAiQuerySchema,
  ManualRegisterBridgeSchema,
  ExplainTextRequestSchema,
]);

export type ValidatedInboundMessage = z.infer<typeof InboundMessageSchema>;
