import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueue } from '../services/syncQueue';

const QUEUE_KEY = 'sync:queue';

// Helper to read the raw queue from the mock store
function readRawQueue() {
  const store = (AsyncStorage as any)._store;
  const raw = store[QUEUE_KEY];
  return raw ? JSON.parse(raw) : [];
}

// Helper to write a raw queue into the mock store
function writeRawQueue(entries: any[]) {
  const store = (AsyncStorage as any)._store;
  store[QUEUE_KEY] = JSON.stringify(entries);
}

beforeEach(() => {
  jest.clearAllMocks();
  const store = (AsyncStorage as any)._store;
  Object.keys(store).forEach((k) => delete store[k]);
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('syncQueue.enqueue', () => {
  it('adds an entry to the queue', async () => {
    await syncQueue.enqueue('item-1', true);
    const queue = readRawQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ itemId: 'item-1', checked: true });
  });

  it('deduplicates by itemId — second enqueue replaces the first', async () => {
    await syncQueue.enqueue('item-1', true);
    await syncQueue.enqueue('item-1', false);
    const queue = readRawQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ itemId: 'item-1', checked: false });
  });

  it('keeps distinct entries for different itemIds', async () => {
    await syncQueue.enqueue('item-1', true);
    await syncQueue.enqueue('item-2', false);
    const queue = readRawQueue();
    expect(queue).toHaveLength(2);
  });
});

describe('syncQueue.count', () => {
  it('returns 0 for an empty queue', async () => {
    expect(await syncQueue.count()).toBe(0);
  });

  it('returns the correct queue length', async () => {
    await syncQueue.enqueue('item-1', true);
    await syncQueue.enqueue('item-2', false);
    expect(await syncQueue.count()).toBe(2);
  });
});

describe('syncQueue.flush', () => {
  const mockFetch = (status: number, ok: boolean) =>
    Promise.resolve({ ok, status } as Response);

  it('calls PUT for each queued entry with correct URL and body', async () => {
    await syncQueue.enqueue('item-1', true);
    await syncQueue.enqueue('item-2', false);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await syncQueue.flush('token-abc');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/items/item-1'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-abc',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ checked: true }),
      })
    );
  });

  it('removes successfully synced entries from the queue', async () => {
    await syncQueue.enqueue('item-1', true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const result = await syncQueue.flush('token-abc');

    expect(result).toEqual({ succeeded: 1, failed: 0 });
    expect(await syncQueue.count()).toBe(0);
  });

  it('silently discards 404 responses and removes them from queue', async () => {
    await syncQueue.enqueue('item-gone', true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    const result = await syncQueue.flush('token-abc');

    expect(result.succeeded).toBe(1);
    expect(await syncQueue.count()).toBe(0);
  });

  it('keeps failed entries (5xx) in queue', async () => {
    await syncQueue.enqueue('item-1', true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const result = await syncQueue.flush('token-abc');

    expect(result.failed).toBe(1);
    expect(await syncQueue.count()).toBe(1);
  });

  it('keeps entries in queue on network error', async () => {
    await syncQueue.enqueue('item-1', true);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await syncQueue.flush('token-abc');

    expect(result.failed).toBe(1);
    expect(await syncQueue.count()).toBe(1);
  });

  it('on 401: clears entire queue and returns immediately', async () => {
    await syncQueue.enqueue('item-1', true);
    await syncQueue.enqueue('item-2', false);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValue({ ok: true, status: 200 });

    const result = await syncQueue.flush('expired-token');

    // Called only once — stopped after 401
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(await syncQueue.count()).toBe(0);
    // succeeded = 0 (nothing committed), failed = remaining queue length
    expect(result.failed).toBeGreaterThan(0);
  });

  it('re-reads live queue before writing to avoid losing concurrent enqueues', async () => {
    await syncQueue.enqueue('item-1', true);

    (global.fetch as jest.Mock).mockImplementation(async () => {
      // Simulate a concurrent enqueue happening during the flush
      await syncQueue.enqueue('item-concurrent', false);
      return { ok: true, status: 200 };
    });

    await syncQueue.flush('token-abc');

    // item-1 should be gone (flushed), but item-concurrent must survive
    const queue = readRawQueue();
    expect(queue.find((e: any) => e.itemId === 'item-1')).toBeUndefined();
    expect(queue.find((e: any) => e.itemId === 'item-concurrent')).toBeDefined();
  });

  it('returns { succeeded: 0, failed: 0 } when queue is empty', async () => {
    const result = await syncQueue.flush('token-abc');
    expect(result).toEqual({ succeeded: 0, failed: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('syncQueue.clear', () => {
  it('removes all queue entries', async () => {
    await syncQueue.enqueue('item-1', true);
    await syncQueue.enqueue('item-2', false);
    expect(await syncQueue.count()).toBe(2);

    await syncQueue.clear();

    expect(await syncQueue.count()).toBe(0);
  });
});
