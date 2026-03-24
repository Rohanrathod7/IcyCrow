/**
 * FIFO Task Queue with Back-pressure and Circuit Breaker logic.
 */
export class TaskQueue {
  private queue: { taskId: string; fn: () => Promise<any> }[] = [];
  private isProcessing = false;
  public consecutiveFailures = 0;
  private maxDepth: number;
  private threshold: number;

  constructor(options: { maxDepth?: number; circuitBreakerThreshold?: number } = {}) {
    this.maxDepth = options.maxDepth || 20;
    this.threshold = options.circuitBreakerThreshold || 3;
  }

  get isOpen(): boolean {
    return this.consecutiveFailures >= this.threshold;
  }

  enqueue(fn: () => Promise<any>): { taskId: string; position: number } {
    if (this.queue.length >= this.maxDepth) {
      throw new Error('QUEUE_FULL');
    }

    const taskId = crypto.randomUUID();
    this.queue.push({ taskId, fn });
    
    // Auto-trigger processing if not already running
    if (!this.isProcessing) {
      this.processAll();
    }
    
    return { taskId, position: this.queue.length - 1 };
  }

  async processAll() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      if (this.isOpen) {
        console.warn('[IcyCrow] TaskQueue is CLOSED due to circuit breaker.');
        break;
      }
      await this.processNext().catch(err => {
        console.error('[IcyCrow] Task processing failed:', err);
      });
    }
    
    this.isProcessing = false;
  }

  async processNext(): Promise<any> {
    const task = this.queue.shift();
    if (!task) return;

    try {
      const result = await task.fn();
      await this.syncFailures(0);
      return result;
    } catch (err) {
      const current = await this.getFailures();
      await this.syncFailures(current + 1);
      throw err;
    }
  }

  private async getFailures(): Promise<number> {
    if (typeof chrome === 'undefined' || !chrome.storage) return this.consecutiveFailures;
    const result = await chrome.storage.session.get('consecutiveFailures') as { consecutiveFailures?: number };
    return result.consecutiveFailures || 0;
  }

  private async syncFailures(count: number) {
    this.consecutiveFailures = count;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.session.set({ consecutiveFailures: count });
    }
  }

  async clear() {
    this.queue = [];
    await this.syncFailures(0);
  }
}

export const taskQueue = new TaskQueue();
