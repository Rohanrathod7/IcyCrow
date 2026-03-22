import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskQueue } from '../../src/lib/task-queue';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue({ maxDepth: 3, circuitBreakerThreshold: 2 });
    vi.clearAllMocks();
  });

  it('enqueues and returns position', () => {
    const res1 = queue.enqueue(async () => {});
    const res2 = queue.enqueue(async () => {});
    expect(res1.position).toBe(0);
    expect(res2.position).toBe(1);
    expect(res1.taskId).toBeDefined();
  });

  it('rejects if queue is full', () => {
    queue.enqueue(async () => {});
    queue.enqueue(async () => {});
    queue.enqueue(async () => {});
    expect(() => queue.enqueue(async () => {})).toThrow('QUEUE_FULL');
  });

  it('processes tasks in FIFO order', async () => {
    const order: number[] = [];
    const t1 = async () => { order.push(1); };
    const t2 = async () => { order.push(2); };
    
    queue.enqueue(t1);
    queue.enqueue(t2);
    
    await queue.processNext();
    await queue.processNext();
    
    expect(order).toEqual([1, 2]);
  });

  it('opens circuit breaker after threshold failures', async () => {
    const failingTask = async () => { throw new Error('fail'); };
    
    queue.enqueue(failingTask);
    await queue.processNext(); // failure 1
    expect(queue.isOpen).toBe(false);
    
    queue.enqueue(failingTask);
    await queue.processNext(); // failure 2 -> opens
    expect(queue.isOpen).toBe(true);
  });

  it('resets failures on success', async () => {
    const failingTask = async () => { throw new Error('fail'); };
    const successTask = async () => { return 'ok'; };
    
    queue.enqueue(failingTask);
    await queue.processNext();
    
    queue.enqueue(successTask);
    await queue.processNext();
    
    expect(queue.consecutiveFailures).toBe(0);
  });
});
