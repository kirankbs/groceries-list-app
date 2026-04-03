# Offline & Sync

## Offline Cache (`services/offlineCache.ts`)
AsyncStorage wrapper. Caches lists + items keyed by workspace/list ID. No TTL — persists until overwritten. Used to render stale data while network request is in-flight.

## Sync Queue (`services/syncQueue.ts`)
Persists pending item mutations (checkbox toggles) when offline. On reconnect, drains queue by replaying PUT /api/items/{id} calls in FIFO order. Prevents lost check-offs during brief connectivity gaps.

**Key behaviors:**
- **Deduplication:** `enqueue(itemId, checked)` replaces any previous entry for the same `itemId` — only the latest toggle matters.
- **Flush logic:** Processes entries chronologically. 200/404 → remove from queue. 401 → clear entire queue and stop (session expired). 5xx/network error → leave in queue for retry. Re-reads live queue before writing to avoid losing concurrent enqueues.
- **Clear:** Called on logout to wipe any pending mutations.

## Failure Recovery

When `syncQueue.flush()` completes after reconnect, some entries may have failed (5xx or network error) while others succeeded.

**Behavior:**
- If `failed > 0`, the app shows an error banner: `"X items failed to sync. Pull to retry."` The banner uses the same amber warning color as the offline indicator (`#795c00`).
- Failed entries remain in the queue — no explicit retention logic needed, `flush()` already handles this.
- On the next offline→online transition, the same entries are retried automatically (the `wasOffline` effect fires again and calls `flush()` unconditionally).
- If `failed === 0`, behavior is unchanged: banner disappears and the list refreshes silently.

The `syncFailedCount` state in `index.tsx` drives this. It is set to `failed` after each flush and cleared when the user goes offline again (so a fresh reconnect starts clean).

## Network Status Hook (`hooks/useNetworkStatus.ts`)
NetInfo wrapper. Exposes `isOnline: boolean` and `wasOffline: boolean`.
- `isOnline`: `isConnected === true && isInternetReachable !== false` (captive portal aware)
- `wasOffline`: one-render-cycle flag — set `true` only on offline→online transition, resets to `false` on any subsequent event
- Used by `index.tsx` to show offline/syncing banner and trigger sync queue drain

## Maestro E2E Coverage
- Login flow
- Add item flow
- Offline item check (check item while offline, verify optimistic state)
- Reconnect sync (go back online, verify item state persisted to server)
