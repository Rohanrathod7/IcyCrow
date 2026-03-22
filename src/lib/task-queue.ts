/**
 * FIFO Task Queue with Back-pressure and Circuit Breaker logic.
 */
export class TaskQueue {
  private queue: { taskId: string; fn: () => Promise<any> }[] = [];
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
    return { taskId, position: this.queue.length - 1 };
  }

  async processNext(): Promise<any> {
    const task = this.queue.shift();
    if (!task) return;

    try {
      const result = await task.fn();
      this.consecutiveFailures = 0;
      return result;
    } catch (err) {
      this.consecutiveFailures++;
      throw err;
    }
  }

  clear() {
    this.queue = [];
    this.consecutiveFailures = 0;
  }
}

export const taskQueue = new TaskQueue();
