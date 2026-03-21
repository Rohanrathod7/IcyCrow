/**
 * A Promise-chain based mutex to prevent concurrent async operations
 * from clobbering each other. Locks are maintained per string key.
 */
export class StorageMutex {
  private locks: Map<string, Promise<any>> = new Map();

  /**
   * Enqueues `task` to run only after all currently pending tasks for `key` complete.
   */
  async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previousTask = this.locks.get(key) || Promise.resolve();

    // Create the new chain
    const nextTask = (async () => {
      try {
        await previousTask;
      } catch {
        // We catch to ensure previous failures don't block the queue
      }
      return task();
    })();

    this.locks.set(key, nextTask);

    // Clean up to prevent memory leaks if queue becomes empty
    nextTask.finally(() => {
      if (this.locks.get(key) === nextTask) {
        this.locks.delete(key);
      }
    });

    return nextTask;
  }
}
