import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineCache } from '../services/offlineCache';
import type { ShoppingList, GroceryItem } from '../components/types';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const mockLists: ShoppingList[] = [
  {
    list_id: 'list-1',
    workspace_id: 'ws-1',
    name: 'Weekly Shop',
    status: 'active',
    is_template: false,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockItems: GroceryItem[] = [
  {
    id: 'item-1',
    list_id: 'list-1',
    name: 'Milk',
    quantity: 2,
    unit: 'L',
    category: 'Dairy',
    checked: false,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the in-memory store
  const store = (AsyncStorage as any)._store;
  Object.keys(store).forEach((k) => delete store[k]);
});

describe('offlineCache.setLists / getLists', () => {
  it('stores and retrieves lists with a timestamp', async () => {
    const before = Date.now();
    await offlineCache.setLists('ws-1', mockLists);
    const result = await offlineCache.getLists('ws-1');

    expect(result).not.toBeNull();
    expect(result!.data).toEqual(mockLists);
    expect(result!.ts).toBeGreaterThanOrEqual(before);
    expect(result!.ts).toBeLessThanOrEqual(Date.now());
  });

  it('uses the correct storage key for lists', async () => {
    await offlineCache.setLists('ws-abc', mockLists);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'cache:workspace:ws-abc:lists',
      expect.any(String)
    );
  });

  it('returns null when no lists are stored', async () => {
    const result = await offlineCache.getLists('ws-nonexistent');
    expect(result).toBeNull();
  });

  it('returns null on AsyncStorage read error', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage failure'));
    const result = await offlineCache.getLists('ws-1');
    expect(result).toBeNull();
  });
});

describe('offlineCache.setItems / getItems', () => {
  it('stores and retrieves items with a timestamp', async () => {
    const before = Date.now();
    await offlineCache.setItems('list-1', mockItems);
    const result = await offlineCache.getItems('list-1');

    expect(result).not.toBeNull();
    expect(result!.data).toEqual(mockItems);
    expect(result!.ts).toBeGreaterThanOrEqual(before);
    expect(result!.ts).toBeLessThanOrEqual(Date.now());
  });

  it('uses the correct storage key for items', async () => {
    await offlineCache.setItems('list-xyz', mockItems);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'cache:list:list-xyz:items',
      expect.any(String)
    );
  });

  it('returns null when no items are stored', async () => {
    const result = await offlineCache.getItems('list-nonexistent');
    expect(result).toBeNull();
  });
});
