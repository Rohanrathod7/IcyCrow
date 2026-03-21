import { describe, it, expect } from 'vitest';
import { StorageMutex } from '@lib/storage-mutex';

describe('StorageMutex', () => {
  it('prevents concurrent writes to the same key from clobbering data', async () => {
    const mutex = new StorageMutex();
    let counter = 0;
    
    // Simulate an async read-modify-write operation
    const increment = async () => {
      return mutex.withLock('test-key', async () => {
        const current = counter;
        // Simulate async delay (e.g., storage.get)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
        counter = current + 1;
      });
    };

    // Fire 100 concurrent requests
    const promises = Array.from({ length: 100 }).map(() => increment());
    await Promise.all(promises);

    expect(counter).toBe(100);
  });

  it('allows concurrent tasks on different keys to run in parallel', async () => {
    const mutex = new StorageMutex();
    const order: number[] = [];

    const task1 = mutex.withLock('key1', async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      order.push(1);
    });

    const task2 = mutex.withLock('key2', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      order.push(2);
    });

    await Promise.all([task1, task2]);
    // Task 2 finishes first because it's on a different lock and shorter delay
    expect(order).toEqual([2, 1]);
  });
});
