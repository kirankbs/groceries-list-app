# API Reference

All endpoints prefixed with `/api`. Auth = Bearer token required unless noted.

## Auth

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{email, password (min 8), name}` | `{user, session_token}` |
| POST | `/api/auth/login` | No | `{email, password}` | `{user, session_token}`; invalidates prior sessions |
| GET | `/api/auth/me` | Yes | — | `{user, workspaces[]}` with member details; creates personal workspace if missing |
| POST | `/api/auth/logout` | Yes | — | `{message}`; deletes session + clears cookie |
| POST | `/api/auth/forgot-password` | No | `{email}` | Always `{message: "If an account..."}` regardless of whether email exists |
| POST | `/api/auth/reset-password` | No | `{email, code, new_password (min 8)}` | `{message}` on success; 400 on invalid/expired code |

## Workspaces

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

## Lists

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/workspaces/{workspace_id}/lists` | Yes | — | `ShoppingList[]` (non-templates) with `total_items`, `checked_items`; sorted created_at desc |
| GET | `/api/workspaces/{workspace_id}/templates` | Yes | — | `ShoppingList[]` (templates only) with `item_count`; sorted created_at desc |
| POST | `/api/lists` | Yes | `{name, workspace_id, copy_from_list_id?, from_template_id?}` | New `ShoppingList`; copies items if source provided (all unchecked) |
| PUT | `/api/lists/{list_id}` | Yes | `{name?, status?}` | Updated `ShoppingList`; setting `status=completed` sets `completed_at` |
| DELETE | `/api/lists/{list_id}` | Yes | — | `{message}`; cascades items |
| POST | `/api/lists/{list_id}/save-as-template` | Yes | — | New template `ShoppingList` named `"{name} (Template)"`; copies items unchecked |

## Items

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/lists/{list_id}/items` | Yes | — | `GroceryItem[]` sorted created_at desc |
| POST | `/api/items` | Yes | `{list_id, name, quantity?, unit?, category?}` | New `GroceryItem`; triggers `update_list_status` |
| PUT | `/api/items/{item_id}` | Yes | `{checked?, name?, quantity?, unit?, category?, price?}` | Updated `GroceryItem`; if checked changed → triggers `update_list_status` |
| DELETE | `/api/items/{item_id}` | Yes | — | `{message}`; triggers `update_list_status` |

## Categories

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/workspaces/{workspace_id}/categories` | Yes | — | `Category[]` sorted by name asc |
| POST | `/api/categories` | Yes | `{name, color?, icon?, workspace_id}` | New `Category`; 400 if name exists (case-insensitive) |
| PUT | `/api/categories/{category_id}` | Yes | `{name?, color?, icon?}` | Updated `Category`; if name changed → bulk updates all items in workspace |
| DELETE | `/api/categories/{category_id}` | Yes | — | `{message}`; moves all items with this category → `"Other"` |

**Note:** `CategoryModal.tsx` uses the correct URL patterns as of the current codebase:
- **POST** (create): `POST /api/categories` with `{name, color, icon, workspace_id}` in request body
- **PUT** (edit): `PUT /api/categories/{category_id}` with `{name, color, icon}`
- **DELETE** (in `CategoriesScreen.tsx`): `DELETE /api/categories/{category_id}`

## Receipts

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/lists/{list_id}/upload-receipt` | Yes | `multipart/form-data: image` (JPEG/PNG/WEBP, max 10 MB) | `{receipt_id, status: "processing"}` |
| GET | `/api/receipts/{receipt_id}` | Yes | — | Receipt doc with `raw_items_count` (int) |
| GET | `/api/lists/{list_id}/receipts` | Yes | — | `Receipt[]` sorted uploaded_at desc |
| POST | `/api/receipts/{receipt_id}/confirm` | Yes | `{confirmed_items: [{item_id, price}]}` | `{updated_items[], receipt_id}` |

## Root

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/` | No | `{message: "Grocery Todo API v2.0 - Multi-Workspace Support"}` |
