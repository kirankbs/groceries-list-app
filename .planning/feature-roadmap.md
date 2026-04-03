# Living Pantry — Feature Roadmap

> Last updated: 2026-04-03 (session 3)
> Maintained by: feature-strategist agent

## Coverage Dashboard

| Area | Spec | Code | backend_test | Jest | Maestro | Notes |
|------|------|------|-------------|------|---------|-------|
| Auth (register/login/session/logout/reset) | Full | Complete | ~8 tests | — | — | Forgot password added recently |
| Workspaces (CRUD/invite/leave/currency) | Full | Complete | ~12 tests | — | — | |
| Shopping Lists (CRUD/complete/templates) | Full | Complete | ~6 tests | — | — | |
| Items (CRUD/check/bulk/categories) | Full | Complete | ~8 tests | — | — | |
| Categories (CRUD/reorder/defaults) | Full | Complete | ~8 tests | — | — | |
| Receipt OCR | Full | Complete | 4 tests | — | — | upload, poll, list, confirm |
| Offline sync | Partial | Complete | — | 28 tests | 2 flows | Replay failure recovery not spec'd |
| Pantry | Full | Complete | ~4 tests | — | — | Recently refactored screen |
| Dark mode | Full | Complete | — | — | — | No audit done |
| Settings | Full | Complete | ~2 tests | — | — | |

## Priority Backlog

### P0 — Must Fix
1. ~~**[Receipt OCR]** Zero backend integration test coverage~~ — Done (PR #14)
2. ~~**[Security]** OTP flow audit~~ — Done (session 3): TOCTOU race fixed, atomic lockout, field validation, TTL index. Branch: `fix-otp-toctou-security`
3. ~~**[Bugs]** Receipt review blank item names (`item_name`→`name`)~~ — Done (session 3). Branch: `fix-receipt-currency-bugs`
4. ~~**[Bugs]** PantryScreen hardcoded `$` symbol~~ — Done (session 3). Branch: `fix-receipt-currency-bugs`

### P1 — High Value
5. ~~**[Dark Mode]** 12 blocking violations~~ — Done (session 3): all `PALETTE.error/rust/primary` replaced with `theme.error`/`theme.primary` across 14 files. Branch: `fix-dark-mode-theme`
6. **[Offline]** Sync queue replay failure recovery is not spec'd in `docs/spec/offline.md` — what happens when a queued mutation fails permanently?

### P2 — Nice to Have
7. **[Testing]** Maestro flows don't cover household invite/join flow — core sharing feature has no E2E coverage
8. **[Testing]** No test for workspace currency setting
9. **[UX]** Modal empty states not audited — 14+ modals, some may be missing empty state handling
10. **[Auth]** No rate limiting on `/api/auth/login` and `/api/auth/register` endpoints (C4-b advisory)

## Architecture Notes

- `backend/server.py` is ~52KB — adding significant new features (e.g., notifications, barcode scan) should consider splitting the file
- `frontend/app/index.tsx` manages all modal state — 14+ modals. Further refactoring to move modal state into individual screens would reduce complexity
- Offline sync only covers checkbox toggles — any new offline-capable mutation needs explicit sync queue support

## Session History

| Date | What was built | Impact |
|------|---------------|--------|
| 2026-04-03 | Agent-oriented setup: 6 agents + deep-work skill + planning directory | Infrastructure |
| 2026-04-03 | Session 1: CategoryModal URL fix, currency mismatch fix, theme persistence, 5 new tests | Bug fixes + coverage |
| 2026-04-03 | Session 2: Receipt OCR — 4 integration tests covering all endpoints | P0 coverage |
| 2026-04-03 | Session 3: Security audit (TOCTOU OTP fix + 4 hardening changes + 2 tests), 2 real bugs fixed (receipt item names, pantry currency), 12-violation dark mode refactor (in progress) | Security + bug fixes |
