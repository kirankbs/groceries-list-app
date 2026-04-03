# Frontend Screens & Modals

## Screens

### PantryScreen (`app/screens/PantryScreen.tsx`)
Primary screen. Shows grocery items for `currentList` grouped by category in a `SectionList`. Items within each category section are sorted with unchecked items first, checked items sink to the bottom. Header shows `currentWorkspace.name` (tapping it opens HouseholdSwitcherModal) and an "N items left" chip that counts **unchecked** items (tapping it opens ListsModal). A search bar below the header filters items by name client-side. The "Quick Add" button (next to the search bar) opens ReceiptScanModal and is disabled when no list is selected. FAB (+) opens AddItemModal. Each item row shows name, quantity+unit badge, price badge (currency symbol derived from `CURRENCY_SYMBOLS[currentWorkspace.currency]`), and a trash icon. Tapping the item name opens EditItemModal.
**Key state:** `items`, `categories`, `currentList`, `currentWorkspace` (from AuthContext + parent props); `searchQuery` (local)
**Modals it opens:** AddItemModal, EditItemModal, DeleteItemModal, HouseholdSwitcherModal, CreateHouseholdModal, JoinHouseholdModal, HouseholdDetailsModal, DeleteHouseholdModal, ListsModal, CreateListModal, InviteCodeModal, ReceiptScanModal, ProfileModal


### ListsScreen (`app/screens/ListsScreen.tsx`)
Shows active lists as cards with status badges, completed lists as horizontal history chips. Selecting a list calls `onSelectList` + navigates to pantry tab.
**Key state:** `lists`, `currentList` (passed as props)
**Modals:** None directly; "Create New List →" CTA calls `onCreateNew` → index.tsx opens CreateListModal

### CategoriesScreen (`app/screens/CategoriesScreen.tsx`)
FlatList of workspace categories. Each card shows the category icon, name, and an item count badge (`N ITEMS` for custom categories, `DEFAULT` for "Other"). Tap → CategoryModal for edit (disabled for "Other"). Trash icon → native `Alert.alert` confirm → `DELETE /api/categories/{id}` (no trash icon shown for "Other"). "Add Category" button in footer → CategoryModal in create mode. Footer also contains an inert "Pro Tip" card. Header has an "Edit" button that is currently a no-op (not wired to any action).
**Key state:** `categories`, `sessionToken`, `currentWorkspace`, `items` (passed as prop — used for computing per-category item counts)
**Modals:** CategoryModal

### SettingsScreen (`app/screens/SettingsScreen.tsx`)
User card, light/dark/system appearance segmented control, household settings/members rows, notifications/privacy stubs, logout.
**Key state:** `user`, `currentWorkspace`, `colorMode` (ThemeContext)
**Modals:** calls `onOpenHouseholdDetails` prop → index.tsx opens HouseholdDetailsModal

### Auth Screens (unauthenticated gate in `app/index.tsx`)
- **LoginScreen**: email + password inputs, Sign In button, "Forgot Password?" link, "Register" link
- **RegisterScreen**: name, email, password inputs, Register button
- **ForgotPasswordScreen**: email input, "Send Reset Code" button, back to login link
- **ResetPasswordScreen**: 6-digit OTP input, new password input, confirm password input, "Reset Password" button

---

## Modals Catalogue

| Filename | Purpose | Key Props | Opened From |
|---|---|---|---|
| `AddItemModal.tsx` | Create new grocery item: name, category chips, quantity stepper, unit chips | `visible, font, categories, sessionToken, currentList, onClose, onItemAdded` | PantryScreen FAB |
| `EditItemModal.tsx` | Edit existing item: same fields as add + delete trigger | `visible, font, categories, sessionToken, item, onClose, onItemUpdated, onDeleteRequest` | PantryScreen item row tap |
| `DeleteItemModal.tsx` | Confirm item deletion (fade modal, centered) | `visible, font, sessionToken, item, onClose, onDeleted` | PantryScreen trash icon / EditItemModal delete link |
| `CategoryModal.tsx` | Create/edit category: name, color palette (15 colors), icon grid (37 icons), live preview | `visible, font, category, sessionToken, currentWorkspace, onClose, onSaved` | CategoriesScreen |
| `CreateListModal.tsx` | Create list with 3 modes: blank / from template / copy existing | `visible, font, templates, lists, onClose, onCreated` | ListsScreen CTA, PantryScreen header |
| `ListsModal.tsx` | Bottom sheet to switch active list or create new | `visible, font, currentWorkspace, currentList, activeLists, completedLists, templates, onClose, onSelectList, onCreateNew` | PantryScreen "N items left" button |
| `HouseholdSwitcherModal.tsx` | Switch between user's workspaces; create new / join with code | `visible, font, workspaces, currentWorkspace, onClose, onSelect, onCreateNew, onJoin` | PantryScreen menu/household header tap |
| `CreateHouseholdModal.tsx` | Create a new shared workspace by name | `visible, font, onClose, onCreated` | HouseholdSwitcherModal "Create New" |
| `JoinHouseholdModal.tsx` | Join a household by entering invite code | `visible, font, onClose, onJoined, onCreateNew?` | HouseholdSwitcherModal "Join with Code" |
| `HouseholdDetailsModal.tsx` | View details: name, est. date, invite code card, members list, role badges; actions: share code, leave, delete | `visible, font, household, userId, onClose, onInvite, onDelete, onLeave` | PantryScreen, SettingsScreen |
| `DeleteHouseholdModal.tsx` | Confirm household deletion (fade, centered, loading state) | `visible, font, householdName, loading, onClose, onConfirm` | HouseholdDetailsModal, index.tsx |
| `InviteCodeModal.tsx` | Display invite code for sharing (fade, centered) | `visible, font, inviteCode, onClose` | PantryScreen, index.tsx |
| `ProfileModal.tsx` | User profile: avatar, name, email; member list, invite/leave actions; logout | `visible, font, user, currentWorkspace, onClose, onInvite, onLeave, onLogout` | PantryScreen person icon |
| `ReceiptScanModal.tsx` | 4-step: picker (single "Choose from Library" card — photo library only, no camera option) → uploading → review (matched items with editable price inputs, store name, receipt total, running total) → confirming | `visible, font, listId, onClose, onPricesSaved` | PantryScreen "Quick Add" button |
