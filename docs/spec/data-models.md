# Data Models (MongoDB)

All collections in database named by `DB_NAME`. MongoDB `_id` excluded from all API responses.

## Collection: `users`

| Field | Type | Notes |
|---|---|---|
| `user_id` | str | `user_{uuid4().hex[:12]}` — 17 chars |
| `email` | str | lowercase, trimmed; unique index required |
| `name` | str | trimmed |
| `picture` | str\|null | URL; null by default |
| `password_hash` | str | bcrypt hash; excluded from all API responses |
| `personal_workspace_id` | str\|null | Set on register; lazily created on first `GET /auth/me` if missing |
| `created_at` | datetime | UTC |

## Collection: `user_sessions`

| Field | Type | Notes |
|---|---|---|
| `user_id` | str | FK to users |
| `session_token` | str | `secrets.token_urlsafe(32)` |
| `expires_at` | datetime | `now + 7 days` |
| `created_at` | datetime | UTC |

## Collection: `password_reset_codes`

| Field | Type | Notes |
|---|---|---|
| `email` | str | lowercase user email |
| `code_hash` | str | bcrypt hash of 6-digit OTP |
| `attempts` | int | wrong-code attempt count; max 3 |
| `created_at` | datetime | UTC; used for cooldown check |
| `expires_at` | datetime | `now + 10 min`; MongoDB TTL index on this field (`expireAfterSeconds=0`) |

## Collection: `workspaces`

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

## Collection: `shopping_lists`

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

API responses augment with: `total_items`, `checked_items` (via aggregation). Templates augment with: `item_count`.

## Collection: `grocery_items`

| Field | Type | Notes |
|---|---|---|
| `id` | str | UUID4 |
| `list_id` | str | FK to shopping_lists |
| `name` | str | trimmed |
| `quantity` | int | min 1 |
| `unit` | str | default `"items"`; see `ITEM_UNITS` in design-system.md |
| `category` | str | category name string (not ID); default `"Other"` |
| `checked` | bool | default `false` |
| `added_by` | str\|null | user_id of creator |
| `price` | float\|null | set via receipt confirm or manual edit |
| `price_updated_at` | datetime\|null | updated whenever price is set |
| `created_at` | datetime | UTC |

## Collection: `categories`

| Field | Type | Notes |
|---|---|---|
| `id` | str | UUID4 |
| `name` | str | trimmed; case-insensitive unique per workspace |
| `color` | str | hex color string, default `"#9E9E9E"` |
| `icon` | str | Ionicons name, default `"pricetag-outline"` |
| `is_default` | bool | `True` for the 10 built-in categories |
| `workspace_id` | str | FK to workspaces |
| `created_at` | datetime | UTC |

## Collection: `receipts`

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
| `matched_items` | list | `[{item_id, name, receipt_name, price, confidence}]` — `name` is the grocery item name, `receipt_name` is the matching receipt line |
| `error_message` | str\|null | set on failure |

---

## Known Issues & Notes

- **`grocery_items.id` naming inconsistency:** All other collections use `{model}_id` (e.g., `user_id`, `workspace_id`, `list_id`), but grocery items use bare `id`. This is reflected in both backend Pydantic models and frontend TypeScript types.
- **Currency mismatch:** `workspaces.currency` accepts only 6 values (`EUR USD GBP CHF AUD CAD`) on the backend, but the frontend `CURRENCY_SYMBOLS` constant defines 10 (adds `INR JPY CNY KRW`).
- **No pagination:** No endpoints implement pagination, cursor, or limit parameters. Response sizes are unbounded.
- **No explicit indexes documented:** Beyond `users.email` (unique) and `password_reset_codes.expires_at` (TTL), no indexes are defined for high-traffic query paths (`grocery_items` by `list_id`, `categories` by `workspace_id`, etc.).
- **`added_by` not in frontend type:** The `grocery_items.added_by` field exists in the backend model but is omitted from the frontend `GroceryItem` TypeScript type — the UI does not display item attribution.
- **No explicit indexes documented:** See line above — TTL index now also exists on `user_sessions.expires_at` (added alongside `password_reset_codes.expires_at`).
