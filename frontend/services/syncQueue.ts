import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'sync:queue';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export type SyncEntry = {
  id: string;
  itemId: string;
  checked: boolean;
  queuedAt: number;
};

async function readQueue(): Promise<SyncEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: SyncEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Non-fatal
  }
}

export const syncQueue = {
  async enqueue(itemId: string, checked: boolean): Promise<void> {
    const queue = await readQueue();
    // Deduplicate: keep only the latest state for each item
    const filtered = queue.filter(e => e.itemId !== itemId);
    filtered.push({ id: `${itemId}-${Date.now()}`, itemId, checked, queuedAt: Date.now() });
    await writeQueue(filtered);
  },

  async count(): Promise<number> {
    const queue = await readQueue();
    return queue.length;
  },

  // Flushes the queue in chronological order.
  // 404 responses are silently discarded (item deleted by another user).
  // Other server errors keep the entry in the queue.
  async flush(token: string): Promise<{ succeeded: number; failed: number }> {
    const queue = await readQueue();
    if (queue.length === 0) return { succeeded: 0, failed: 0 };

    const sorted = [...queue].sort((a, b) => a.queuedAt - b.queuedAt);
    let succeeded = 0;
    let failed = 0;
    const toRemove: string[] = [];

    for (const entry of sorted) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/items/${entry.itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ checked: entry.checked }),
        });
        if (res.ok || res.status === 404) {
          toRemove.push(entry.id);
          succeeded++;
        } else if (res.status === 401) {
          // Token expired or revoked — clear entire queue and stop. Caller must re-auth.
          await writeQueue([]);
          return { succeeded, failed: queue.length - succeeded };
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    if (toRemove.length > 0) {
      // Re-read live queue to avoid clobbering entries added during the flush
      const liveQueue = await readQueue();
      await writeQueue(liveQueue.filter(e => !toRemove.includes(e.id)));
    }

    return { succeeded, failed };
  },

  clear: () => AsyncStorage.removeItem(QUEUE_KEY),
};
