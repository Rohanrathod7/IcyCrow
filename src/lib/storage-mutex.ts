/**
 * A native Web Locks API based mutex to prevent concurrent async operations
 * from clobbering each other across contexts (Side Panel & Service Worker).
 */
export class StorageMutex {
  /**
   * Enqueues `task` to run only after all currently pending tasks for `key` complete.
   * This uses navigator.locks.request to provide cross-context synchronization.
   */
  async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    // If locks is not available (e.g. very old non-Chrome envs or specific security contexts), 
    // fallback to immediate execution to prevent stalling, though this should not happen in MV3.
    if (!navigator.locks) {
      console.warn(`[IcyCrow] Web Locks API not available for key: ${key}. Falling back to unsafe execution.`);
      return task();
    }

    return navigator.locks.request(key, async () => {
      return task();
    });
  }
}
