# UI Screen Specifications

Design source: Google Stitch. Font stack: Plus Jakarta Sans (headlines) + Inter (body). Primary: `#006a28` (light) / `#5cfd80` (dark). All measurements are CSS-equivalent; translate to React Native StyleSheet proportionally.

---

## Login Screen

**Purpose:** Authentication entry point.

**Layout:** Full-screen. Desktop: two-column (left branding, right form). Mobile: single column, form only.

**Left column (desktop only):**
- App logo: 48×48px container `bg:#006a28`, `border-radius:12px`, white `restaurant_menu` icon
- Title: "The Living Pantry" — Plus Jakarta Sans, 36px, extrabold, italic, `#006a28`
- Tagline: "Your household's shared grocery curator. Elevating the art of the shopping list." — gray, 20px
- Feature bento grid (3 cards):
  - Card 1: "Collaborative Lists" — light surface, 40×40px green icon container, bold title + gray description
  - Card 2: "Real-time Sync" — light surface, blue icon container
  - Card 3 (hero, full-width): "Smart Categories" — `bg:#006a28`, white text, 32px bold headline, two category chips with checkmark icons

**Right column / main (mobile):**
- Card: max-width 400px, `bg:#ffffff`, `border-radius:32px`, soft shadow, padding 32px
- "Welcome Back" — 24px bold
- "Sign in to sync your pantry lists" — gray, 14px

**Authentication elements (implementation: email/password only; Google button shown in design but not wired):**
- Email input: full-width, `bg:#eae7e7`, height 48px, padding 12px, placeholder `hello@livingpantry.com`, focus ring primary
- Sign In button: full-width, `bg:#006a28`, white bold 16px, height 56px, `border-radius:16px`, shadow, `scale(0.95)` on active
- Forgot Password link: small gray text below Sign In button → navigates to ForgotPasswordScreen
- Register link: "Don't have an account? Register" — small gray text

**Footer:** "By continuing, you agree to our Terms of Service and Privacy Policy" — gray, 12px

**Dark mode:** background `#0e0e0e`, card `#121212`, primary CTA stays `#5cfd80`, text `#f3f0ef`

---

## Main List Screen (Pantry Dashboard)

**Purpose:** Primary grocery list view. Shows items grouped by category.

**Top App Bar (sticky):**
- Left: menu icon `#006a28` + app title "The Living Pantry" bold 20px + household name "Personal Home" uppercase 10px gray
- Right: item counter badge ("12 items left" — green pill `bg:#5cfd80/20`, `#006a28` text) + user avatar 40×40px rounded-full with primary/10 border
- `bg:#f9f6f5`, 1px divider below, sticky

**Page Header:**
- List name: "Weekly Groceries" — 36px extrabold, tracking tight
- Subtitle: "Curated essentials for the upcoming week." — gray variant, 16px

**Search bar:** full-width, `border-radius:32px`, `bg:#ffffff`, shadow, left search icon gray, placeholder "Search pantry or add new item...", right "Quick Add" blue pill button

**Category Sections (SectionList):**

*Each section header:* icon + category name bold 20px + "N Items" gray badge

*Item card layout:*
- `bg:#ffffff`, `border-radius:32px`, padding 20px, hover scale + shadow
- Left: 24×24px checkbox (empty: `border:#c1c9bd`; checked: `bg:#006a28` with white checkmark)
- Item name: bold (unchecked) / strikethrough gray 40% opacity (checked)
- Quantity badge: `bg:#ff9727/15` orange text (unchecked) / `bg:#eae7e7` gray (checked)
- Delete icon: hidden until hover/press, `color:#ba1a1a`

**FAB:** fixed bottom-right, 64×64px, `bg:#006a28`, white `+` icon, `border-radius:32px`, shadow

**Bottom Tab Bar (fixed):**
- Height: 80px, `bg` dark with backdrop blur
- 4 tabs: **Pantry** | **Lists** | **Categories** | **Settings**
- Each: icon + label 11px Inter uppercase
- Active: `bg:#5cfd80/20` pill, `#006a28` text, filled icon
- Inactive: gray text, outline icon

**Dark mode:** background `#0a0a0a`, cards `#1c1c1c`, category sections `#242424`

---

## Add / Edit Item Modal

**Purpose:** Create or edit a grocery item. Bottom sheet on mobile, centered dialog on desktop.

**Backdrop:** `bg:black/20`, `backdrop-blur:2px`. Modal: `bg:#ffffff`, max-width 672px, `border-radius:32px`, padding 32px.

**Header:**
- "Add New Item" / "Edit Item" — Plus Jakarta Sans 24px bold
- Close button: 40×40px `bg:#eae7e7` rounded-full, `×` icon

**Form fields:**

*Item Name:*
- Label: "ITEM NAME" uppercase 12px bold gray
- Input: full-width `bg:#eae7e7`, `border-radius:16px`, height 48px, padding 20px, font-size 18px medium, placeholder "Organic Honey Crisp Apples", focus ring primary

*Category selector (horizontal scroll, no scrollbar):*
- Label: "CATEGORY" uppercase 12px bold gray
- Pills: active → `bg:#5cfd80/20` text `#006a28` icon+label; inactive → `bg:#eae7e7` gray text
- Categories: Produce, Dairy, Meat, Pantry, Bakery, Household (icons from AVAILABLE_ICONS)

*Quantity:*
- Label: "QUANTITY" uppercase 12px bold gray
- Container: `bg:#eae7e7`, height 60px, `border-radius:16px`, padding 8px
- Minus button: 44×44px `bg:#ffffff` gray text
- Quantity display: 32px bold centered
- Plus button: 44×44px `bg:#006a28` white icon

*Unit:*
- Label: "UNIT" uppercase 12px bold gray
- Select: full-width `bg:#eae7e7`, `border-radius:16px`, height 60px, `expand_more` icon right

**Footer:**
- Cancel: flex-1, `bg:#eae7e7`, gray bold
- Save Item: flex-2, `bg:#006a28`, white bold, save icon, shadow

**Dark mode:** modal `bg:#1a1c1a`, inputs `bg:#1e201e`, text `#e2e3df`, active category `bg:#00531c`

---

## Category Form (Add / Edit Category)

**Purpose:** Create or edit a category with name, color, and icon.

**Header (sticky):** back arrow `#006a28`, title "Edit Category" / "Add Category" bold 18px `#006a28`, 1px divider below

**Form sections (scrollable):**

*1. Live Preview:*
- Label: "PREVIEW" uppercase 14px gray
- Container: `bg:#eae7e7`, `border-radius:16px`, padding 40px, dashed border
- Shows category chip: `bg:#5cfd80/20`, icon + name, bold 18px
- Sub-text: "How it will look in your pantry" — gray 12px

*2. Category Name:*
- Label: "Category Name" bold 16px
- Input: full-width `bg:#ffffff`, 1px border `#c1c9bd`, `border-radius:16px`, padding 16px, height 56px, font 18px medium, placeholder "e.g. Organic Greens", focus ring 2px primary

*3. Color Picker ("Vibrant Palette"):*
- Label: "Vibrant Palette" bold 16px + "15 Selected" badge `bg:#5cfd80/20`
- Container: `bg:#eae7e7`, padding 24px, `border-radius:32px`
- Grid: 5 columns, gap 16px
- 15 circles: 40×40px rounded-full; selected shows 2px ring + 16px offset; colors = AVAILABLE_COLORS

*4. Icon Picker ("Curated Icon"):*
- Label: "Curated Icon" bold 16px
- Container: `bg:#eae7e7`, padding 24px, `border-radius:32px`, max-height 288px scrollable
- Grid: 6 columns
- 40+ icon buttons: 40×40px, `border-radius:12px`; selected → `bg:#5cfd80/30` `#006a28` text; others → gray, hover → primary

**Bottom action bar (fixed):**
- `bg:#f9f6f5/80`, `backdrop-blur`
- Save button: full-width, `bg:#006a28`, white bold 18px, height 80px, `border-radius:32px`, save icon + "Save Category"

**Dark mode:** modal `bg:#1a1c1a`, containers `bg:#2d2e2d`, text `#e2e3df`, selected icon `bg:#5cfd80/10`

---

## Category Management Screen

**Purpose:** View and manage all workspace categories.

**Header (sticky):** back arrow `#006a28`, title "Categories" bold xl, right "Edit" text button `#006a28`

**Hero text:** "Organize your kitchen essentials by tailoring categories to your household needs" — gray medium 18px

**Category cards grid (2 columns on desktop, 1 on mobile):**

Each card: `border-radius:16px`, padding 20px, flex row

- Icon container: 48×48px `border-radius:16px`, category-colored bg
- Title: bold 18px
- Subtitle: "N Items" — uppercase 10px gray
- Delete button: right-aligned, appears on hover, `color:#ba1a1a`

Predefined card styles:
- Produce: `bg:#ffffff` (elevated/active), `bg:#5cfd80/20` icon, `leaf` icon `#006a28`
- Dairy: `bg:#eae7e7`, blue icon container
- Protein/Meat: `bg:#eae7e7`, red icon container
- Bakery: `bg:#eae7e7`, orange-brown icon container
- Other (default): `bg:#f3f0ef`, muted icon, no delete button

**Add Category button:** centered, gradient `#006a28 → #004d1c`, `#cfffce` text, `border-radius:16px`, padding 16px 32px, `add_circle` icon + "Add Category"

**Pro Tip card:** `bg:#5cfd80/10`, `border:#006a28/10`, `border-radius:24px`, padding 24px; icon image (hidden on mobile) + "Pro Tip" bold primary + description text gray

**Bottom tab bar:** same as Main List Screen, Categories tab active

**Dark mode:** cards `bg:#1c1c1c`, elevated card `bg:#2a2a2a`

---

## Household Switcher Modal

**Purpose:** Switch between user's households, create new, or join with code.

**Backdrop:** fixed, `backdrop-blur:8px`, `bg:#0e0e0e/40`

**Modal:** bottom sheet on mobile (`border-radius-top:40px`), centered on desktop (`border-radius:32px`); `bg:#f9f6f5`, padding 32px, max-width 448px; mobile handle: 48×6px `bg:#c1c9bd/30` pill

**Header:** "Switch Household" extrabold 24px + close button 40×40px rounded-full

**Household list (spaced 12px):**

*Active item:* `bg:#5cfd80/40`, `border:2px #006a28/20`, `border-radius:16px`, padding 20px
- Left: 48×48px icon `bg:#006a28` rounded-xl + name bold + "Personal Pantry" subtitle uppercase 10px
- Right: 24×24px circle `bg:#006a28` with white checkmark

*Inactive item:* `bg:#ffffff`, `border:#c1c9bd/10`, hover `bg:#eae7e7`
- Right: no checkmark, just chevron

**Action buttons:**
- Create New Household: full-width, gradient `#006a28 → #004d1c`, white bold, padding 16px, `add_circle` icon
- Join with Code: full-width, `bg:#eae7e7`, dark text bold, `pin` icon

**Dark mode:** modal `bg:#1c1c1c`, active `bg:#006a28/20`, inactive `bg:#1c1c1c`, borders `white/5`

---

## Household Details Screen

**Purpose:** View household info, invite code, members list, leave/delete actions.

**Header (sticky):** back arrow, "Household Details" bold 18px, settings icon right

**Hero section (centered):**
- 64×64px icon `bg:#5cfd80`, `border-radius:12px`, `home` icon `#006a28`
- Household name: extrabold 36px
- Subtitle: "Est. October 2023 • 3 Members" — gray

**Invite card (full-width):** `bg:#ffffff`, `border-radius:16px`, padding 24px
- Left: "Invite New Pantry Keepers" bold 20px + description + code row
  - Code row: `bg:#eae7e7`, `border-radius:8px`, padding 6px; code text `font-mono` bold tracking-widest `#006a28` + Copy button `bg:#006a28` white 14px
- Right: 96×96px QR code placeholder, `border-radius:16px`, `rotate(3deg)`, `qr_code_2` icon

**Members section:**
- Heading: "Household Members" bold 18px + "Manage Permissions" link `#006a28`
- Member cards: `bg:#ffffff`, `border-radius:16px`, padding 16px
  - Avatar: 48×48px rounded-full, `ring-2 ring:#5cfd80`
  - Owner badge: "Owner" — `bg:#5cfd80` text `#006a28`, uppercase 10px
  - Non-owner: "Full Access" gray text + `more_vert` icon

**Danger zone:**
- "Leave Household": full-width, `border:#72796f`, text `#1a1c1a`, bold, `logout` icon
- "Delete Household": full-width, `bg:#ffdad6/10`, `color:#ba1a1a`, `delete_forever` icon
- Warning text below: italic gray 12px

**Dark mode:** `bg:#1a1c1a`, cards `bg:#232622`

---

## Create Household Screen

**Purpose:** Create a new shared household.

**Header (sticky):** back arrow `#006a28`, "Create Household" bold `#006a28`

**Left bento card (desktop; full-width on mobile):** `bg:#5cfd80/20`, `border-radius:40px`, padding 32px, min-height 300px
- `forest` icon filled, primary, 48px
- "Plant Your Roots." extrabold 32px
- Description: gray 14px

**Form card:** `bg:#ffffff`, `border-radius:32px`, padding 32px, shadow
- "Household Identity" bold 20px
- Name input: `bg:#f3f0ef`, `border-radius:12px`, padding 20px 16px, placeholder "e.g., The Artisan Kitchen", `home` icon right side (muted primary)
- Info card: `bg:#eae7e7`, `border-radius:16px`, `key` icon `bg:#5cfd80` + "Private Invite Code" bold + description text
- Submit: full-width gradient `#006a28 → #004d1c`, white bold 16px, padding 20px, `border-radius:12px`, `arrow_forward` icon

**Quick facts grid (2 cols):** `bg:#f3f0ef`, `border-radius:24px`, padding 24px
- "Unlimited Members" — `groups` icon primary
- "Real-time Updates" — `sync_saved_locally` icon tertiary

**Decorative blobs:** fixed blurred circles at top-right (primary/5) and bottom-left (tertiary/5)

---

## Join Household Screen

**Purpose:** Join an existing household by entering an invite code.

**Header (sticky):** back arrow, "Join Household" bold 18px; `bg:#f9f6f5/80` backdrop-blur

**Icon section:** 80×80px `bg:#006a28` `border-radius:16px`, `group_add` white 40px

**Heading:** "Welcome Aboard" extrabold 32px; subtitle gray 15px max-width 280px centered

**Form card:** `bg:#ffffff`, `border:#eae7e7/50`, `border-radius:24px`, padding 24px
- Label: "INVITE CODE" uppercase 12px bold `#006a28`
- Input: height 56px, `bg:#eae7e7`, 20px bold Plus Jakarta Sans centered, letter-spacing 0.25em, placeholder "XXXX-XXXX", max-length 9, focus ring primary
- Join button: full-width height 56px `bg:#006a28` white bold `#006a28/90` hover, `arrow_forward` icon, `border-radius:12px`

**Divider:** horizontal lines + "ALTERNATIVELY" uppercase 10px `#72796f`

**Scan QR button:** full-width height 56px `bg:#ffffff border:2px #5cfd80/20`, primary text, `qr_code_scanner` icon

**Footer:** help text + "Create new" link `#006a28`

---

## List Switcher Modal (Switch List)

**Purpose:** Bottom sheet to switch between shopping lists or create new.

**Backdrop:** `bg` grayscale/opacity-40 showing app beneath

**Modal:** bottom sheet mobile, centered desktop; `border-radius-top:40px`; `bg:#f9f6f5`; mobile handle bar

**Header:** "Switch List" bold 32px + close button

**Active lists section:**
- Section label: "ACTIVE LISTS" uppercase 12px bold gray letter-spacing
- Item: `bg:#ffffff` hover `bg:#5cfd80/10`; `border-radius:16px`; icon 40×40px `bg:#acc3ff/20` + name bold + status badge
  - Active: `bg:#0055c4/10` blue uppercase badge
  - In Progress: `bg:#ff9727/20` orange uppercase badge
  - Completed: `bg:#5cfd80/30` green uppercase badge
- Right: checkmark (selected) or chevron

**History section:**
- "HISTORY" uppercase label
- 2-column grid of cards: `bg:#eae7e7`, `border-radius:16px`, padding 16px
  - Name 14px bold truncate + date + count gray 10px

**Actions:**
- Create New List: `bg:#006a28` `border-radius:16px` shadow, flex center, `add_circle` icon + "Create New List" white bold; below: 3 quick-chips "Blank" "Template" "Copy" in `bg:#004d1c/30`
- Mark Current as Complete: full-width `bg:#eae7e7` `border-radius:16px`, `task_alt` icon + text

**Bottom tab bar:** Pantry active

---

## Settings Screen

**Purpose:** Profile, appearance, household settings, logout.

**Header (sticky):** back arrow, "Settings" bold 20px `#006a28`, search icon right

**Profile card:** `bg:#ffffff`, `border-radius:48px`, padding 24px, shadow, flex row
- Avatar: 64×64px `border-radius:16px`
- Name: bold 18px; role + email: gray 14px
- Chevron right

**Appearance section:**
- Icon `palette` + "Appearance" bold 18px
- Toggle container: `bg:#eae7e7`, `border-radius:32px`, padding 8px, flex 3 buttons
  - Active button: `bg:#ffffff`, `border-radius:28px`, padding 12px 16px, `#006a28` bold; icon `light_mode`/`dark_mode`/`settings_brightness`
  - Inactive: gray text medium

**Settings groups (`bg:#ffffff` rounded-3xl overflow-hidden):**

*Household:*
- Household Settings: `house` icon `bg:#ff9727/10`, chevron
- Manage Members: `group_add` icon, member count badge `bg:#006a28` white

*Preferences:*
- Notifications: `notifications_active` blue icon
- Privacy & Security: `security` gray icon

*Support:*
- Help & Support: `help_center` orange icon
- Log Out: `logout` icon `color:#ba1a1a`, text `#ba1a1a`

**Footer:** "THE LIVING PANTRY v2.4.0" uppercase 12px gray centered + "Made with locally sourced ingredients." italic 10px

**Bottom tab bar:** Settings tab active

**Dark mode:** background `#1a1c19`, cards `#232622`, text `#e2e3de`, primary `#5cfd80`

---

## Forgot Password Screen

**Purpose:** Request a password reset OTP.

**Layout:** single column, centered, max-width 400px, `bg:#f9f6f5`

**Header:** back arrow to Login

**Heading:** "Reset Password" — Plus Jakarta Sans extrabold 32px

**Sub:** "Enter your email and we'll send you a reset code." — gray 15px

**Form:**
- Email input: same style as login screen (full-width, `bg:#eae7e7`, height 48px)
- Send Reset Code button: full-width `bg:#006a28` white bold height 56px, `send` icon
- Loading state: spinner replaces text

**States:**
- Success: card/banner "Check your email for a 6-digit code" green background
- Error (any): red banner text

**"Back to sign in" link:** centered, `#006a28`

---

## Reset Password Screen (OTP Entry)

**Purpose:** Enter OTP + new password to complete reset.

**Layout:** same as ForgotPasswordScreen

**Heading:** "Enter Your Code"

**Form:**
- OTP input: 6-char, monospace, large centered font (28px), `bg:#eae7e7`, letter-spacing 0.4em, placeholder "••••••"
- New Password input: standard password input (toggle visibility), min 8 chars
- Confirm Password input: must match new password
- Reset Password button: `bg:#006a28` white bold

**Error states:**
- Wrong code: "Invalid code. N attempt(s) remaining." — red inline
- Too many attempts: "Too many attempts. Please request a new code." + "Request New Code" link
- Expired: "Reset code has expired. Please request a new one." + link

**Success:** green banner + auto-redirect to Login after 2s

---

## Stitch Design vs Implementation — Gap Analysis

### Structural / Feature Gaps

| # | Stitch Design | Current Implementation | Severity |
|---|---|---|---|
| 1 | 4th bottom tab is **"Recipes"** (book icon) | 3rd tab is "Categories"; no Recipes feature exists | Major — entire feature missing |
| 2 | **Item prices shown inline** on item rows ($4.99, $3.99) | Prices only visible after receipt scan confirmation | Fixed — now shows price badge when `item.price` exists |
| 3 | **"See All" link** at bottom of each category section | Not implemented — all items shown inline | Minor — design aspirational |
| 4 | **Category item counts** ("11 ITEMS", "4 ITEMS" per card) | Fixed — now shows item count below category name |
| 5 | Settings: **"Premium Member"** badge, search icon, "Pantry Synchronization" toggle, "Dietary Labels", "Language" | None exist — no backend support for premium tiers, dietary labels, i18n | Major — requires backend features |
| 6 | Member role badges: **"Admin"** + **"Full Access"** | Fixed — updated from "OWNER"/"MEMBER" |
| 7 | Category form is **full-screen** with back arrow | Bottom-sheet modal — intentional mobile-first choice | Minor |
| 8 | Google Sign-In button | Shown in Stitch but not wired — email/password only | Stub |
| 9 | QR code for invite / Scan QR | Placeholder icon shown; no QR backend | Stub |
| 10 | "Manage Permissions" link | Visible link, no backend | Stub |
| 11 | Notifications / Privacy rows | Stub rows — taps do nothing | Stub |
| 12 | Theme color mode persistence | `setColorMode` in-memory only; resets on restart | Known limitation |

### Design System Compliance

| # | Stitch Rule | Status |
|---|---|---|
| 1 | **"No-Line" rule** — 1px borders prohibited, use tonal shifts | Fixed — removed borders from tab bar, list cards, modal rows; using bg tonal separation |
| 2 | **"Haptic Slide"** — checked items slide to bottom at 60% opacity, lighter weight | Fixed — checked items sorted to section bottom with reduced opacity |
| 3 | **Glassmorphism** — 80% opacity, 20px backdrop blur | Not implemented — React Native requires expo-blur; deferred |
| 4 | **Checkbox animation** — 1.1x scale pop on check | Fixed — Animated scale pop added to checkbox toggle |
| 5 | **Shadow spec** — ambient 32px blur, 6% opacity | Fixed — FAB and auth card shadows adjusted |
| 6 | **Category chips subtle-fill** — 12% opacity bg, full-strength text | Fixed — selected chips use `categoryColor + '20'` bg with category color text |
| 7 | Settings footer tagline "Made with locally sourced ingredients." | Fixed — added to footer |
