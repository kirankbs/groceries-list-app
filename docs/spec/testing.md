# Testing

## Backend Integration Tests
```bash
# Requires: uvicorn running (port 8001) + MongoDB
python backend_test.py
```
At root level (not inside `backend/`). Registers fresh test user each run via POST /api/auth/register. Covers: auth, forgot-password flow (OTP request, wrong code, correct code, session invalidation), workspaces (CRUD, invite, leave, currency), lists, items, categories, templates. 20 test methods total.

### Backend Pytest Tests
```bash
# Requires: uvicorn running (port 8001) + MongoDB
cd backend && pytest tests/
```
`backend/tests/test_categories.py` — Pytest suite with hardcoded session token against a live server. Covers: get categories (defaults, count, auth), create (happy path, empty name, duplicates), update (name/color/icon propagation, 404), delete (with item reassignment to "Other", 404).

## Frontend Unit Tests (28 tests — no server needed)
```bash
cd frontend && yarn test
```
Covers: `offlineCache`, `syncQueue`, `useNetworkStatus`. All Jest mocked, no real I/O.

## E2E Tests (Maestro — requires device/simulator)
```bash
~/.maestro/bin/maestro test maestro/flows/
```
Flows: login → add item → check item offline → reconnect sync. `appId`: `host.exp.Exponent` (Expo Go).

## CI (GitHub Actions — `.github/workflows/ci.yml`)
Frontend Jest + backend integration run on every PR to `main`. MongoDB provisioned as service container.

## Lint / Format
```bash
cd backend && flake8 server.py && black server.py && isort server.py
cd frontend && yarn lint
```

## Run Locally
```bash
# Backend
pip install -r backend/requirements.txt
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend && yarn install
cd frontend && yarn start   # interactive platform selection
cd frontend && yarn ios
cd frontend && yarn android
cd frontend && yarn web
```
