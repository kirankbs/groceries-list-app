# Key User Flows

**1. First-time Register**
1. Open app → auth gate shown
2. Tap "Register" → enter name, email, password
3. `register()` → POST /auth/register → stores token
4. `fetchUserData(token, true)` → GET /auth/me → personal workspace auto-created
5. Lists + templates fetched; first non-completed list auto-selected
6. App lands on PantryScreen showing empty list

**2. Login (returning user)**
1. Open app → token read from SecureStore/sessionStorage
2. `fetchUserData(token, true)` → GET /auth/me
3. Personal workspace selected; lists loaded
4. If token invalid → auth gate shown

**3. Forgot Password**
1. Login screen → "Forgot Password?" → ForgotPasswordScreen
2. Enter email → POST /api/auth/forgot-password → always shows success message
3. Check email → 6-digit OTP received → navigate to ResetPasswordScreen
4. Enter OTP + new password → POST /api/auth/reset-password
5. On success: all sessions invalidated → redirect to login
6. On wrong code: remaining attempts shown; after 3 → "request new code" message

**4. Add Grocery Item**
1. PantryScreen → tap FAB (+)
2. AddItemModal: enter name, select category chip, adjust quantity, select unit
3. POST /api/items → optimistic append; `update_list_status` triggers

**5. Check Off Item**
1. Tap checkbox → optimistic UI update (immediate state flip)
2. If offline: enqueue to `syncQueue`, increment `pendingSyncCount`, return
3. If online: PUT /api/items/{id} `{checked: true}` → backend calls `update_list_status`
4. All checked → list becomes `completed`
5. On server error → revert optimistic update
6. On unexpected network error (online but request fails) → also enqueue to `syncQueue`

**6. Switch Household**
1. PantryScreen header tap → HouseholdSwitcherModal
2. Select workspace → `setCurrentWorkspace(ws)` → fetches lists + templates
3. Auto-selects first non-completed list; modal closes

**7. Create Shared Household**
1. HouseholdSwitcherModal → "Create New" → CreateHouseholdModal
2. Enter name → POST /api/workspaces → 10 categories initialized, default list created
3. New workspace selected

**8. Invite Member**
1. ProfileModal or HouseholdDetailsModal → "Invite" / "Share Code"
2. `getInviteCode(workspace_id)` → InviteCodeModal shows code + native share

**9. Join Household**
1. HouseholdSwitcherModal → "Join with Code" → JoinHouseholdModal
2. Enter invite code → POST /api/workspaces/join

**10. Scan Receipt**
1. PantryScreen → "Quick Add" button (next to search bar) → ReceiptScanModal (picker step — single "Choose from Library" card, photo library only, no camera)
2. Pick image → upload multipart to POST /api/lists/{id}/upload-receipt
3. Modal → uploading step; polls GET /api/receipts/{id} every 3s; max 40 polls (~2 min) before timeout
4. Completed → review step: matched items list (store name + receipt total shown if present), editable price TextInput per item, running total in workspace currency; `item_name` from backend response is mapped to the `name` field in the `MatchedItem` interface — this field name mismatch means item names render blank in the current code
5. Confirm → POST /api/receipts/{id}/confirm `{confirmed_items: [{item_id, price}]}` → prices written to grocery items

**11. Create List from Template**
1. CreateListModal → "Template" mode → pick template chip
2. `createList(name, undefined, templateId)` → POST /api/lists `{from_template_id}`
3. Backend copies all items (unchecked); `created_from_template_id` set
