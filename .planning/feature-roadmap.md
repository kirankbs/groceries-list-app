# Living Pantry — Feature Roadmap

> Last updated: 2026-04-03
> Maintained by: feature-strategist agent

## Coverage Dashboard

| Area | Spec | Code | backend_test | Jest | Maestro | Notes |
|------|------|------|-------------|------|---------|-------|
| Auth (register/login/session/logout/reset) | Full | Complete | ~8 tests | — | — | Forgot password added recently |
| Workspaces (CRUD/invite/leave/currency) | Full | Complete | ~12 tests | — | — | |
| Shopping Lists (CRUD/complete/templates) | Full | Complete | ~6 tests | — | — | |
| Items (CRUD/check/bulk/categories) | Full | Complete | ~8 tests | — | — | |
| Categories (CRUD/reorder/defaults) | Full | Complete | ~8 tests | — | — | |
| Receipt OCR | Full | Complete | ~0 tests | — | — | No integration test coverage |
| Offline sync | Partial | Complete | — | 28 tests | 2 flows | Replay failure recovery not spec'd |
| Pantry | Full | Complete | ~4 tests | — | — | Recently refactored screen |
| Dark mode | Full | Complete | — | — | — | No audit done |
| Settings | Full | Complete | ~2 tests | — | — | |

## Priority Backlog

### P0 — Must Fix
1. **[Receipt OCR]** Zero backend integration test coverage for `/api/receipt/upload` and `/api/receipt/confirm` — any regression goes undetected
2. **[Security]** No security audit has been run since password reset / forgot-password flow was added — OTP flow needs review

### P1 — High Value
3. **[Offline]** Sync queue replay failure recovery is not spec'd in `docs/spec/offline.md` — what happens when a queued mutation fails permanently?
4. **[Dark Mode]** No dark mode audit has been done since the screen refactor — possible hardcoded colors in new screen components
5. **[Spec]** Recent spec update (PR #11) added content to ui-specs, design-system, offline — verify code matches the updated specs

### P2 — Nice to Have
6. **[Testing]** Maestro flows don't cover household invite/join flow — core sharing feature has no E2E coverage
7. **[Testing]** No test for workspace currency setting
8. **[UX]** Modal empty states not audited — 14+ modals, some may be missing empty state handling

## Architecture Notes

- `backend/server.py` is ~52KB — adding significant new features (e.g., notifications, barcode scan) should consider splitting the file
- `frontend/app/index.tsx` manages all modal state — 14+ modals. Further refactoring to move modal state into individual screens would reduce complexity
- Offline sync only covers checkbox toggles — any new offline-capable mutation needs explicit sync queue support

## Session History

| Date | What was built | Impact |
|------|---------------|--------|
| 2026-04-03 | Agent-oriented setup: 6 agents + deep-work skill + planning directory | Infrastructure |
