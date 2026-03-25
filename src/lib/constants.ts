import type { IcyCrowSettings } from './types';

export const DEFAULT_SETTINGS: IcyCrowSettings = {
  hibernation: {
    enabled: true,
    inactiveThresholdMinutes: 15,
  },
  antiDetection: {
    typingDelayMin: 50,
    typingDelayMax: 200,
    jitterEnabled: true,
  },
  archive: {
    embeddingModel: 'all-MiniLM-L6-v2',
    embeddingModelVersion: 1,
    ollamaEndpoint: 'http://localhost:11434',
  },
  gemini: {
    urlPattern: '*://gemini.google.com/*',
    customUrl: null,
  },
  encryption: {
    enabled: false,
    autoLockMinutes: 30,
  },
  backup: {
    enabled: true,
    intervalDays: 7,
    maxBackups: 5,
    lastSuccessAt: null,
  },
  theme: 'system',
  aiEngine: 'gemini',
};

export const QUEUE_MAX_DEPTH = 20;
export const QUEUE_CIRCUIT_BREAKER_THRESHOLD = 3;
export const CRYPTO_AUTO_LOCK_MINUTES = 30;
export const HIGHLIGHT_PREFIX_SUFFIX_LENGTH = 50;
export const TEXT_SELECTION_MAX_CHARS = 10_000;
export const IDB_NAME = 'IcyCrowDB';
export const IDB_VERSION = 3;
export const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';
