# SPEC.md — The Living Pantry

**Purpose:** Spec-driven development index. Losing all source code and regenerating the entire app from these specs + Claude Code must produce a functionally and visually identical result.

**Stack:** Expo React Native (SDK 54) + FastAPI (Python 3.11+) + MongoDB (Motor async driver) + Anthropic Claude API + Resend email API.

---

## Spec Files

| File | Contents |
|---|---|
| [spec/overview.md](spec/overview.md) | Project overview, file map, key terminology, tech stack |
| [spec/environment.md](spec/environment.md) | All environment variables (backend + frontend) |
| [spec/auth.md](spec/auth.md) | Auth system, forgot-password OTP flow, session tokens, `require_auth` dependency |
| [spec/data-models.md](spec/data-models.md) | All 8 MongoDB collections with field definitions, indexes, and known issues |
| [spec/api.md](spec/api.md) | Full REST API reference — every endpoint, request/response shape |
| [spec/business-logic.md](spec/business-logic.md) | `update_list_status`, categories, workspace creation, OTP rules, receipt OCR |
| [spec/state.md](spec/state.md) | AuthContext (all state fields + methods) + ThemeContext |
| [spec/screens.md](spec/screens.md) | 4 main screens + 4 auth screens + 14 modals catalogue |
| [spec/design-system.md](spec/design-system.md) | Fonts, PALETTE tokens, dark mode tokens, Theme object, AVAILABLE_COLORS/ICONS, border radius scale |
| [spec/ui-specs.md](spec/ui-specs.md) | Per-screen UI specs from Stitch — exact layout, colors, elements, dark mode for all 13 screens |
| [spec/flows.md](spec/flows.md) | 11 key user flows (register, login, forgot-password, add item, etc.) |
| [spec/types.md](spec/types.md) | All TypeScript types (FontMap, Theme, Category, GroceryItem, Workspace, ShoppingList, TabName) |
| [spec/testing.md](spec/testing.md) | All 3 test layers (Jest, backend integration, Maestro E2E) + lint/run commands |
| [spec/offline.md](spec/offline.md) | offlineCache, syncQueue, useNetworkStatus hook, Maestro E2E coverage |
