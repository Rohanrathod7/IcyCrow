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
export const IDB_NAME = 'IcyCrowDB';
export const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';
