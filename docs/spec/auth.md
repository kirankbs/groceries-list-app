# Auth System

## Registration / Login Flow
1. `POST /api/auth/register` → creates user, personal workspace, session token → returns `{user, session_token}`
2. `POST /api/auth/login` → validates bcrypt hash, deletes all existing sessions (`replace=True`), creates new session → returns `{user, session_token}`
3. Frontend stores token → calls `GET /api/auth/me` on every app init to restore session
4. All subsequent requests: `Authorization: Bearer <token>` header

## Forgot Password Flow
1. User enters email on ForgotPassword screen → `POST /api/auth/forgot-password`
2. Backend checks user exists (always returns 200 to avoid leaking account existence)
3. If user found: generates 6-digit OTP via `secrets.randbelow(900000) + 100000`, bcrypt-hashes it, stores in `password_reset_codes` with 10-min TTL; triggers `send_reset_email` as BackgroundTask
4. Email sent via Resend HTTP API (`POST https://api.resend.com/emails`) with HTML template showing the OTP code
5. User enters OTP on ResetPassword screen → `POST /api/auth/reset-password`
6. Backend validates expiry, checks max 3 attempts (atomic via `find_one_and_update`), verifies bcrypt hash
7. On success: updates `password_hash`, deletes all sessions for user, deletes reset code doc → returns 200
8. On failure: increments attempt counter atomically, returns remaining attempts; after 3 failures deletes code doc

**Reset code constants:**
- `RESET_CODE_EXPIRY_MINUTES = 10`
- `RESET_CODE_COOLDOWN_SECONDS = 60` (min interval between new code requests per email)
- `RESET_CODE_MAX_ATTEMPTS = 3`

## Session Token
- Generated: `secrets.token_urlsafe(32)` (URL-safe base64, ~43 chars)
- TTL: 7 days (`SESSION_EXPIRY_DAYS = 7`)
- Stored in `user_sessions`: `{user_id, session_token, expires_at, created_at}`
- Login invalidates all prior sessions (single-device session model)
- Also set as `httponly` cookie (`session_token`) for browser; `secure=True` in production

## Token Storage (frontend)
- Mobile (iOS/Android): `expo-secure-store` → `SecureStore.setItemAsync('session_token', token)`
- Web: `sessionStorage.setItem('session_token', token)` — clears on tab close

## `require_auth(request: Request) -> User` dependency
Checks cookie first, then `Authorization: Bearer` header. Validates session, fetches user (excludes `password_hash`). Raises HTTP 401 if invalid.

## `verify_workspace_access(user, workspace_id)` helper
Fetches workspace; raises 403 if `user.user_id not in workspace.member_ids`.

## `verify_list_access(user, list_id)` helper
Fetches list; delegates to `verify_workspace_access`.
