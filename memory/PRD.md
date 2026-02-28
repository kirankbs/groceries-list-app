# Grocery Todo App - Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** February 2026  
**Platform:** Android (Expo React Native)  
**Status:** MVP Complete

---

## 1. Executive Summary

Grocery Todo is a collaborative shopping list application that allows families and households to manage their grocery shopping together. The app features Google authentication, household sharing with invite codes, category organization, and a modern dark/light theme interface.

### Target Users
- Families managing shared grocery shopping
- Couples coordinating household purchases
- Roommates splitting shopping responsibilities
- Individual users managing personal grocery lists

### Key Value Propositions
- Real-time shared grocery lists
- Family/household collaboration
- Category-based organization
- Cross-platform accessibility (Android, iOS via Expo Go)

---

## 2. Authentication System

### 2.1 Google Social Login
**Feature:** Users authenticate using their Google account via Emergent Auth integration.

**User Flow:**
1. User opens app → Sees login screen
2. Taps "Continue with Google" button
3. Redirected to Google OAuth consent screen
4. After approval, redirected back to app
5. Session token created and stored securely
6. User lands on main grocery list screen

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
| household_id | string | Associated household (nullable) |
| created_at | datetime | Account creation timestamp |

### 2.3 Session Management
- Sessions stored in MongoDB `user_sessions` collection
- Automatic session validation on API requests
- Logout clears session from database and local storage
- Expired sessions automatically rejected (401 response)

---

## 3. Household/Family Sharing System

### 3.1 Household Creation
**Feature:** Users can create a household to share grocery lists with family members.

**User Flow:**
1. User taps profile icon → Profile modal opens
2. Taps "Create or Join Household"
3. Selects "Create New" tab
4. Enters household name (e.g., "Smith Family")
5. Taps "Create Household"
6. Household created with auto-generated invite code
7. Default categories initialized for the household

**Data Model:**
| Field | Type | Description |
|-------|------|-------------|
| household_id | string | Unique identifier (UUID) |
| name | string | Household display name |
| invite_code | string | 8-character invite code |
| owner_id | string | User ID of household creator |
| member_ids | array[string] | List of member user IDs |
| created_at | datetime | Creation timestamp |

### 3.2 Joining a Household
**Feature:** Users can join existing households using an invite code.

**User Flow:**
1. Household owner shares invite code with family member
2. Family member logs into app
3. Taps profile → "Create or Join Household"
4. Selects "Join Existing" tab
5. Enters invite code
6. Taps "Join Household"
7. Added to household member list
8. Now sees shared grocery list

**Validation:**
- Invite code must exist
- User cannot be in another household (must leave first)
- Case-insensitive code matching

### 3.3 Household Member Management
**Features:**
- View all household members with profile pictures
- "Owner" badge displayed next to household creator
- Members can view but not edit invite code
- Owner can regenerate invite code

### 3.4 Leaving a Household
**Scenarios:**
1. **Non-owner leaves:** Simply removed from member list
2. **Owner leaves with other members:** Ownership transfers to first remaining member
3. **Last member leaves:** Household deleted, all associated data (groceries, categories) deleted

### 3.5 Data Isolation
- Groceries are scoped to `household_id`
- Categories are scoped to `household_id`
- Users without household have `household_id: null` (personal list)
- All queries filter by user's household_id

---

## 4. Grocery List Management

### 4.1 View Grocery Items
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
- "Tap to edit" hint
- Delete (trash) icon

### 4.2 Add Grocery Item
**User Flow:**
1. Tap green floating "+" button
2. "Add Grocery Item" modal appears
3. Enter item name (required)
4. Set quantity using +/- buttons or direct input
5. Select category from horizontal scrollable list
6. Tap "Add to List"
7. Item appears at top of relevant category section

**Data Model:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| name | string | Item name |
| quantity | integer | Number of items (default: 1) |
| category | string | Category name |
| checked | boolean | Completion status |
| household_id | string | Associated household |
| added_by | string | User ID who added item |
| created_at | datetime | Creation timestamp |

### 4.3 Edit Grocery Item
**User Flow:**
1. Tap on any item → "Edit Item" modal opens
2. Modify name, quantity, or category
3. Tap "Save Changes"
4. Changes reflected immediately

**Editable Fields:**
- Item name
- Quantity
- Category

### 4.4 Delete Grocery Item
**Methods:**
1. **From list:** Tap trash icon → Confirmation modal → "Delete"
2. **From edit modal:** Tap "Delete Item" → Confirmation modal → "Delete"

**Confirmation Modal:**
- Trash icon in red circle
- "Delete Item?" title
- Confirmation message with item name
- "Cancel" and "Delete" buttons

### 4.5 Check/Uncheck Items
**Behavior:**
- Tap checkbox to toggle checked status
- Checked items show green checkmark
- Checked items have strikethrough text
- **Items remain in their category position** (do not move to bottom)
- Unchecked count updates in header

### 4.6 Search/Filter
**Features:**
- Search bar at top of list
- Real-time filtering as user types
- Filters by item name (case-insensitive)
- Clear button to reset search
- Empty state shown when no matches

---

## 5. Category Management

### 5.1 Default Categories
The app includes 10 pre-configured categories:

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

### 5.2 Create Custom Category
**User Flow:**
1. Tap tags icon in header → "Manage Categories" modal
2. Tap "Create New Category"
3. "New Category" form appears
4. Live preview shows category appearance
5. Enter category name
6. Select color from 15 color options
7. Select icon from 27 icon options
8. Tap "Create Category"

**Customization Options:**
- **Colors (15):** Green, Blue, Red, Orange, Purple, Pink, Cyan, Brown, Gray-Blue, Gray, Deep Orange, Deep Purple, Indigo, Teal, Light Green
- **Icons (27):** pricetag, cart, basket, bag, leaf, water, restaurant, pizza, cafe, ice-cream, snow, cube, home, ellipsis, nutrition, fish, beer, wine, fast-food, flame, medical, fitness, sparkles, heart, star, gift, diamond

### 5.3 Edit Category
**Features:**
- Tap pencil icon on any category
- Modify name, color, or icon
- Live preview updates
- Save changes
- **Automatic item migration:** If category name changes, all items in that category are updated

### 5.4 Delete Category
**Behavior:**
- Tap trash icon on category (not available for "Other")
- Confirmation modal appears
- Upon deletion, all items in that category move to "Other"
- Category removed from list

---

## 6. User Interface Features

### 6.1 Theme System
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

### 6.2 Navigation Structure
```
App
├── Login Screen (unauthenticated)
│   └── "Continue with Google" button
│
└── Main Screen (authenticated)
    ├── Header
    │   ├── Household Name / "Grocery List"
    │   ├── Item count
    │   ├── Categories button (tags icon)
    │   ├── Theme toggle (moon/sun icon)
    │   └── Profile button (avatar)
    │
    ├── Household Banner (if no household)
    │
    ├── Search Bar
    │
    ├── Grocery List (SectionList)
    │   └── Items grouped by category
    │
    └── FAB (Floating Action Button)
```

### 6.3 Modals
| Modal | Trigger | Purpose |
|-------|---------|---------|
| Add Item | FAB (+) button | Create new grocery item |
| Edit Item | Tap on item | Modify existing item |
| Delete Item | Trash icon / "Delete Item" | Confirm item deletion |
| Manage Categories | Tags icon | View/manage categories |
| Category Form | "Create New" / Pencil icon | Create/edit category |
| Delete Category | Trash on category | Confirm category deletion |
| Profile | Profile avatar | User info, household, logout |
| Household | "Create/Join" button | Create or join household |
| Invite Code | "Invite" button | Display shareable code |

### 6.4 Empty States
- **Empty list:** Cart icon + "Your grocery list is empty" + "Tap + to add items"
- **No search results:** Cart icon + "No items found" + "Try a different search term"

### 6.5 Loading States
- Full-screen spinner during initial load
- Button spinners during async operations
- Disabled buttons during processing

---

## 7. Technical Architecture

### 7.1 Technology Stack
| Component | Technology |
|-----------|------------|
| Frontend | Expo (React Native) |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| Authentication | Emergent Auth (Google OAuth) |
| Routing | expo-router (file-based) |
| State Management | React useState/useCallback |
| Secure Storage | expo-secure-store |
| Icons | @expo/vector-icons (Ionicons) |

### 7.2 Project Structure
```
/app
├── /backend
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
│
├── /frontend
│   ├── /app
│   │   ├── _layout.tsx   # Root layout with AuthProvider
│   │   └── index.tsx     # Main application screen
│   │
│   ├── /contexts
│   │   └── AuthContext.tsx  # Authentication context
│   │
│   ├── app.json          # Expo configuration
│   ├── package.json      # Node dependencies
│   └── .env              # Frontend environment
│
└── /tests
```

### 7.3 API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/session | Exchange session_id for token |
| GET | /api/auth/me | Get current user + household |
| POST | /api/auth/logout | Logout user |

#### Households
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/households | Create household |
| POST | /api/households/join | Join with invite code |
| POST | /api/households/leave | Leave household |
| GET | /api/households/invite-code | Get invite code |
| POST | /api/households/regenerate-code | Generate new code |

#### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | List categories |
| POST | /api/categories | Create category |
| PUT | /api/categories/{id} | Update category |
| DELETE | /api/categories/{id} | Delete category |

#### Groceries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/groceries | List grocery items |
| POST | /api/groceries | Create item |
| PUT | /api/groceries/{id} | Update item |
| DELETE | /api/groceries/{id} | Delete item |

### 7.4 Database Collections
```
MongoDB Database: test_database

Collections:
├── users              # User accounts
├── user_sessions      # Active sessions
├── households         # Household groups
├── categories         # Category definitions
└── groceries          # Grocery items
```

---

## 8. Security Considerations

### 8.1 Authentication
- Google OAuth 2.0 via Emergent Auth
- Session tokens stored securely
- 7-day session expiration
- HTTPS-only communication

### 8.2 Authorization
- All API endpoints validate session token
- Data scoped to user's household
- Users can only access their own data

### 8.3 Data Privacy
- No password storage (OAuth only)
- Minimal data collection
- User can delete account data by leaving household

---

## 9. Future Roadmap

### Phase 2: Enhanced Collaboration
- [ ] Push notifications for list updates
- [ ] Item assignment (who should buy)
- [ ] Real-time sync indicators
- [ ] Activity log (who added/completed what)

### Phase 3: Smart Features
- [ ] AI-powered item suggestions
- [ ] Recurring items / favorites
- [ ] Price tracking
- [ ] Budget management

### Phase 4: Advanced Organization
- [ ] Multiple lists (weekly, party, etc.)
- [ ] List templates
- [ ] Item notes/details
- [ ] Barcode scanning

### Phase 5: Social Features
- [ ] Share lists with non-household members
- [ ] Recipe integration
- [ ] Store aisle mapping
- [ ] Deals and coupons

---

## 10. App Store Requirements

### 10.1 Android (Google Play Store)
**Required Permissions:**
- Internet access
- Secure storage

**App Information:**
- App Name: Grocery Todo
- Category: Shopping / Productivity
- Content Rating: Everyone
- Privacy Policy: Required (data collection disclosure)

### 10.2 iOS (App Store)
**Info.plist Descriptions:**
- Camera: Not required
- Location: Not required
- Contacts: Not required

**App Store Connect:**
- Age Rating: 4+
- Privacy Nutrition Labels required

---

## 11. Testing Checklist

### Authentication
- [ ] Google login flow works
- [ ] Session persists across app restarts
- [ ] Logout clears session
- [ ] Expired sessions redirect to login

### Household
- [ ] Create household generates invite code
- [ ] Join household with valid code works
- [ ] Join with invalid code shows error
- [ ] Leave household removes user
- [ ] Owner transfer works when owner leaves
- [ ] Last member leaving deletes household

### Groceries
- [ ] Add item with all fields
- [ ] Edit item updates correctly
- [ ] Delete item with confirmation
- [ ] Check/uncheck toggles status
- [ ] Search filters correctly
- [ ] Items grouped by category

### Categories
- [ ] Default categories load
- [ ] Create custom category
- [ ] Edit category updates items
- [ ] Delete category moves items to "Other"
- [ ] Color and icon selection works

### UI/UX
- [ ] Dark mode toggle works
- [ ] All modals open/close properly
- [ ] Loading states display
- [ ] Empty states display
- [ ] Keyboard handling works

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Feb 2026 | Initial MVP release |
| | | - Google authentication |
| | | - Household sharing |
| | | - Grocery CRUD operations |
| | | - Category management |
| | | - Dark/light theme |

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

## Appendix B: Color Reference

### Brand Colors
- Primary: #4CAF50 (Green)
- Secondary: #2196F3 (Blue)
- Danger: #ff6b6b (Red)
- Warning: #FF9800 (Orange)

### Category Colors
See Section 5.1 for complete list.

---

*Document maintained by Development Team*
*For questions or updates, contact the project lead*
