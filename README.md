# Groceries List App

Collaborative grocery list app — Expo React Native frontend, FastAPI backend, MongoDB. Multiple households, shared lists, custom categories, and offline shopping mode.

---

## Stack

| Layer | Tech |
|---|---|
| Mobile | Expo React Native (expo-router) |
| Backend | FastAPI + MongoDB (single-file `backend/server.py`) |
| Auth | Email/password, bcrypt, 7-day session tokens |
| Offline | AsyncStorage cache + sync queue, NetInfo connectivity |

---

## Quick Start

**Backend**
```bash
pip install -r backend/requirements.txt
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend**
```bash
cd frontend && yarn install && yarn start
```

Environment files:
- `backend/.env` → `MONGO_URL`, `DB_NAME`
- `frontend/.env` → `EXPO_PUBLIC_BACKEND_URL`

---

## Testing

### Run everything
```bash
./test.sh
```

This runs all three layers in sequence. Backend and E2E layers require external services (see below).

---

### Layer 1 — Frontend Unit Tests (Jest)

Headless. No device or server needed. Runs on every PR via CI.

```bash
cd frontend && yarn test
```

**Coverage:**
- `offlineCache.ts` — AsyncStorage read/write, null on empty, error fallback
- `syncQueue.ts` — enqueue, deduplication, flush (success / 404 / 5xx / 401 / network error / concurrent enqueue safety), clear
- `useNetworkStatus.ts` — online/offline transitions, `wasOffline` one-cycle signal

28 tests across 3 suites (~1s).

---

### Layer 2 — Backend Integration Tests

Requires: backend running at `http://localhost:8001` + MongoDB.

```bash
# Terminal 1
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001

# Terminal 2
python backend_test.py
```

**Coverage:** auth, workspaces (create/join/leave/currency/invite-code), lists, items (CRUD), categories (CRUD), templates (save/use).

Runs on every PR via CI (MongoDB spun up as a service container).

---

### Layer 3 — E2E Tests (Maestro)

Requires: iOS simulator or Android emulator + app running via Expo Go.

**Install Maestro** (one-time):
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

**Run flows:**
```bash
# All flows
maestro test maestro/flows/

# Single flow
maestro test maestro/flows/login.yaml
```

**Flows:**
| Flow | What it tests |
|---|---|
| `login.yaml` | Sign in, land on Pantry tab |
| `add_item.yaml` | Add item, verify it appears in list |
| `check_item_offline.yaml` | Enable airplane mode, check item off, verify offline banner + pending count |
| `reconnect_sync.yaml` | Restore connectivity, verify sync banner and pending count clears |

> **Note:** The `appId` in each flow is set to `host.exp.Exponent` (Expo Go). Update it to your standalone bundle ID if running a production build.

---

### CI (GitHub Actions)

Every PR to `main` runs:
- **Frontend Tests** — Jest (ubuntu, ~30s)
- **Backend Tests** — pytest against live uvicorn + MongoDB service container (~90s)

Workflow: `.github/workflows/ci.yml`

Free tier: unlimited minutes for public repos, 2,000 min/month for private.

---

## Architecture

```
/
├── backend/
│   ├── server.py        # All routes, models, helpers (single file)
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx  # Root layout (SafeAreaProvider + AuthProvider)
│   │   └── index.tsx    # Entire app UI (~1800 lines, modal-based)
│   ├── contexts/
│   │   └── AuthContext.tsx  # All state: auth, workspaces, lists, offline status
│   ├── services/
│   │   ├── offlineCache.ts  # AsyncStorage wrapper (lists + items cache)
│   │   └── syncQueue.ts     # Offline mutation queue (checkbox toggles)
│   ├── hooks/
│   │   └── useNetworkStatus.ts  # NetInfo wrapper (isOnline, wasOffline)
│   └── __tests__/       # Jest unit tests
├── maestro/flows/       # Maestro E2E test flows
├── backend_test.py      # Backend integration tests
├── test.sh              # Run all test layers
└── .github/workflows/
    └── ci.yml           # GitHub Actions CI
```

### Offline mode data flow

```
ONLINE:   fetch → cache write → render
OFFLINE:  fetch fails → cache read → render stale data + banner
TOGGLE:   optimistic UI → syncQueue.enqueue()
RECONNECT: syncQueue.flush() → re-fetch → banner clears
```

Conflict strategy: last-write-wins on checkbox state. 404 on flush = item deleted remotely, silently discarded.

---

## Key Terminology

- **Workspace** (code) = **Household** (UI)
- Personal households: type `"personal"`, cannot be deleted or joined
- Shared households: 8-char `invite_code`, can be joined/left
