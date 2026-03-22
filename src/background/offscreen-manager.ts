import { OFFSCREEN_PATH } from '../lib/constants';

export class OffscreenManager {
  private static instance: OffscreenManager;
  private creating: Promise<void> | null = null;

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
    return chrome.runtime.sendMessage(message);
  }
}

export const offscreenManager = OffscreenManager.getInstance();
