# Key Business Logic

## `update_list_status(list_id: str)`
Called after: item create, item update (when `checked` changes), item delete.
- 0 items → `'active'`
- Already `'completed'` → no change (not reversed by unchecking)
- All checked → `'completed'`, sets `completed_at`
- Any checked (not all) → `'in_progress'`
- None checked → `'active'`

## `initialize_workspace_categories(workspace_id)`
Called on workspace create (personal and shared). Inserts all 10 `DEFAULT_CATEGORIES`:

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

## Category Delete
`DELETE /api/categories/{id}` → bulk updates all `grocery_items` in workspace's lists: `category = "Other"`, then deletes category doc. The "Other" category cannot be deleted.

## Category Rename
`PUT /api/categories/{id}` with new name → bulk updates all `grocery_items` in workspace's lists where `category == old_name`.

## Personal Workspace Creation
Called on register and lazily on `GET /auth/me` if user has no personal workspace.
Creates workspace `type='personal'`, `invite_code=None`, runs `initialize_workspace_categories`, inserts default `ShoppingList` named `"My Shopping List"`. Updates `user.personal_workspace_id`.

## Shared Workspace Creation
`POST /api/workspaces` creates with `type='shared'`, random `invite_code`, runs `initialize_workspace_categories`, inserts default `ShoppingList` named `"Shopping List"`.

## Leave Workspace — Owner Edge Cases
- Owner leaves with other members → first other member becomes new owner.
- Owner leaves as sole member → full cascade delete: items → lists → categories → workspace.

## Password Reset Code Logic
- OTP: `str(secrets.randbelow(900000) + 100000)` — 6 digits, CSPRNG
- Stored as bcrypt hash; plaintext never persisted
- Subject line: `"Your password reset code"` (OTP only in HTML body, never in subject)
- Attempt counter incremented atomically via `find_one_and_update` with `{attempts: {$lt: 3}}` filter
- After 3 failed attempts or successful reset: code doc deleted
- MongoDB TTL index on `expires_at` field auto-purges stale docs

## Receipt OCR Flow
1. Client uploads image → `POST /api/lists/{list_id}/upload-receipt` (multipart)
2. Backend creates receipt doc `status='processing'`, enqueues `process_receipt_background` as BackgroundTask
3. Background task: fetches grocery items, calls `parse_and_match_receipt_with_claude` (sync, run via `asyncio.to_thread`), updates receipt doc `status='completed'`
4. On failure: `status='failed'`, `error_message='Receipt processing failed. Please try again.'`
5. Frontend polls `GET /api/receipts/{receipt_id}` every 3s, up to 40 attempts (2-min timeout)
6. On `status='completed'` → review UI with editable prices
7. User confirms → `POST /api/receipts/{receipt_id}/confirm` → writes prices to grocery items

Claude model: `claude-sonnet-4-6`, max_tokens=4096. Prompt: translate to English, smart fuzzy matching, skip tax/subtotals, return JSON `{store_name, receipt_total, items[], matched_items[]}`.
