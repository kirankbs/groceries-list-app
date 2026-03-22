import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GroceryItem, ShoppingList } from '../components/types';

type CacheEntry<T> = { data: T; ts: number };

function listKey(workspaceId: string) {
  return `cache:workspace:${workspaceId}:lists`;
}

function itemsKey(listId: string) {
  return `cache:list:${listId}:items`;
}

async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeEntry<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Storage failure is non-fatal
  }
}

export const offlineCache = {
  setLists: (workspaceId: string, lists: ShoppingList[]) =>
    writeEntry(listKey(workspaceId), lists),

  getLists: (workspaceId: string): Promise<CacheEntry<ShoppingList[]> | null> =>
    readEntry(listKey(workspaceId)),

  setItems: (listId: string, items: GroceryItem[]) =>
    writeEntry(itemsKey(listId), items),

  getItems: (listId: string): Promise<CacheEntry<GroceryItem[]> | null> =>
    readEntry(itemsKey(listId)),
};
