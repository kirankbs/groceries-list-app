# SPEC.md — The Living Pantry

Machine-readable reference. Primary audience: Claude Code AI. Dense/concise. No narrative fluff.

---

## 1. Project Overview

App name: **The Living Pantry** (branded). Internal codebase name: groceries-list-app.
Collaborative household grocery list app. Solves: multi-person household shopping coordination with shared lists, real-time sync, category organization, receipt scanning with price extraction.
Stack: Expo React Native (SDK 54) + FastAPI (Python 3.11+) + MongoDB (Motor async driver) + Anthropic Claude API.
Key terminology: **Workspace** (code/DB) = **Household** (UI). Every model, API param, and DB field uses `workspace`; UI labels say "Household".
Auth: email/password, session token (7-day TTL), no OAuth.
Platforms: iOS, Android, Web (expo-router file-based routing, single screen `app/index.tsx`).
Frontend state: React Context (AuthContext + ThemeContext). No Redux/Zustand.
Backend: single-file FastAPI app (`backend/server.py`). All models, routes, helpers in one file.
Receipt OCR: Claude Sonnet 4-6 vision via Anthropic SDK; runs as FastAPI BackgroundTask; polled by frontend.
Version string in UI: v2.4.0.

---

## 2. Project File Map

```
/
├── backend/
│   ├── server.py              # Entire backend: models, helpers, all route handlers (~1248 lines)
│   ├── requirements.txt       # Python deps: fastapi, motor, bcrypt, anthropic, pydantic, python-dotenv
│   └── .env                   # MONGO_URL, DB_NAME, ANTHROPIC_API_KEY, ALLOWED_ORIGINS, ENVIRONMENT
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
│   ├── components/modals/     # 14 modal components (see Section 9)
│   ├── contexts/
│   │   └── AuthContext.tsx    # All auth + workspace + list state and API calls
│   └── .env                   # EXPO_PUBLIC_BACKEND_URL
├── backend_test.py            # Integration test suite (root level); requires running backend + MongoDB
└── memory/PRD.md              # Product requirements document
```

---

## 3. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `MONGO_URL` | yes | `mongodb://localhost:27017` | Motor async MongoDB connection string |
| `DB_NAME` | yes | `test_database` | MongoDB database name |
| `ANTHROPIC_API_KEY` | yes* | `sk-ant-...` | Claude API for receipt OCR; app warns if missing, receipt scan fails |
| `ALLOWED_ORIGINS` | no | `http://localhost:8081,http://localhost:19006` | CORS allow-list, comma-separated; defaults to both Expo dev ports |
| `ENVIRONMENT` | no | `production` | Any value other than `development` sets `secure=True` on session cookie |

### Frontend (`frontend/.env`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | yes | `http://localhost:8001` | Base URL for all API calls; no trailing slash |

---

## 4. Auth System

### Flow
1. `POST /api/auth/register` → creates user, personal workspace, session token → returns `{user, session_token}`
2. `POST /api/auth/login` → validates bcrypt hash, deletes all existing sessions (`replace=True`), creates new session → returns `{user, session_token}`
3. Frontend stores token → calls `GET /api/auth/me` on every app init to restore session
4. All subsequent requests: `Authorization: Bearer <token>` header

### Session Token
- Generated: `secrets.token_urlsafe(32)` (URL-safe base64, ~43 chars)
- TTL: 7 days (`SESSION_EXPIRY_DAYS = 7`)
- Stored in `user_sessions` collection: `{user_id, session_token, expires_at, created_at}`
- Login invalidates all prior sessions for that user (single-device session model)
- Also set as `httponly` cookie (`session_token`) for browser clients; `secure=True` in production

### Token Storage (frontend)
- Mobile (iOS/Android): `expo-secure-store` → `SecureStore.setItemAsync('session_token', token)`
- Web: `sessionStorage.setItem('session_token', token)` — clears on tab close

### `require_auth(request: Request) -> User` dependency
Checks cookie first, then `Authorization: Bearer` header. Looks up `user_sessions`, validates expiry, fetches user from `users` collection (excludes `password_hash`). Raises HTTP 401 if invalid.

### `verify_workspace_access(user, workspace_id)` helper
Fetches workspace; raises 403 if `user.user_id not in workspace.member_ids`.

### `verify_list_access(user, list_id)` helper
Fetches list; delegates to `verify_workspace_access`.

---

## 5. Data Models (MongoDB)

All collections in database named by `DB_NAME` env var (default: `test_database`). MongoDB `_id` excluded from all API responses.

### Collection: `users`

| Field | Type | Notes |
|---|---|---|
| `user_id` | str | `user_{uuid4().hex[:12]}` — 17 chars |
| `email` | str | lowercase, trimmed; unique index required |
| `name` | str | trimmed |
| `picture` | str\|null | URL; null by default |
| `password_hash` | str | bcrypt hash; excluded from all API responses |
| `personal_workspace_id` | str\|null | Set on register; lazily created on first `GET /auth/me` if missing (migration path) |
| `created_at` | datetime | UTC |

### Collection: `user_sessions`

| Field | Type | Notes |
|---|---|---|
| `user_id` | str | FK to users |
| `session_token` | str | `secrets.token_urlsafe(32)` |
| `expires_at` | datetime | `now + 7 days` |
| `created_at` | datetime | UTC |

### Collection: `workspaces`

| Field | Type | Notes |
|---|---|---|
| `workspace_id` | str | UUID4 |
| `name` | str | trimmed |
| `type` | str | `'personal'` or `'shared'` |
| `invite_code` | str\|null | `secrets.token_urlsafe(6)` (~8 chars); null for personal |
| `owner_id` | str | FK to users.user_id |
| `member_ids` | list[str] | includes owner; addToSet on join |
| `currency` | str | default `"EUR"`; valid: `EUR USD GBP CHF AUD CAD` |
| `created_at` | datetime | UTC |

API responses augment with: `members[]` (user details), `active_lists_count`, `completed_lists_count`.

### Collection: `shopping_lists`

| Field | Type | Notes |
|---|---|---|
| `list_id` | str | UUID4 |
| `workspace_id` | str | FK to workspaces |
| `name` | str | trimmed |
| `status` | str | `'active'` \| `'in_progress'` \| `'completed'` |
| `is_template` | bool | `False` = regular list; `True` = template |
| `created_from_template_id` | str\|null | set when list created from template |
| `created_at` | datetime | UTC |
| `completed_at` | datetime\|null | set when status → completed |

API responses for lists endpoint augment with: `total_items`, `checked_items` (via aggregation). Templates endpoint augments with: `item_count`.

### Collection: `grocery_items`

| Field | Type | Notes |
|---|---|---|
| `id` | str | UUID4 |
| `list_id` | str | FK to shopping_lists |
| `name` | str | trimmed |
| `quantity` | int | min 1 |
| `unit` | str | default `"items"`; see `ITEM_UNITS` |
| `category` | str | category name string (not ID); default `"Other"` |
| `checked` | bool | default `false` |
| `added_by` | str\|null | user_id of creator |
| `price` | float\|null | set via receipt confirm or manual edit |
| `price_updated_at` | datetime\|null | updated whenever price is set |
| `created_at` | datetime | UTC |

### Collection: `categories`

| Field | Type | Notes |
|---|---|---|
| `id` | str | UUID4 |
| `name` | str | trimmed; case-insensitive unique per workspace |
| `color` | str | hex color string, default `"#9E9E9E"` |
| `icon` | str | Ionicons name, default `"pricetag-outline"` |
| `is_default` | bool | `True` for the 10 built-in categories |
| `workspace_id` | str | FK to workspaces |
| `created_at` | datetime | UTC |

### Collection: `receipts`

| Field | Type | Notes |
|---|---|---|
| `receipt_id` | str | UUID4 |
| `list_id` | str | FK to shopping_lists |
| `workspace_id` | str | FK to workspaces |
| `uploaded_at` | datetime | UTC |
| `processed_at` | datetime\|null | set on completion |
| `status` | str | `'processing'` \| `'completed'` \| `'failed'` |
| `store_name` | str\|null | extracted by Claude |
| `currency` | str | copied from workspace at upload time |
| `receipt_total` | float\|null | total from receipt |
| `matched_total` | float\|null | sum of matched item prices |
| `raw_extracted_items` | list | excluded from GET responses (replaced with `raw_items_count`) |
| `matched_items` | list | `[{item_id, item_name, matched_receipt_line, price, confidence}]` |
| `error_message` | str\|null | set on failure |

---

## 6. API Reference

All endpoints prefixed with `/api`. Auth = Bearer token required unless noted.

### Auth

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{email, password (min 8), name}` | `{user, session_token}` |
| POST | `/api/auth/login` | No | `{email, password}` | `{user, session_token}`; invalidates prior sessions |
| GET | `/api/auth/me` | Yes | — | `{user, workspaces[]}` with member details; creates personal workspace if missing |
| POST | `/api/auth/logout` | Yes | — | `{message}`; deletes session from DB + clears cookie |

### Workspaces

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/workspaces` | Yes | — | `Workspace[]` augmented with `members[]`, `active_lists_count`, `completed_lists_count` |
| POST | `/api/workspaces` | Yes | `{name}` | New shared `Workspace`; auto-creates 10 default categories + 1 default list |
| POST | `/api/workspaces/join` | Yes | `{invite_code}` | Updated `Workspace`; 404 invalid code; 400 if personal or already member |
| POST | `/api/workspaces/{workspace_id}/leave` | Yes | — | `{message}`; owner → transfers to next member; last member → deletes workspace + all data |
| GET | `/api/workspaces/{workspace_id}/invite-code` | Yes | — | `{invite_code, workspace_name}`; 400 if personal |
| POST | `/api/workspaces/{workspace_id}/regenerate-code` | Yes | — | `{invite_code}`; owner only |
| DELETE | `/api/workspaces/{workspace_id}` | Yes | — | `{message}`; owner only; cascades: items → lists → categories → workspace |
| PUT | `/api/workspaces/{workspace_id}/currency` | Yes | `{currency}` | Updated `Workspace`; valid: `EUR USD GBP CHF AUD CAD` |

### Lists

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/workspaces/{workspace_id}/lists` | Yes | — | `ShoppingList[]` (non-templates) with `total_items`, `checked_items`; sorted created_at desc |
| GET | `/api/workspaces/{workspace_id}/templates` | Yes | — | `ShoppingList[]` (templates only) with `item_count`; sorted created_at desc |
| POST | `/api/lists` | Yes | `{name, workspace_id, copy_from_list_id?, from_template_id?}` | New `ShoppingList`; copies items if source provided (all unchecked) |
| PUT | `/api/lists/{list_id}` | Yes | `{name?, status?}` | Updated `ShoppingList`; setting status=completed sets `completed_at`; clearing sets it null |
| DELETE | `/api/lists/{list_id}` | Yes | — | `{message}`; cascades items |
| POST | `/api/lists/{list_id}/save-as-template` | Yes | — | New template `ShoppingList` named `"{name} (Template)"`; copies items unchecked |

### Items

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/lists/{list_id}/items` | Yes | — | `GroceryItem[]` sorted created_at desc |
| POST | `/api/items` | Yes | `{list_id, name, quantity?, unit?, category?}` | New `GroceryItem`; triggers `update_list_status` |
| PUT | `/api/items/{item_id}` | Yes | `{checked?, name?, quantity?, unit?, category?, price?}` | Updated `GroceryItem`; if checked changed → triggers `update_list_status`; price sets `price_updated_at` |
| DELETE | `/api/items/{item_id}` | Yes | — | `{message}`; triggers `update_list_status` |

### Categories

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/workspaces/{workspace_id}/categories` | Yes | — | `Category[]` sorted by name asc |
| POST | `/api/categories` | Yes | `{name, color?, icon?, workspace_id}` | New `Category`; 400 if name exists (case-insensitive) |
| PUT | `/api/categories/{category_id}` | Yes | `{name?, color?, icon?}` | Updated `Category`; if name changed → updates all items in workspace |
| DELETE | `/api/categories/{category_id}` | Yes | — | `{message}`; moves all items with this category → `"Other"` |

**Note:** `CategoryModal.tsx` uses incorrect URLs (`/api/workspaces/{workspace_id}/categories/{category_id}`) for PUT/POST; actual backend routes are `/api/categories` (POST) and `/api/categories/{category_id}` (PUT/DELETE).

### Receipts

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/lists/{list_id}/upload-receipt` | Yes | `multipart/form-data: image` (JPEG/PNG/WEBP, max 10 MB) | `{receipt_id, status: "processing"}`; Claude processing runs as BackgroundTask |
| GET | `/api/receipts/{receipt_id}` | Yes | — | Receipt doc with `raw_items_count` (int) instead of full `raw_extracted_items` |
| GET | `/api/lists/{list_id}/receipts` | Yes | — | `Receipt[]` sorted uploaded_at desc; `raw_extracted_items` excluded |
| POST | `/api/receipts/{receipt_id}/confirm` | Yes | `{confirmed_items: [{item_id, price}]}` | `{updated_items[], receipt_id}`; writes price + price_updated_at to each item |

### Root

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/` | No | `{message: "Grocery Todo API v2.0 - Multi-Workspace Support"}` |

---

## 7. Key Business Logic

### `update_list_status(list_id: str)`
Called after: item create, item update (when `checked` changes), item delete.
Logic:
- 0 items → status = `'active'`
- Already `'completed'` → no change (manual completion not reversed by unchecking)
- All checked → status = `'completed'`, sets `completed_at`
- Any checked (not all) → status = `'in_progress'`
- None checked → status = `'active'`

### `initialize_workspace_categories(workspace_id)`
Called on: workspace create (both personal and shared). Inserts all 10 `DEFAULT_CATEGORIES`:

| Name | Color | Icon |
|---|---|---|
| Produce | `#7B9E6B` | `leaf-outline` |
| Dairy | `#5B8A72` | `water-outline` |
| Meat | `#C2644B` | `restaurant-outline` |
| Bakery | `#D4915E` | `pizza-outline` |
| Beverages | `#6B7F3B` | `cafe-outline` |
| Snacks | `#B87352` | `ice-cream-outline` |
| Frozen | `#5C7A6B` | `snow-outline` |
| Pantry | `#8B7355` | `cube-outline` |
| Household | `#6B5B4F` | `home-outline` |
| Other | `#9E8B7C` | `ellipsis-horizontal-outline` |

### Category Delete
`DELETE /api/categories/{id}` → updates all `grocery_items` in all lists of that workspace: `category = "Other"`. Then deletes category doc.

### Category Rename
`PUT /api/categories/{id}` with new name → bulk updates all `grocery_items` in workspace's lists where `category == old_name` → sets to new name.

### Personal Workspace Creation (`create_personal_workspace`)
Called on register and lazily on `GET /auth/me` if user has no personal workspace (migration path).
Creates workspace `type='personal'`, `invite_code=None`, runs `initialize_workspace_categories`, inserts a default `ShoppingList` named `"My Shopping List"`.
Updates `user.personal_workspace_id`.

### Shared Workspace Creation
`POST /api/workspaces` creates with `type='shared'`, random `invite_code`, runs `initialize_workspace_categories`, inserts default `ShoppingList` named `"Shopping List"`.

### Leave Workspace — Owner Edge Cases
- Owner leaves with other members → first other member becomes new owner.
- Owner leaves as sole member → full cascade delete: items → lists → categories → workspace.

### Receipt OCR Flow
1. Client uploads image → `POST /api/lists/{list_id}/upload-receipt` (multipart)
2. Backend creates receipt doc `status='processing'`, enqueues `process_receipt_background` as FastAPI `BackgroundTask`
3. `process_receipt_background`: fetches grocery items for list, calls `parse_and_match_receipt_with_claude` (synchronous, run via `asyncio.to_thread`), validates Claude output (drops hallucinated item IDs), updates receipt doc `status='completed'`
4. On failure: sets `status='failed'`, `error_message='Receipt processing failed. Please try again.'`
5. Frontend polls `GET /api/receipts/{receipt_id}` every 3 seconds, up to 40 attempts (2 minute timeout)
6. On `status='completed'` → frontend shows review UI with editable prices
7. User confirms → `POST /api/receipts/{receipt_id}/confirm` → writes prices to grocery items

Claude model used: `claude-sonnet-4-6`, max_tokens=4096. Prompt instructs: translate to English, smart fuzzy matching, skip tax/subtotals, return JSON with `store_name`, `receipt_total`, `items[]`, `matched_items[]`.

---

## 8. Frontend Screens

### PantryScreen (`app/screens/PantryScreen.tsx`)
Primary screen. Shows grocery items for `currentList` grouped by category in a `SectionList`. Header shows `currentWorkspace.name` and items-left count. FAB opens AddItemModal. "Quick Add" button opens ReceiptScanModal.
**Key state:** `items`, `categories`, `currentList`, `currentWorkspace` (from AuthContext + parent props)
**Modals it opens:** AddItemModal, EditItemModal, DeleteItemModal, HouseholdSwitcherModal, CreateHouseholdModal, JoinHouseholdModal, HouseholdDetailsModal, DeleteHouseholdModal, ListsModal, CreateListModal, InviteCodeModal, ReceiptScanModal, ProfileModal

### ListsScreen (`app/screens/ListsScreen.tsx`)
Shows active lists as cards with status badges, completed lists as horizontal history chips. Selecting a list calls `onSelectList` + navigates to pantry tab.
**Key state:** `lists`, `currentList` (passed as props)
**Modals it triggers:** None directly; "Create New List →" CTA calls `onCreateNew` → index.tsx opens CreateListModal

### CategoriesScreen (`app/screens/CategoriesScreen.tsx`)
FlatList of workspace categories. Tapping opens CategoryModal for edit (disabled for "Other"). Trash icon triggers native Alert confirm → DELETE API call. "Add Category" button opens CategoryModal in create mode.
**Key state:** `categories`, `sessionToken`, `currentWorkspace`
**Modals it opens:** CategoryModal

### SettingsScreen (`app/screens/SettingsScreen.tsx`)
User card, light/dark/system appearance segmented control, household settings/members rows, notifications/privacy stubs, logout.
**Key state:** `user`, `currentWorkspace`, `colorMode` (ThemeContext)
**Modals it triggers:** calls `onOpenHouseholdDetails` prop → index.tsx opens HouseholdDetailsModal

---

## 9. Modals Catalogue

| Filename | Purpose | Key Props | Opened From |
|---|---|---|---|
| `AddItemModal.tsx` | Create new grocery item: name, category chips, quantity stepper, unit chips | `visible, font, categories, sessionToken, currentList, onClose, onItemAdded` | PantryScreen FAB |
| `EditItemModal.tsx` | Edit existing item: same fields as add + delete trigger | `visible, font, categories, sessionToken, item, onClose, onItemUpdated, onDeleteRequest` | PantryScreen item row tap |
| `DeleteItemModal.tsx` | Confirm item deletion (fade modal, centered) | `visible, font, sessionToken, item, onClose, onDeleted` | PantryScreen trash icon / EditItemModal delete link |
| `CategoryModal.tsx` | Create/edit category: name, color palette (15 colors), icon grid (37 icons), live preview | `visible, font, category, sessionToken, currentWorkspace, onClose, onSaved` | CategoriesScreen |
| `CreateListModal.tsx` | Create list with 3 modes: blank / from template / copy existing list | `visible, font, templates, lists, onClose, onCreated` | ListsScreen CTA, PantryScreen header |
| `ListsModal.tsx` | Bottom sheet to switch active list or create new | `visible, font, currentWorkspace, currentList, activeLists, completedLists, templates, onClose, onSelectList, onCreateNew` | PantryScreen "N items left" button |
| `HouseholdSwitcherModal.tsx` | Switch between user's workspaces; actions: create new / join with code | `visible, font, workspaces, currentWorkspace, onClose, onSelect, onCreateNew, onJoin` | PantryScreen menu/household header tap |
| `CreateHouseholdModal.tsx` | Create a new shared workspace by name | `visible, font, onClose, onCreated` | HouseholdSwitcherModal "Create New" |
| `JoinHouseholdModal.tsx` | Join a household by entering invite code | `visible, font, onClose, onJoined, onCreateNew?` | HouseholdSwitcherModal "Join with Code" |
| `HouseholdDetailsModal.tsx` | View household details: name, est. date, invite code card, members list, owner/member role badges; actions: share code, leave (non-owner), delete (owner) | `visible, font, household, userId, onClose, onInvite, onDelete, onLeave` | PantryScreen, SettingsScreen |
| `DeleteHouseholdModal.tsx` | Confirm household deletion (fade, centered, loading state) | `visible, font, householdName, loading, onClose, onConfirm` | HouseholdDetailsModal, index.tsx (from settings) |
| `InviteCodeModal.tsx` | Display invite code for sharing (fade, centered) | `visible, font, inviteCode, onClose` | PantryScreen, index.tsx (from settings) |
| `ProfileModal.tsx` | User profile: avatar, name, email; if shared workspace: member list, invite/leave actions; logout | `visible, font, user, currentWorkspace, onClose, onInvite, onLeave, onLogout` | PantryScreen person icon |
| `ReceiptScanModal.tsx` | 4-step receipt flow: picker (camera/library) → uploading (spinner) → review (editable prices, store name, totals) → confirming (spinner) | `visible, font, listId, onClose, onPricesSaved` | PantryScreen "Quick Add" button |

---

## 10. State Management

### AuthContext (`contexts/AuthContext.tsx`)

**State fields:**

| Field | Type | Notes |
|---|---|---|
| `user` | `User \| null` | Current authenticated user |
| `workspaces` | `Workspace[]` | All workspaces user is member of |
| `currentWorkspace` | `Workspace \| null` | Active workspace |
| `currentList` | `ShoppingList \| null` | Active shopping list |
| `lists` | `ShoppingList[]` | Non-template lists for currentWorkspace |
| `templates` | `ShoppingList[]` | Template lists for currentWorkspace |
| `isLoading` | `boolean` | Auth/init loading flag |
| `isAuthenticated` | `boolean` | Derived: `!!user` |
| `sessionToken` | `string \| null` | In-memory token mirror |
| `authError` | `string \| null` | Login/register error message |

**Methods (all `useCallback`):**

| Signature | Notes |
|---|---|
| `login(email, password): Promise<void>` | POST /auth/login; stores token; fetches user data |
| `register(email, password, name): Promise<void>` | POST /auth/register; same post-flow as login |
| `logout(): Promise<void>` | POST /auth/logout; clears all state |
| `refreshUser(): Promise<void>` | Re-fetches /auth/me with current token |
| `clearAuthError(): void` | Sets authError = null |
| `setCurrentWorkspace(workspace): Promise<void>` | Switches workspace; fetches lists + templates in parallel; auto-selects first active list |
| `createWorkspace(name): Promise<Workspace>` | POST /workspaces; calls fetchWorkspaces() |
| `joinWorkspace(inviteCode): Promise<Workspace>` | POST /workspaces/join; calls fetchWorkspaces() |
| `leaveWorkspace(workspaceId): Promise<void>` | POST /workspaces/{id}/leave; falls back to personal workspace |
| `deleteWorkspace(workspaceId): Promise<void>` | DELETE /workspaces/{id}; falls back to personal workspace |
| `getInviteCode(workspaceId): Promise<string>` | GET /workspaces/{id}/invite-code |
| `regenerateInviteCode(workspaceId): Promise<string>` | POST /workspaces/{id}/regenerate-code |
| `fetchWorkspaces(): Promise<Workspace[] \| undefined>` | GET /workspaces; updates currentWorkspace if found |
| `setCurrentList(list \| null): void` | Direct state setter |
| `fetchLists(): Promise<void>` | GET /workspaces/{id}/lists; auto-selects only if workspace changed |
| `fetchTemplates(): Promise<void>` | GET /workspaces/{id}/templates |
| `createList(name, copyFromListId?, fromTemplateId?): Promise<ShoppingList>` | POST /lists; calls fetchLists() |
| `updateList(listId, {name?, status?}): Promise<ShoppingList>` | PUT /lists/{id}; calls fetchLists() |
| `deleteList(listId): Promise<void>` | DELETE /lists/{id}; nulls currentList if deleted |
| `saveAsTemplate(listId): Promise<ShoppingList>` | POST /lists/{id}/save-as-template; calls fetchTemplates() |
| `updateWorkspaceCurrency(workspaceId, currency): Promise<void>` | PUT /workspaces/{id}/currency; calls fetchWorkspaces() |

**Init sequence:** on mount, reads token from storage → calls `fetchUserData(token, shouldSelectWorkspace=true)` → if successful, selects personal workspace (or first workspace), fetches lists + templates in parallel, auto-selects first non-completed list.

### ThemeContext (`components/ThemeContext.tsx`)

| Field | Type | Notes |
|---|---|---|
| `colorMode` | `'light' \| 'dark' \| 'system'` | Default: `'system'` |
| `setColorMode(mode)` | `(ColorMode) => void` | Persisted in useState only (not stored to disk) |
| `theme` | `Theme` | Derived from colorMode + system scheme |
| `isDark` | `boolean` | `colorMode === 'dark' || (colorMode === 'system' && systemScheme === 'dark')` |

---

## 11. Design System

### Fonts
- **Display/headings:** Plus Jakarta Sans (400, 500, 600, 700) — loaded via `@expo-google-fonts/plus-jakarta-sans`
- **Body/UI:** Inter (400, 500, 600, 700) — loaded via `@expo-google-fonts/inter`

### FontMap Keys

| Key | Actual Font |
|---|---|
| `display` | PlusJakartaSans_700Bold |
| `displayMedium` | PlusJakartaSans_600SemiBold |
| `displayRegular` | PlusJakartaSans_400Regular |
| `body` | Inter_400Regular |
| `bodyMedium` | Inter_500Medium |
| `bodySemiBold` | Inter_600SemiBold |
| `bodyBold` | Inter_700Bold |
| `serif` | PlusJakartaSans_700Bold |
| `serifMedium` | PlusJakartaSans_500Medium |

### Primary Color
`#006a28` (dark green)

### PALETTE Token Table

| Token | Value | Role |
|---|---|---|
| `primary` | `#006a28` | Primary action, icons, borders |
| `primaryContainer` | `#5cfd80` | Highlighted containers, dark mode primary |
| `primaryDim` | `#004d1c` | Deeper primary shade |
| `surface` | `#f9f6f5` | Light mode background |
| `surfaceContainer` | `#eae7e7` | Light mode card surface |
| `surfaceContainerHigh` | `#dddada` | Elevated container |
| `surfaceTop` | `#ffffff` | White card surface |
| `onSurface` | `#1a1c1a` | Primary text (light) |
| `onSurfaceVariant` | `#424940` | Secondary text (light) |
| `outline` | `#72796f` | Borders, muted icons |
| `outlineVariant` | `#c1c9bd` | Subtle borders |
| `tertiary` | `#ff9727` | Accent/warning (quantity badges) |
| `error` | `#ba1a1a` | Error states |
| `errorContainer` | `#ffdad6` | Error backgrounds |
| `darkSurface` | `#1a1f1a` | Dark mode background |
| `darkSurfaceContainer` | `#222822` | Dark mode container |
| `darkSurfaceCard` | `#2a332a` | Dark mode card |
| `darkSurfaceHigh` | `#313d31` | Dark mode elevated |
| `darkOnSurface` | `#e2e3dc` | Primary text (dark) |
| `darkOnSurfaceVariant` | `#c1c9bd` | Secondary text (dark) |
| `darkOutline` | `#8b9389` | Borders (dark) |
| `darkOutlineVariant` | `#3d4a3d` | Subtle borders (dark) |
| `statusActive` | `#1b6ef3` | Blue — active status badge |
| `statusInProgress` | `#ff9727` | Orange — in-progress badge |
| `statusCompleted` | `#006a28` | Green — completed badge |

### Theme Object (light vs dark)

| Theme Key | Light Value | Dark Value |
|---|---|---|
| `background` | `PALETTE.surface` (#f9f6f5) | `PALETTE.darkSurface` (#1a1f1a) |
| `surfaceContainer` | `PALETTE.surfaceContainer` (#eae7e7) | `PALETTE.darkSurfaceContainer` (#222822) |
| `surface` | `PALETTE.surfaceTop` (#ffffff) | `PALETTE.darkSurfaceCard` (#2a332a) |
| `text` | `PALETTE.onSurface` (#1a1c1a) | `PALETTE.darkOnSurface` (#e2e3dc) |
| `textSecondary` | `PALETTE.onSurfaceVariant` (#424940) | `PALETTE.darkOnSurfaceVariant` (#c1c9bd) |
| `inputBg` | `PALETTE.surfaceContainer` (#eae7e7) | `PALETTE.darkSurfaceHigh` (#313d31) |
| `primary` | `PALETTE.primary` (#006a28) | `PALETTE.primaryContainer` (#5cfd80) |
| `primaryContainer` | `PALETTE.primaryContainer` (#5cfd80) | `PALETTE.primaryContainer + '30'` |
| `tertiary` | `PALETTE.tertiary` (#ff9727) | `PALETTE.tertiary` (#ff9727) |
| `outline` | `PALETTE.outline` (#72796f) | `PALETTE.darkOutline` (#8b9389) |
| `outlineVariant` | `PALETTE.outlineVariant` (#c1c9bd) | `PALETTE.darkOutlineVariant` (#3d4a3d) |
| `error` | `PALETTE.error` (#ba1a1a) | `#ffb4ab` |
| `border` | `PALETTE.outlineVariant` (#c1c9bd) | `PALETTE.darkOutlineVariant` (#3d4a3d) |
| `isDark` | `false` | `true` |

### AVAILABLE_COLORS (15 colors for category palette)
`#006a28 #f97316 #3b82f6 #dc2626 #92400e #ec4899 #9333ea #7c3aed #2563eb #0891b2 #06b6d4 #059669 #16a34a #65a30d #ca8a04`

### AVAILABLE_ICONS (37 Ionicons names for categories)
`leaf-outline nutrition-outline water-outline snow-outline pizza-outline cafe-outline restaurant-outline fast-food-outline ice-cream-outline fish-outline beer-outline wine-outline flame-outline flower-outline basket-outline cart-outline bag-outline bag-handle-outline pricetag-outline grid-outline cube-outline home-outline construct-outline shirt-outline paw-outline medical-outline bandage-outline sparkles-outline happy-outline book-outline phone-portrait-outline hardware-chip-outline body-outline sunny-outline aperture-outline ellipse-outline ellipsis-horizontal-outline`

### ITEM_UNITS
`items pcs kg g lb oz L ml bags boxes cans bottles bunches`

### LIST_COLORS (rotating colors for list icons)
`#006a28 #3b82f6 #f97316 #8b5cf6 #ec4899 #14b8a6`

### CURRENCY_SYMBOLS
`EUR→€ USD→$ GBP→£ CHF→Fr. AUD→A$ CAD→C$ INR→₹ JPY→¥ CNY→¥ KRW→₩`

---

## 12. Key User Flows

**1. First-time Register**
1. Open app → auth gate shown (unauthenticated)
2. Tap "Register" → enter name, email, password
3. `register()` → POST /auth/register → stores token
4. `fetchUserData(token, true)` → GET /auth/me → personal workspace auto-created
5. Lists + templates fetched for personal workspace; first non-completed list auto-selected
6. App lands on PantryScreen showing empty list

**2. Login (returning user)**
1. Open app → token read from SecureStore/sessionStorage
2. `fetchUserData(token, true)` → GET /auth/me → validates token
3. Personal workspace selected; lists loaded; first active list selected
4. If token invalid → auth gate shown

**3. Add Grocery Item**
1. PantryScreen → tap FAB (+)
2. AddItemModal opens → enter name, select category chip, adjust quantity, select unit
3. POST /api/items → item appended optimistically
4. `update_list_status` triggers on backend; list may transition active → in_progress

**4. Check Off Item**
1. Tap checkbox on item row → optimistic UI update (checked state toggled locally)
2. PUT /api/items/{id} `{checked: true}` → backend calls `update_list_status`
3. If all items checked → list becomes `completed`
4. On failure → revert optimistic update

**5. Switch Household**
1. PantryScreen header tap / menu icon → HouseholdSwitcherModal
2. Select workspace → `setCurrentWorkspace(ws)` → clears lists, fetches new workspace's lists + templates
3. Auto-selects first non-completed list; modal closes

**6. Create Shared Household**
1. HouseholdSwitcherModal → "Create New Household" → CreateHouseholdModal
2. Enter name → POST /api/workspaces → 10 categories initialized, default list created
3. `fetchWorkspaces()` → HouseholdSwitcherModal auto-selects new workspace

**7. Invite Member to Household**
1. ProfileModal or HouseholdDetailsModal → "Invite" / "Share Code"
2. `getInviteCode(workspace_id)` → GET /workspaces/{id}/invite-code
3. InviteCodeModal shows code; user shares via native share sheet

**8. Join Household**
1. HouseholdSwitcherModal → "Join with Code" → JoinHouseholdModal
2. Enter invite code → POST /api/workspaces/join
3. `fetchWorkspaces()` → new workspace in list; user navigates there

**9. Scan Receipt**
1. PantryScreen → "Quick Add" button → ReceiptScanModal (picker step)
2. Take photo or pick from library → upload multipart to POST /api/lists/{id}/upload-receipt
3. Modal transitions to uploading step; polls GET /api/receipts/{id} every 3s
4. Status = completed → review step shows matched items with editable prices
5. Confirm → POST /api/receipts/{id}/confirm → prices written to grocery items
6. `onPricesSaved()` → `fetchItems()` refreshes list

**10. Create List from Template**
1. ListsScreen "Create New List →" or PantryScreen list switcher → CreateListModal
2. Select "Template" mode → pick from template chips
3. `createList(name, undefined, templateId)` → POST /api/lists `{from_template_id}`
4. Backend copies all items from template (all unchecked); `created_from_template_id` set
5. New list auto-selected; navigate to PantryScreen

---

## 13. TypeScript Types

```typescript
// frontend/components/types.ts

type FontMap = {
  display: string | undefined;        // PlusJakartaSans_700Bold
  displayMedium: string | undefined;  // PlusJakartaSans_600SemiBold
  displayRegular: string | undefined; // PlusJakartaSans_400Regular
  body: string | undefined;           // Inter_400Regular
  bodyMedium: string | undefined;     // Inter_500Medium
  bodySemiBold: string | undefined;   // Inter_600SemiBold
  bodyBold: string | undefined;       // Inter_700Bold
  serif: string | undefined;          // PlusJakartaSans_700Bold (alias)
  serifMedium: string | undefined;    // PlusJakartaSans_500Medium (alias)
};

type Theme = {
  background: string; surfaceContainer: string; surface: string;
  text: string; textSecondary: string; inputBg: string;
  primary: string; primaryContainer: string; tertiary: string;
  outline: string; outlineVariant: string; error: string;
  border: string; isDark: boolean;
};

type Category = { id: string; name: string; color: string; icon: string; };

type GroceryItem = {
  id: string; list_id: string; name: string;
  quantity: number; unit: string; category: string; checked: boolean;
  price?: number; price_updated_at?: string;
};

type WorkspaceMember = { user_id: string; name: string; email: string; picture?: string; };

type Workspace = {
  workspace_id: string; name: string; type: 'personal' | 'shared';
  invite_code?: string; owner_id: string; member_ids: string[];
  members?: WorkspaceMember[];
  active_lists_count?: number; completed_lists_count?: number;
  currency?: string; created_at: string;
};

type ShoppingList = {
  list_id: string; workspace_id: string; name: string;
  status: 'active' | 'in_progress' | 'completed';
  is_template: boolean; created_from_template_id?: string;
  total_items?: number; checked_items?: number; item_count?: number;
  created_at: string; completed_at?: string;
};

type TabName = 'pantry' | 'lists' | 'categories' | 'settings';
```

---

## 14. Testing

### Backend Tests
```bash
# Requires: running backend (port 8001) + running MongoDB
python backend_test.py
```
`backend_test.py` is at root level (not inside `backend/`). Registers a fresh test user via POST /api/auth/register, then runs HTTP requests against `http://localhost:8001/api`.

### Lint / Format (backend)
```bash
cd backend && flake8 server.py
cd backend && black server.py
cd backend && isort server.py
```

### Frontend Lint
```bash
cd frontend && yarn lint
```

### Run Backend
```bash
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Run Frontend
```bash
cd frontend && yarn start   # interactive platform selection
cd frontend && yarn ios
cd frontend && yarn android
cd frontend && yarn web
```

### Install Dependencies
```bash
pip install -r backend/requirements.txt
cd frontend && yarn install
```

### Key Test Constraints
- Tests require both backend and MongoDB running before execution
- No mock layer; all tests hit real HTTP endpoints
- Register creates unique users per test run (uses timestamps or UUIDs)
- Frontend has no automated tests currently; manual testing only
