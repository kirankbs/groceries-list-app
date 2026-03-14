import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const OFFLINE_QUEUE_KEY = 'offline_queue';
const OFFLINE_CACHE_PREFIX = 'offline_cache_';

// ==================== Types ====================

export interface OfflineAction {
  id: string;
  type: 'create_item' | 'update_item' | 'delete_item' | 'toggle_item';
  payload: any;
  timestamp: number;
}

interface CacheData {
  items: { [listId: string]: any[] };
  categories: { [workspaceId: string]: any[] };
  lists: { [workspaceId: string]: any[] };
}

// ==================== Storage Helpers ====================

// Small data (queue): use SecureStore on native, localStorage on web
async function getSmallStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

async function setSmallStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

// Large data (cache): use localStorage on web, in-memory only on native
// SecureStore has a 2KB limit per key which is too small for cached data
function getCacheItem(key: string): string | null {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return null; // Native: in-memory only (handled by ref)
}

function setCacheItem(key: string, value: string): void {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* quota exceeded, ignore */ }
  }
}

// ==================== Network Detection ====================

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnectivity = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    checkConnectivity();

    // Check every 30 seconds
    checkInterval.current = setInterval(checkConnectivity, 30000);

    // Listen for app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkConnectivity();
      }
    });

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
      subscription.remove();
    };
  }, [checkConnectivity]);

  return { isOnline, checkConnectivity };
}

// ==================== Offline Queue ====================

export function useOfflineQueue(sessionToken: string | null) {
  const [queue, setQueue] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await getSmallStorageItem(OFFLINE_QUEUE_KEY);
        if (stored) setQueue(JSON.parse(stored));
      } catch { /* ignore */ }
    })();
  }, []);

  // Persist queue on change
  useEffect(() => {
    (async () => {
      try {
        await setSmallStorageItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch { /* ignore */ }
    })();
  }, [queue]);

  const enqueue = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const entry: OfflineAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    setQueue(prev => [...prev, entry]);
    return entry;
  }, []);

  const processQueue = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!sessionToken || queue.length === 0) return { success: 0, failed: 0 };

    setIsSyncing(true);
    let success = 0;
    let failed = 0;
    const remaining: OfflineAction[] = [];

    for (const action of queue) {
      try {
        let url = '';
        let method = 'POST';
        let body: any = null;

        switch (action.type) {
          case 'create_item':
            url = `${EXPO_PUBLIC_BACKEND_URL}/api/items`;
            body = action.payload;
            break;
          case 'update_item':
          case 'toggle_item':
            url = `${EXPO_PUBLIC_BACKEND_URL}/api/items/${action.payload.id}`;
            method = 'PUT';
            body = action.payload.data;
            break;
          case 'delete_item':
            url = `${EXPO_PUBLIC_BACKEND_URL}/api/items/${action.payload.id}`;
            method = 'DELETE';
            break;
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });

        if (res.ok) {
          success++;
        } else {
          // 404 means item was already deleted, skip
          if (res.status === 404) {
            success++;
          } else {
            failed++;
            remaining.push(action);
          }
        }
      } catch {
        failed++;
        remaining.push(action);
      }
    }

    setQueue(remaining);
    setIsSyncing(false);
    return { success, failed };
  }, [sessionToken, queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return { queue, enqueue, processQueue, clearQueue, isSyncing, pendingCount: queue.length };
}

// ==================== Offline Cache ====================

export function useOfflineCache() {
  // In-memory cache (works on all platforms)
  const cacheRef = useRef<CacheData>({ items: {}, categories: {}, lists: {} });

  // Load from localStorage on web
  const loadFromStorage = useCallback((type: string, id: string): any[] | null => {
    const stored = getCacheItem(`${OFFLINE_CACHE_PREFIX}${type}_${id}`);
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  }, []);

  const saveToStorage = useCallback((type: string, id: string, data: any[]) => {
    setCacheItem(`${OFFLINE_CACHE_PREFIX}${type}_${id}`, JSON.stringify(data));
  }, []);

  const cacheItems = useCallback((listId: string, items: any[]) => {
    cacheRef.current.items[listId] = items;
    saveToStorage('items', listId, items);
  }, [saveToStorage]);

  const cacheCategories = useCallback((workspaceId: string, categories: any[]) => {
    cacheRef.current.categories[workspaceId] = categories;
    saveToStorage('categories', workspaceId, categories);
  }, [saveToStorage]);

  const cacheLists = useCallback((workspaceId: string, lists: any[]) => {
    cacheRef.current.lists[workspaceId] = lists;
    saveToStorage('lists', workspaceId, lists);
  }, [saveToStorage]);

  const getCachedItems = useCallback((listId: string) => {
    return cacheRef.current.items[listId] || loadFromStorage('items', listId);
  }, [loadFromStorage]);

  const getCachedCategories = useCallback((workspaceId: string) => {
    return cacheRef.current.categories[workspaceId] || loadFromStorage('categories', workspaceId);
  }, [loadFromStorage]);

  const getCachedLists = useCallback((workspaceId: string) => {
    return cacheRef.current.lists[workspaceId] || loadFromStorage('lists', workspaceId);
  }, [loadFromStorage]);

  return {
    cacheItems, cacheCategories, cacheLists,
    getCachedItems, getCachedCategories, getCachedLists,
  };
}

// ==================== WebSocket Hook ====================

export function useWorkspaceWebSocket(
  workspaceId: string | null,
  sessionToken: string | null,
  isOnline: boolean,
  onEvent: (event: any) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const cleanup = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!workspaceId || !sessionToken || !isOnline) return;
    cleanup();

    const backendUrl = EXPO_PUBLIC_BACKEND_URL.replace(/^http/, 'ws');
    const url = `${backendUrl}/ws/${workspaceId}?token=${sessionToken}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Send ping every 25 seconds to keep alive
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const parsed = JSON.parse(event.data);
          onEvent(parsed);
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingInterval.current) clearInterval(pingInterval.current);
        // Reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, [workspaceId, sessionToken, isOnline, onEvent, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { isConnected };
}
