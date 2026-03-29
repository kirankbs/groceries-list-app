# Frontend Screens & Modals

## Screens

### PantryScreen (`app/screens/PantryScreen.tsx`)
Primary screen. Shows grocery items for `currentList` grouped by category in a `SectionList`. Header shows `currentWorkspace.name` and items-left count. FAB opens AddItemModal. "Quick Add" button opens ReceiptScanModal.
**Key state:** `items`, `categories`, `currentList`, `currentWorkspace` (from AuthContext + parent props)
**Modals it opens:** AddItemModal, EditItemModal, DeleteItemModal, HouseholdSwitcherModal, CreateHouseholdModal, JoinHouseholdModal, HouseholdDetailsModal, DeleteHouseholdModal, ListsModal, CreateListModal, InviteCodeModal, ReceiptScanModal, ProfileModal

### ListsScreen (`app/screens/ListsScreen.tsx`)
Shows active lists as cards with status badges, completed lists as horizontal history chips. Selecting a list calls `onSelectList` + navigates to pantry tab.
**Key state:** `lists`, `currentList` (passed as props)
**Modals:** None directly; "Create New List →" CTA calls `onCreateNew` → index.tsx opens CreateListModal

### CategoriesScreen (`app/screens/CategoriesScreen.tsx`)
FlatList of workspace categories. Tap → CategoryModal for edit (disabled for "Other"). Trash icon → native Alert confirm → DELETE. "Add Category" button → CategoryModal in create mode.
**Key state:** `categories`, `sessionToken`, `currentWorkspace`
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
| `ReceiptScanModal.tsx` | 4-step: picker (photo library only, no camera) → uploading → review (editable prices) → confirming | `visible, font, listId, onClose, onPricesSaved` | PantryScreen "Quick Add" button |
