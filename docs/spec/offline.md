# Offline & Sync

## Offline Cache (`services/offlineCache.ts`)
AsyncStorage wrapper. Caches lists + items keyed by workspace/list ID. No TTL — persists until overwritten. Used to render stale data while network request is in-flight.

## Sync Queue (`services/syncQueue.ts`)
Persists pending item mutations (checkbox toggles) when offline. On reconnect, drains queue by replaying PUT /api/items/{id} calls in FIFO order. Prevents lost check-offs during brief connectivity gaps.

## Network Status Hook (`hooks/useNetworkStatus.ts`)
NetInfo wrapper. Exposes `isOnline: boolean` and `wasOffline: boolean` (true if connectivity was interrupted since last mount). Used to show "reconnecting" UI and trigger sync queue drain.

## Maestro E2E Coverage
- Login flow
- Add item flow
- Offline item check (check item while offline, verify optimistic state)
- Reconnect sync (go back online, verify item state persisted to server)
