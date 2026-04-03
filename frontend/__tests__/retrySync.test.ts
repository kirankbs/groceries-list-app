import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueue } from '../services/syncQueue';

// Tests the retry-sync callback logic from index.tsx in isolation —
// no component mounting needed since the sequence is plain async functions.

const QUEUE_KEY = 'sync:queue';

beforeEach(() => {
  jest.clearAllMocks();
  const store = (AsyncStorage as any)._store;
  Object.keys(store).forEach((k) => delete store[k]);
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Mirrors the handleRetrySync body in index.tsx so we can test the
// sequence and outcomes without mounting the full component tree.
async function runRetry(
  token: string,
  fetchItems: () => Promise<void>,
  refreshPendingCount: () => Promise<void>,
): Promise<{ failed: number }> {
  const { failed } = await syncQueue.flush(token);
  await refreshPendingCount();
  await fetchItems();
  return { failed };
}

describe('handleRetrySync logic', () => {
  it('flushes the queue and calls fetchItems on success', async () => {
    await syncQueue.enqueue('item-1', true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const fetchItems = jest.fn().mockResolvedValue(undefined);
    const refreshPendingCount = jest.fn().mockResolvedValue(undefined);

    const result = await runRetry('tok', fetchItems, refreshPendingCount);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(refreshPendingCount).toHaveBeenCalledTimes(1);
    expect(fetchItems).toHaveBeenCalledTimes(1);
    expect(result.failed).toBe(0);
    expect(await syncQueue.count()).toBe(0);
  });

  it('reports failed count and still calls fetchItems when some entries fail', async () => {
    await syncQueue.enqueue('item-ok', true);
    await syncQueue.enqueue('item-fail', false);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const fetchItems = jest.fn().mockResolvedValue(undefined);
    const refreshPendingCount = jest.fn().mockResolvedValue(undefined);

    const result = await runRetry('tok', fetchItems, refreshPendingCount);

    expect(result.failed).toBe(1);
    // fetchItems must still run so the UI reflects whatever the server has
    expect(fetchItems).toHaveBeenCalledTimes(1);
    // The failed entry stays in the queue
    expect(await syncQueue.count()).toBe(1);
  });

  it('returns failed count of 0 when the queue is already empty', async () => {
    const fetchItems = jest.fn().mockResolvedValue(undefined);
    const refreshPendingCount = jest.fn().mockResolvedValue(undefined);

    const result = await runRetry('tok', fetchItems, refreshPendingCount);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.failed).toBe(0);
    expect(fetchItems).toHaveBeenCalledTimes(1);
  });
});
