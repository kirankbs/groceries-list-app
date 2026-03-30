# Overview — The Living Pantry

## Project Overview

App name: **The Living Pantry** (branded). Internal codebase name: groceries-list-app.
Collaborative household grocery list app. Solves: multi-person household shopping coordination with shared lists, real-time sync, category organization, receipt scanning with price extraction, and password reset via email OTP.
Stack: Expo React Native (SDK 54) + FastAPI (Python 3.11+) + MongoDB (Motor async driver) + Anthropic Claude API + Resend email API.
Key terminology: **Workspace** (code/DB) = **Household** (UI). Every model, API param, and DB field uses `workspace`; UI labels say "Household".
Auth: email/password, session token (7-day TTL), forgot-password OTP flow. No OAuth.
Platforms: iOS, Android, Web (expo-router file-based routing, single screen `app/index.tsx`).
Frontend state: React Context (AuthContext + ThemeContext). No Redux/Zustand.
Backend: single-file FastAPI app (`backend/server.py`). All models, routes, helpers in one file.
Receipt OCR: Claude Sonnet 4-6 vision via Anthropic SDK; runs as FastAPI BackgroundTask; polled by frontend.
Version string in UI: v2.4.0.

## Project File Map

```
/
├── backend/
│   ├── server.py              # Entire backend: models, helpers, all route handlers
│   ├── requirements.txt       # Python deps: fastapi, motor, bcrypt, anthropic, pydantic, requests, python-dotenv
│   ├── tests/
│   │   └── test_categories.py # Pytest unit tests for category CRUD (requires running backend + MongoDB)
│   └── .env                   # MONGO_URL, DB_NAME, ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM, ALLOWED_ORIGINS
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx        # Root layout: SafeAreaProvider + AuthProvider + ThemeProvider
│   │   └── index.tsx          # Entry: auth gate, font loading, tab switcher, root-level modals
│   ├── app/screens/
│   │   ├── PantryScreen.tsx   # Main grocery list view; hosts all item/household/list modals
│   │   ├── ListsScreen.tsx    # Browse/select shopping lists; create new list CTA
│   │   ├── CategoriesScreen.tsx # Category CRUD; uses CategoryModal
│   │   └── SettingsScreen.tsx # Appearance toggle, household settings, logout
│   ├── components/
│   │   ├── ThemeContext.tsx    # ColorMode state; derives Theme object from PALETTE
│   │   ├── constants.ts       # PALETTE, AVAILABLE_ICONS, AVAILABLE_COLORS, ITEM_UNITS, CURRENCY_SYMBOLS
│   │   ├── types.ts           # TypeScript types: GroceryItem, ShoppingList, Category, Workspace, Theme, FontMap, TabName
│   │   ├── BottomTabBar.tsx   # 4-tab nav: pantry | lists | categories | settings
│   │   └── sharedStyles.ts    # Shared StyleSheet for modals (overlay, content, header, buttons)
│   ├── components/modals/     # 14 modal components (see screens.md)
│   ├── contexts/
│   │   └── AuthContext.tsx    # All auth + workspace + list state and API calls
│   ├── services/
│   │   ├── offlineCache.ts    # AsyncStorage wrapper (lists + items cache)
│   │   └── syncQueue.ts       # Offline mutation queue (checkbox toggles)
│   ├── hooks/
│   │   └── useNetworkStatus.ts # NetInfo wrapper — isOnline, wasOffline
│   ├── __tests__/             # Jest unit tests: offlineCache, syncQueue, useNetworkStatus (28 tests)
│   ├── eas.json               # EAS Build profiles: development, preview, production
│   ├── app.json               # Expo config: name "Korbly", slug "korbly", bundle "com.kirankbs.korbly"
│   └── .env                   # EXPO_PUBLIC_BACKEND_URL
├── backend_test.py            # Integration test suite (root level); requires running backend + MongoDB
├── test.sh                    # Run all test layers in sequence
├── maestro/flows/             # E2E Maestro flows (login, add item, offline check, reconnect sync)
├── docs/
│   ├── SPEC.md                # Spec index — master table of contents
│   └── spec/                  # 14 spec files: overview, auth, api, data-models, etc.
└── .github/workflows/
    └── ci.yml                 # GitHub Actions: frontend Jest + backend integration on every PR
```
