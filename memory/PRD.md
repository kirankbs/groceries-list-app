# Grocery Todo App - Product Requirements Document (PRD)

**Version:** 2.5  
**Last Updated:** March 2026  
**Platform:** Android, iOS (Expo React Native), Web  
**Status:** Receipt Scanning (AI-powered, fully working) + All Core Features Working

---

## 1. Executive Summary

Grocery Todo is a collaborative shopping list application that allows families and households to manage their grocery shopping together. The app features Google authentication, **multiple household support**, **multiple shopping lists per household**, category organization, and a modern dark/light theme interface.

### Target Users
- Families managing shared grocery shopping
- Couples coordinating household purchases
- Roommates splitting shopping responsibilities
- Individual users managing personal grocery lists
- Users who belong to multiple households (e.g., own family + extended family)

### Key Value Propositions
- **Multiple Households:** Join and manage grocery lists for different groups
- **Personal Lists:** Every user has a permanent personal space
- **Shopping Sessions:** Multiple lists per household (weekly, party, etc.)
- **Family Collaboration:** Real-time shared grocery lists
- **Category-based Organization:** Customizable category system
- **Cross-platform:** Android APK, iOS via Expo Go, Web preview

---

## 2. Authentication System

### 2.1 Google Social Login
**Feature:** Users authenticate using their Google account via Emergent Auth integration.

**User Flow:**
1. User opens app → Sees login screen with feature highlights
2. Taps "Continue with Google" button
3. Redirected to Google OAuth consent screen
4. After approval, redirected back to app
5. **Personal household + default shopping list auto-created**
6. Session token created and stored securely
7. User lands on main grocery list screen with items ready to add

**Technical Details:**
- Auth Provider: Emergent Auth (https://auth.emergentagent.com/)
- Session Storage: 
  - Mobile: expo-secure-store
  - Web: localStorage
- Session Duration: 7 days
- Token Type: Bearer token in Authorization header

### 2.2 User Profile
**Data Captured:**
| Field | Type | Description |
|-------|------|-------------|
| user_id | string | Unique identifier (auto-generated) |
| email | string | Google account email |
| name | string | Display name from Google |
| picture | string (URL) | Profile picture URL |
| personal_workspace_id | string | User's personal household ID |
| created_at | datetime | Account creation timestamp |

### 2.3 Session Management
- Sessions stored in MongoDB `user_sessions` collection
- Automatic session validation on API requests
- Logout clears session from database and local storage
- Expired sessions automatically rejected (401 response)

---

## 3. Household System (Multi-Workspace Architecture)

### 3.1 Personal Household (Auto-Created) ✅
**Feature:** Every user automatically gets a personal household upon first login.

**Characteristics:**
- Created automatically on first sign-in
- Named "[User Name]'s Personal List"
- Contains a default "My Shopping List"
- Cannot be deleted
- Only the user has access (no sharing)
- Re-created automatically if somehow missing

### 3.2 Shared Households ✅
**Feature:** Users can create multiple shared households for different groups.

**Use Cases:**
- "Smith Family" - for immediate family
- "Roommates" - for apartment sharing
- "Book Club Potluck" - for event planning
- "Office Snacks" - for workplace

**User Flow to Create:**
1. Tap household name in header → Household switcher modal
2. Tap "Create Household"
3. Enter household name (e.g., "My Family")
4. Household created with auto-generated invite code
5. Default categories and shopping list initialized

**Data Model:**
| Field | Type | Description |
|-------|------|-------------|
| workspace_id | string | Unique identifier (UUID) |
| name | string | Household display name |
| type | string | "personal" or "shared" |
| invite_code | string | 8-character invite code (shared only) |
| owner_id | string | User ID of household creator |
| member_ids | array[string] | List of member user IDs |
| created_at | datetime | Creation timestamp |

### 3.3 Joining a Household ✅
**Feature:** Users can join existing households using an invite code.

**User Flow:**
1. Household owner shares invite code with family member
2. Family member opens household switcher
3. Taps "Join Household"
4. Enters invite code
5. Added to household member list
6. Can now switch to and view shared grocery lists

**Validation:**
- Invite code must exist
- User can belong to **multiple households** (no limit)
- Case-insensitive code matching

### 3.4 Household Details & Management ✅
**Features:**
- Share icon on each household in switcher → Quick access to invite code
- Settings icon → Opens household details modal
- View all members with profile pictures
- "Owner" badge displayed next to creator
- **Invite People** button for easy sharing
- **Delete Household** (owner only)
- **Leave Household** (non-owners)

### 3.5 Switching Between Households ✅
**User Flow:**
1. Tap household name in header
2. Household switcher shows all households (personal + shared)
3. Personal household marked with person icon
4. Shared households marked with people icon + member count
5. Tap any household to switch
6. Shopping lists reload for selected household

### 3.6 Deleting a Household ✅
**Rules:**
- Personal household cannot be deleted
- Only owner can delete shared households
- Confirmation modal required
- Deletes all shopping lists and items in that household
- Members automatically removed

---

## 4. Shopping Lists (Multi-List Support)

### 4.1 List Overview ✅
**Feature:** Each household can have multiple shopping lists.

**Use Cases:**
- "Weekly Groceries" - regular shopping
- "Party Supplies" - event planning
- "Costco Run" - bulk shopping
- "Quick Stop" - convenience items

### 4.2 List Status System ✅
**Statuses:**
| Status | Color | Description |
|--------|-------|-------------|
| Active | Blue (#2196F3) | New list, ready for items |
| In Progress | Orange (#FF9800) | Some items checked |
| Completed | Green (#4CAF50) | All items checked / manually marked |

**Auto-Status Updates:**
- List starts as "Active"
- Becomes "In Progress" when first item is checked
- Can be manually marked "Completed"
- Completed lists can be **reopened** to Active status

### 4.3 Creating a Shopping List ✅
**User Flow:**
1. Tap list name under household → Lists modal opens
2. Tap "Create New List"
3. Enter list name
4. Choose creation method:
   - **Blank:** Start fresh
   - **From Template:** Copy from saved template
   - **Copy List:** Duplicate existing list
5. List created and selected

### 4.4 List Actions ✅
| Action | Trigger | Description |
|--------|---------|-------------|
| Select List | Tap in list modal | Switch to different list |
| Mark Complete | "Mark Complete" button | Change status to completed |
| Reopen List | "Reopen List" button | Change completed back to active |
| Save as Template | (Coming soon) | Save list structure for reuse |
| Delete List | (Coming soon) | Remove list and all items |

### 4.5 Completed Lists History ✅
- Completed lists appear in "Completed" section
- Can view past shopping trips
- Reopen any completed list to continue shopping
- Helps track shopping patterns

---

## 5. Grocery Item Management

### 5.1 View Grocery Items ✅
**Features:**
- Items grouped by category with section headers
- Category icon and color displayed
- Item count badge per category
- Unchecked items count in header
- Search/filter functionality
- Empty state with helpful message

**Display Elements per Item:**
- Checkbox (tap to toggle)
- Item name (strikethrough when checked)
- Quantity badge (shown if > 1)
- Delete (trash) icon

### 5.2 Add Grocery Item ✅
**User Flow:**
1. Tap green floating "+" button
2. "Add Grocery Item" modal appears
3. Enter item name (required)
4. Set quantity using +/- buttons or direct input
5. Select category from horizontal scrollable list
6. Tap "Add to List"
7. Item appears in relevant category section

**Data Model:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| list_id | string | Associated shopping list |
| name | string | Item name |
| quantity | integer | Number of items (default: 1) |
| category | string | Category name |
| checked | boolean | Completion status |
| created_at | datetime | Creation timestamp |

### 5.3 Edit Grocery Item ✅
**User Flow:**
1. Tap on any item → "Edit Item" modal opens
2. Modify name, quantity, or category
3. Tap "Save Changes"
4. Changes reflected immediately

### 5.4 Delete Grocery Item ✅
**Methods:**
1. **From list:** Tap trash icon → Confirmation modal → "Delete"
2. **From edit modal:** Tap "Delete Item" → Confirmation modal → "Delete"

### 5.5 Check/Uncheck Items ✅
**Behavior:**
- Tap checkbox to toggle checked status
- Checked items show green checkmark
- Checked items have strikethrough text
- **Items remain in their category position** (do not move)
- Unchecked count updates in header
- Auto-updates list status (Active → In Progress)

### 5.6 Search/Filter ✅
**Features:**
- Search bar at top of list
- Real-time filtering as user types
- Filters by item name (case-insensitive)
- Clear button to reset search
- Empty state shown when no matches

---

## 6. Category Management

### 6.1 Default Categories ✅
Each household gets 10 pre-configured categories:

| Category | Color | Icon |
|----------|-------|------|
| Produce | #4CAF50 (Green) | leaf-outline |
| Dairy | #2196F3 (Blue) | water-outline |
| Meat | #F44336 (Red) | restaurant-outline |
| Bakery | #FF9800 (Orange) | pizza-outline |
| Beverages | #9C27B0 (Purple) | cafe-outline |
| Snacks | #E91E63 (Pink) | ice-cream-outline |
| Frozen | #00BCD4 (Cyan) | snow-outline |
| Pantry | #795548 (Brown) | cube-outline |
| Household | #607D8B (Gray-Blue) | home-outline |
| Other | #9E9E9E (Gray) | ellipsis-horizontal-outline |

### 6.2 Custom Categories ✅
- Create categories with custom name, color, and icon
- Edit existing categories
- Delete categories (items move to "Other")
- 15 color options, 27 icon options

---

## 7. User Interface

### 7.1 Safe Area Handling ✅
**Feature:** Proper handling of device notches and status bars.

- Uses `useSafeAreaInsets` hook for precise measurements
- Header properly positioned below status bar/notch
- FAB positioned above home indicator on gesture navigation devices
- Works correctly on all Android and iOS devices

### 7.2 Theme System ✅
**Light Mode (Default):**
- Background: #f8f9fa
- Surface: #ffffff
- Text: #2d3436
- Secondary Text: #636e72

**Dark Mode:**
- Background: #121212
- Surface: #1e1e1e
- Text: #ffffff
- Secondary Text: #b0b0b0

**Toggle:** Moon/sun icon in header

### 7.3 Navigation Structure ✅
```
App
├── Login Screen (unauthenticated)
│   ├── App logo and tagline
│   ├── Feature highlights (Multiple households, Share with family, etc.)
│   └── "Continue with Google" button
│
└── Main Screen (authenticated)
    ├── Header
    │   ├── Household Selector (tap to switch)
    │   ├── List Selector (tap to change lists)
    │   ├── Categories button
    │   ├── Theme toggle
    │   └── Profile button
    │
    ├── List Status Bar (Active/In Progress/Completed)
    │   └── Mark Complete / Reopen List button
    │
    ├── Search Bar
    │
    ├── Grocery List (SectionList grouped by category)
    │
    └── FAB (Floating Action Button)
```

### 7.4 Modals ✅
| Modal | Trigger | Purpose |
|-------|---------|---------|
| Household Switcher | Tap household name | Switch households, create/join |
| Create Household | From switcher | Create new shared household |
| Join Household | From switcher | Enter invite code |
| Household Details | Settings icon | View members, invite, delete |
| Delete Household | From details | Confirm deletion |
| Shopping Lists | Tap list name | Switch lists, create new |
| Create List | From lists modal | New list with options |
| Add Item | FAB (+) | Create grocery item |
| Edit Item | Tap item | Modify item |
| Delete Item | Trash icon | Confirm deletion |
| Manage Categories | Tags icon | View/manage categories |
| Profile | Profile avatar | User info, logout |
| Invite Code | Invite button | Display shareable code |

---

## 8. Technical Architecture

### 8.1 Technology Stack
| Component | Technology |
|-----------|------------|
| Frontend | Expo (React Native) |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| Authentication | Emergent Auth (Google OAuth) |
| Routing | expo-router (file-based) |
| State Management | React Context + useState |
| Secure Storage | expo-secure-store |
| Icons | @expo/vector-icons (Ionicons) |
| Safe Areas | react-native-safe-area-context |

### 8.2 Project Structure
```
/app
├── /backend
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
│
├── /frontend
│   ├── /app
│   │   ├── _layout.tsx   # Root layout with providers
│   │   └── index.tsx     # Main application screen
│   │
│   ├── /contexts
│   │   └── AuthContext.tsx  # Auth + workspace state
│   │
│   ├── app.json          # Expo configuration
│   ├── package.json      # Node dependencies
│   └── .env              # Frontend environment
│
└── /memory
    └── PRD.md            # This document
```

### 8.3 API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/session | Exchange session_id for token |
| GET | /api/auth/me | Get user + workspaces (auto-creates personal if missing) |
| POST | /api/auth/logout | Logout user |

#### Workspaces (Households)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces | List user's workspaces |
| POST | /api/workspaces | Create shared workspace |
| DELETE | /api/workspaces/{id} | Delete workspace (owner only) |
| POST | /api/workspaces/join | Join with invite code |
| POST | /api/workspaces/{id}/leave | Leave workspace |
| GET | /api/workspaces/{id}/invite-code | Get invite code |
| POST | /api/workspaces/{id}/regenerate-code | Generate new code |

#### Shopping Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{id}/lists | List shopping lists |
| POST | /api/lists | Create shopping list |
| PUT | /api/lists/{id} | Update list (name, status) |
| DELETE | /api/lists/{id} | Delete list |
| GET | /api/workspaces/{id}/templates | List templates |
| POST | /api/lists/{id}/save-template | Save as template |

#### Grocery Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/lists/{id}/items | List items in shopping list |
| POST | /api/items | Create item |
| PUT | /api/items/{id} | Update item |
| DELETE | /api/items/{id} | Delete item |

#### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{id}/categories | List categories |
| POST | /api/categories | Create category |
| PUT | /api/categories/{id} | Update category |
| DELETE | /api/categories/{id} | Delete category |

### 8.4 Database Collections
```
MongoDB Database: test_database

Collections:
├── users              # User accounts
├── user_sessions      # Active sessions
├── workspaces         # Households (personal + shared)
├── shopping_lists     # Shopping lists per workspace
├── grocery_items      # Items per shopping list
└── categories         # Categories per workspace
```

---

## 9. Future Roadmap

### Phase 3: Smart Shopping (High Impact) 🎯
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **AI Item Suggestions** | High | Medium | P1 |
| Auto-suggest items based on history | | | |
| "You usually buy milk on Sundays" | | | |
| **Voice Input** | High | Low | P1 |
| "Add 2 gallons of milk" | | | |
| Uses device speech recognition | | | |
| **Barcode Scanner** | High | Medium | P2 |
| Scan product barcodes to add items | | | |
| Auto-fill name and category | | | |
| **Smart Quantities** | Medium | Low | P2 |
| "Low on eggs" reminders | | | |
| Typical quantity suggestions | | | |

### Phase 4: Enhanced Collaboration (High Impact) 🎯
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Real-time Sync Indicators** | High | Medium | P1 |
| See when family member is shopping | | | |
| "Dad is at the store" badge | | | |
| **Push Notifications** | High | Medium | P1 |
| "Mom added 5 items to the list" | | | |
| "Weekly shopping list is ready" | | | |
| **Item Assignment** | Medium | Low | P2 |
| Assign items to specific members | | | |
| "You pick up milk, I'll get bread" | | | |
| **Activity Feed** | Medium | Medium | P2 |
| See who added/completed what | | | |
| Timeline of list changes | | | |
| **Comments on Items** | Low | Low | P3 |
| "Get the organic one" notes | | | |

### Phase 5: Budget & Pricing (Medium Impact)
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Price Tracking** | Medium | High | P2 |
| Log prices when shopping | | | |
| See price history per item | | | |
| **Budget Mode** | Medium | Medium | P2 |
| Set weekly/monthly budget | | | |
| Running total as you add items | | | |
| **Store Comparison** | Medium | High | P3 |
| Compare prices across stores | | | |
| "Milk is cheaper at Costco" | | | |
| **Receipt Scanning** | Medium | High | P3 |
| Scan receipts to log purchases | | | |
| Auto-update price database | | | |

### Phase 6: Meal Planning Integration (Medium Impact)
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Recipe Import** | High | Medium | P2 |
| Paste recipe URL → extract ingredients | | | |
| Add all ingredients to list | | | |
| **Meal Planner** | Medium | High | P3 |
| Plan meals for the week | | | |
| Auto-generate shopping list | | | |
| **Nutrition Info** | Low | High | P4 |
| Calorie/macro tracking | | | |
| Dietary restriction flags | | | |

### Phase 7: Store Experience (Lower Impact)
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Store Aisle Mapping** | Medium | High | P3 |
| Sort items by store aisle | | | |
| Efficient shopping route | | | |
| **Store Deals Integration** | Medium | High | P3 |
| Show current deals for items | | | |
| "Milk is on sale at Target" | | | |
| **Curbside Pickup Integration** | Medium | Very High | P4 |
| Convert list to store order | | | |
| Instacart/Walmart integration | | | |

### Phase 8: Social & Sharing (Lower Impact)
| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Public List Sharing** | Low | Medium | P3 |
| Share list via link (read-only) | | | |
| No account needed to view | | | |
| **Community Templates** | Low | Medium | P4 |
| Browse popular list templates | | | |
| "Thanksgiving dinner" template | | | |

---

## 10. Recommended Next Steps

### Immediate (Next Sprint)
1. **Delete Shopping List** - Currently missing from UI (backend supports it)
2. **Pull-to-Refresh** - Reload data with swipe gesture
3. **List Templates** - Save and reuse list structures

### Short-term (Next Month)
1. **Voice Input** - Quick item addition via speech
2. **Push Notifications** - List update alerts
3. **Item Notes** - Add details to items

### Medium-term (Next Quarter)
1. **Real-time Sync** - See family member shopping status
2. **AI Suggestions** - Smart item recommendations
3. **Barcode Scanner** - Quick product addition

---

## 11. Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Feb 2026 | Multi-household architecture |
| | | - Multiple households per user |
| | | - Personal household auto-creation |
| | | - Multiple shopping lists per household |
| | | - List status (active/in-progress/completed) |
| | | - Reopen completed lists |
| | | - Household deletion |
| | | - Invite people UI improvements |
| | | - Mobile safe area fix |
| | | - Renamed "Workspace" to "Household" |
| 2.2.0 | Feb 2026 | Native verification + PRD cleanup |
| | | - **VERIFIED on native APK:** Category Management CRUD fully working |
| | | - **VERIFIED on native APK:** Item delete (trash icon) working correctly |
| | | - Environment separation documented (preview vs. production backends) |
| 2.1.0 | Feb 2026 | Bug fixes + Category Management CRUD |
| | | - **FIXED:** Household switching state bug on native mobile (circular useEffect dependency) |
| | | - **FEATURE:** Full category CRUD (Create/Edit/Delete) |
| | | - Category form with name, color picker (15 colors), icon picker (41 icons) |
| | | - 20+ new grocery-relevant icons (shirt, medical, sparkles, pharmacy, electronics, etc.) |
| | | - Delete category moves items to "Other" |
| | | - Duplicate name validation (case-insensitive) |
| | | - "Other" category protected from deletion |
| | | - Live preview in category form |
| | | - Single-modal architecture (fixes Android modal-stacking limitation) |
| 1.0.0 | Feb 2026 | Initial MVP release |
| | | - Google authentication |
| | | - Single household sharing |
| | | - Grocery CRUD operations |
| | | - Category management |
| | | - Dark/light theme |

---

## 12. Known Limitations

### Current Version (2.2)
- No offline support (requires internet)
- No push notifications yet
- Cannot delete shopping lists from UI (only from backend)
- No real-time sync between users
- Two separate environments (preview dev vs. production APK) have separate databases — expected behaviour

### Technical Debt
- `frontend/app/index.tsx` is ~1500 lines and needs to be split into smaller components (`CategoryModal`, `ItemRow`, `ListsModal`, etc.)
- TypeScript type for `item_count` not defined in ShoppingList interface
- `shadow*` style props deprecated in Expo web (should migrate to `boxShadow`)

---

## Appendix A: Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=<backend-url>
EXPO_PACKAGER_PROXY_URL=<proxy-url>
EXPO_PACKAGER_HOSTNAME=<hostname>
```

---

## Appendix B: Terminology

| Term | Definition |
|------|------------|
| Household | A group that shares grocery lists (was "Workspace") |
| Personal Household | User's private space, auto-created |
| Shared Household | Collaborative space with invite code |
| Shopping List | A single grocery list within a household |
| Shopping Session | Alternative name for shopping list |
| Template | Reusable list structure |

---

*Document maintained by Development Team*  
*Last updated: February 2026*  
*For questions or updates, contact the project lead*
