import { OFFSCREEN_PATH } from '../lib/constants';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class OffscreenManager {
  private static instance: OffscreenManager;
  private creating: Promise<void> | null = null;
  private idleTimer: any = null;

  private constructor() {}

  static getInstance(): OffscreenManager {
    if (!OffscreenManager.instance) {
      OffscreenManager.instance = new OffscreenManager();
    }
    return OffscreenManager.instance;
  }

  async ensureOffscreenDocument(): Promise<void> {
    if (this.creating) return this.creating;

    this.creating = (async () => {
      const hasDocument = await chrome.offscreen.hasDocument();
      if (hasDocument) return;

      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL(OFFSCREEN_PATH),
        reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
        justification: 'Running ONNX embedding model in isolated environment'
      });
    })();

    try {
      await this.creating;
    } finally {
      this.creating = null;
    }
  }

  async sendToOffscreen(message: any): Promise<any> {
    await this.ensureOffscreenDocument();
    this.resetIdleTimer();
    return chrome.runtime.sendMessage(message);
  }

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.closeOffscreenDocument();
    }, IDLE_TIMEOUT_MS);
  }

  private async closeOffscreenDocument() {
    const hasDocument = await chrome.offscreen.hasDocument();
    if (hasDocument) {
      await chrome.offscreen.closeDocument();
      console.log('[IcyCrow] Offscreen Document closed due to idle timeout.');
    }
    this.idleTimer = null;
  }
}

export const offscreenManager = OffscreenManager.getInstance();
