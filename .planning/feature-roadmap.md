# Living Pantry — Feature Roadmap

> Last updated: 2026-04-03 (session 5)
> Maintained by: feature-strategist agent

## Coverage Dashboard

| Area | Spec | Code | backend_test | Jest | Maestro | Notes |
|------|------|------|-------------|------|---------|-------|
| Auth (register/login/session/logout/reset) | Full | Complete | ~8 tests | — | 1 flow | Rate limiting on login+register added session 5 |
| Workspaces (CRUD/invite/leave/currency) | Full | Complete | ~12 tests | — | 2 flows | DELETE /workspaces/{id} has no backend_test coverage |
| Shopping Lists (CRUD/complete/templates) | Full | Complete | ~6 tests | — | — | auto-status (update_list_status) has no direct backend_test assertion |
| Items (CRUD/check/bulk/categories) | Full | Complete | ~8 tests | — | 2 flows | |
| Categories (CRUD/reorder/defaults) | Full | Complete | ~8 tests + pytest suite | — | — | |
| Receipt OCR | Full | Complete | 4 tests | — | — | |
| Offline sync | Full | Complete | — | 28 tests | 2 flows | "Pull to retry" banner exists but no RefreshControl wired — user instruction is a lie |
| Pantry | Full | Complete | ~4 tests | — | — | |
| Dark mode | Full | Complete | — | — | — | Session 3 violations fixed |
| Settings | Full | Complete | ~2 tests | — | — | Notifications/Privacy/Help rows are stubs (no-op taps) |

## Priority Backlog

### P0 — Must Fix

1. **[Offline]** "Pull to retry" banner is broken — the sync failure error banner tells users `"N items failed to sync. Pull to retry."` but there is no `RefreshControl` on the `SectionList` in `PantryScreen.tsx` and no `onRefresh` prop. When a user follows the instruction and pulls down, nothing happens. The queue is never retried. This is a lie the UI is telling users during their worst moment (partial data loss scenario). Fix: wire `RefreshControl` on the `SectionList` that calls `flush()` + `fetchItems()` when `syncFailedCount > 0`, or change the label to something that doesn't promise an interaction that doesn't exist.

### P1 — High Value

2. **[Testing]** `DELETE /api/workspaces/{id}` has zero backend integration test coverage — this is the cascade-delete endpoint (items → lists → categories → workspace). The cascade logic exists in the code and the leave-workspace path is tested, but the explicit owner-initiated delete path is untested. If a regression breaks the cascade, it would silently leave orphaned items/lists in MongoDB with no test to catch it.

3. **[Testing]** `update_list_status` business logic has no direct assertion in backend_test — the auto-status transitions (active → in_progress → completed) are core to the product experience (auto-completing a list when all items are checked is a key UX moment). The item create/update/delete tests run through this code path but never assert the resulting list status. A regression here would be silent.

### P2 — Nice to Have

4. **[UX]** Settings stub rows (Notifications, Privacy & Security, Help & Support) are tappable but do nothing — users in the App Store will tap these and get no feedback. Not a bug, but a trust-eroding dead end. Either add a "coming soon" toast or remove the chevron to signal they're not interactive.

5. **[Testing]** `update_list_status` auto-completion not covered in Maestro — the check-off-all-items → list auto-completes flow is never exercised in E2E. The reconnect_sync Maestro flow checks one item but never checks all items and asserts the list status badge changes to "Completed".

6. **[UX]** Modal empty states not audited — 14+ modals. ListsModal (no lists), HouseholdSwitcherModal (solo user), ReceiptScanModal (no matched items after OCR) — some of these are likely missing empty state handling. Low urgency but generates support noise.

## Architecture Notes

- `backend/server.py` is ~52KB — adding significant new features (e.g., notifications, barcode scan) should consider splitting the file
- `frontend/app/index.tsx` manages all modal state — 14+ modals. Further refactoring to move modal state into individual screens would reduce complexity
- Offline sync only covers checkbox toggles — any new offline-capable mutation needs explicit sync queue support
- The "Pull to retry" gap is a behavioral contract violation: the spec in `docs/spec/offline.md` defines the failure recovery UX correctly, but the implementation omits the gesture handler. The spec and the code are now out of sync in the opposite direction from last session.

## Session History

| Date | What was built | Impact |
|------|---------------|--------|
| 2026-04-03 | Agent-oriented setup: 6 agents + deep-work skill + planning directory | Infrastructure |
| 2026-04-03 | Session 1: CategoryModal URL fix, currency mismatch fix, theme persistence, 5 new tests | Bug fixes + coverage |
| 2026-04-03 | Session 2: Receipt OCR — 4 integration tests covering all endpoints | P0 coverage |
| 2026-04-03 | Session 3: Security audit (TOCTOU OTP fix + 4 hardening changes + 2 tests), 2 real bugs fixed (receipt item names, pantry currency), 12-violation dark mode refactor across 14 files | Security + bug fixes |
| 2026-04-03 | Session 4: Feature strategy scan — identified offline sync failure gap as top P1 | Strategy |
| 2026-04-03 | Session 5: Cleared backlog (offline failure recovery banner, rate limiting, Maestro invite/join flows). Fresh scan revealed: "Pull to retry" promise with no gesture handler (P0), DELETE workspace untested (P1), update_list_status untested (P1) | Strategy |
