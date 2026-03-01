# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A collaborative grocery list app (Expo React Native frontend + FastAPI Python backend + MongoDB). Users authenticate via Google OAuth through Emergent Auth, and can manage multiple households (called "workspaces" in code, "Households" in the UI), each with multiple shopping lists and custom categories.

## Commands

### Backend
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run the backend server
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Run backend tests (requires running backend + MongoDB)
python backend_test.py

# Lint
cd backend && flake8 server.py
cd backend && black server.py
cd backend && isort server.py
```

### Frontend
```bash
# Install dependencies
cd frontend && yarn install

# Start dev server (choose platform interactively)
cd frontend && yarn start

# Run on specific platform
cd frontend && yarn android
cd frontend && yarn ios
cd frontend && yarn web

# Lint
cd frontend && yarn lint
```

## Architecture

### Project Structure
```
/
├── backend/
│   ├── server.py        # All backend logic (single file: models, routes, helpers)
│   ├── requirements.txt
│   └── .env             # MONGO_URL, DB_NAME
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx  # Root layout: wraps with SafeAreaProvider + AuthProvider
│   │   └── index.tsx    # Entire app UI (~1800 lines, single screen with modals)
│   ├── contexts/
│   │   └── AuthContext.tsx  # All auth + workspace + list state and API calls
│   └── .env             # EXPO_PUBLIC_BACKEND_URL
├── backend_test.py      # Integration tests (root level, not in backend/)
└── memory/PRD.md        # Detailed product requirements document
```

### Backend (FastAPI + MongoDB)
`backend/server.py` is a single-file FastAPI app with all models, helpers, and routes. The API router is mounted at `/api`. All endpoints require `Authorization: Bearer <token>` except `/api/auth/session`.

**Auth flow:** The frontend opens Emergent Auth (`https://auth.emergentagent.com/`), which redirects back with a `session_id` in the URL hash. The frontend posts this to `POST /api/auth/session` (with `X-Session-ID` header), which exchanges it with Emergent's backend, upserts the user in MongoDB, and returns a session token stored for 7 days.

**Key backend patterns:**
- `require_auth(request)` — dependency that validates Bearer token and returns `User`
- `verify_workspace_access(user, workspace_id)` — checks user is in `member_ids`
- `verify_list_access(user, list_id)` — checks list exists and user can access its workspace
- `update_list_status(list_id)` — auto-updates list to active/in_progress/completed based on item checked state; called after every item create/update/delete

**MongoDB collections:** `users`, `user_sessions`, `workspaces`, `shopping_lists`, `grocery_items`, `categories` — all in `test_database`.

Every new workspace gets 10 default categories initialized via `initialize_workspace_categories()`. When a category is deleted, items move to "Other". When a category is renamed, all items in that workspace's lists are updated.

### Frontend (Expo React Native + expo-router)
Uses file-based routing but effectively has a single route (`app/index.tsx`). The entire authenticated UI is one large component with ~15 modals managed via `useState` booleans.

**AuthContext** (`contexts/AuthContext.tsx`) is the central state container holding:
- `user`, `workspaces`, `currentWorkspace`, `currentList`, `lists`, `templates`, `sessionToken`
- All workspace and list CRUD functions that call the backend
- Token persistence: `expo-secure-store` on mobile, `localStorage` on web

When `setCurrentWorkspace` is called, it immediately fetches lists and templates for the new workspace and auto-selects the first non-completed list.

**Token storage pattern:** All API calls use `sessionToken` from context as `Authorization: Bearer <token>`. The token is stored on first login and restored from secure storage on app init.

**TypeScript path alias:** `@/*` maps to `./` within the `frontend/` directory (e.g., `@/contexts/AuthContext`).

**Safe area handling:** The app uses `useSafeAreaInsets` with a fallback to `StatusBar.currentHeight` on Android for correct header positioning on all devices.

## Environment Variables

### Backend (`backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
```

### Frontend (`frontend/.env`)
```
EXPO_PUBLIC_BACKEND_URL=<backend-url>
```

## Key Terminology

- **Workspace** (in code) = **Household** (in UI) — the top-level grouping for shared lists
- Personal households are type `"personal"` and cannot be deleted or joined via invite code
- Shared households have an 8-char `invite_code` and can be joined/left

## Testing Notes

`backend_test.py` bypasses Emergent Auth by directly inserting a test user + session token into MongoDB, then runs HTTP requests against the running backend. The `BACKEND_URL` is hardcoded to a preview URL — update it to your local backend URL before running locally.