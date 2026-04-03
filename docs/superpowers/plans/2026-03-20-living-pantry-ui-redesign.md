# The Living Pantry — UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire frontend to match the "Living Pantry" Stitch design system — new color palette, typography, bottom tab navigation, and all 11 screens in both light and dark mode.

**Architecture:** Single `app/index.tsx` container with a custom `BottomTabBar` component managing 4 tabs (Pantry | Lists | Categories | Settings). Each tab renders its own screen component. All existing backend API calls and AuthContext are preserved — only the presentation layer changes. Dark mode state moves into a shared `ThemeContext` so all screens can access it.

**Tech Stack:** Expo React Native, expo-router, @expo-google-fonts/plus-jakarta-sans, @expo-google-fonts/inter, Ionicons, react-native-safe-area-context

**Design source:** `/Users/kiran.kumar/Downloads/stitch_grocery_todo_app_specification/` (light) and `stitch_grocery_todo_app_specification 2/` (dark + DESIGN.md)

**Design token reference (DESIGN.md):**
- Primary: `#006a28` | Primary Container: `#5cfd80`
- Surface: `#f9f6f5` | Surface-container: `#eae7e7` | Surface-top: `#ffffff`
- Dark bg: deep charcoal `#1a1f1a` | Dark surface: `#222822` | Dark card: `#2a332a`
- Orange badge (tertiary-container): `#ff9727`
- No 1px dividers — surface-shift elevation only
- Fonts: Plus Jakarta Sans (headers/display) + Inter (body/labels)
- Bottom nav: Pantry | Lists | Categories | Settings

---

## File Map

**New files:**
- `frontend/components/ThemeContext.tsx` — Dark/light mode state + theme tokens, consumed by all screens
- `frontend/components/BottomTabBar.tsx` — 4-tab navigation bar
- `frontend/app/screens/PantryScreen.tsx` — Main grocery list (extracted from index.tsx)
- `frontend/app/screens/ListsScreen.tsx` — List switcher tab content
- `frontend/app/screens/CategoriesScreen.tsx` — Category management tab (replaces CategoryModal list view)
- `frontend/app/screens/SettingsScreen.tsx` — Full settings screen
- `frontend/app/screens/RecipesScreen.tsx` — Placeholder "coming soon"

**Modified files:**
- `frontend/components/constants.ts` — Replace terracotta/cream palette with Grocery Green palette
- `frontend/components/types.ts` — Update Theme, FontMap; add `unit` to GroceryItem
- `frontend/components/sharedStyles.ts` — Update to new design tokens
- `frontend/app/index.tsx` — Restructure: fonts, ThemeContext, tab switcher, login screen
- `frontend/components/modals/AddItemModal.tsx` — Redesign: category pills, +/- stepper, unit dropdown
- `frontend/components/modals/EditItemModal.tsx` — Same redesign as AddItemModal
- `frontend/components/modals/CategoryModal.tsx` — Redesign form view only (list view moved to CategoriesScreen)
- `frontend/components/modals/HouseholdSwitcherModal.tsx` — Redesign as bottom sheet with new layout
- `frontend/components/modals/HouseholdDetailsModal.tsx` — Redesign with invite code card + member list
- `frontend/components/modals/CreateHouseholdModal.tsx` — "Plant Your Roots" hero layout
- `frontend/components/modals/JoinHouseholdModal.tsx` — "Welcome Aboard" hero layout
- `frontend/components/modals/ListsModal.tsx` — Redesign as "Switch List" bottom sheet
- `backend/server.py` — Add `unit: str = "items"` to GroceryItem model

---

## Task 1: Worktree + font packages

**Files:** none (setup only)

- [ ] **Step 1: Fetch latest and create worktree**
```bash
cd /Users/kiran.kumar/kk/worspaces/personal/groceries-list-app
git fetch origin && git pull origin main
git worktree add .worktrees/living-pantry-redesign -b living-pantry-redesign
```

- [ ] **Step 2: Install font packages**
```bash
cd .worktrees/living-pantry-redesign/frontend
npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/inter
```

- [ ] **Step 3: Verify packages appear in package.json**
```bash
grep -E "jakarta|inter" .worktrees/living-pantry-redesign/frontend/package.json
```
Expected: both packages listed under dependencies.

---

## Task 2: Design tokens — constants.ts

**Files:**
- Modify: `frontend/components/constants.ts`

- [ ] **Step 1: Replace PALETTE with Living Pantry tokens**

Replace entire file content:
```typescript
export const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const PALETTE = {
  // Primary greens
  primary: '#006a28',
  primaryContainer: '#5cfd80',
  primaryDim: '#004d1c',
  // Light mode surfaces
  surface: '#f9f6f5',
  surfaceContainer: '#eae7e7',
  surfaceContainerHigh: '#dddada',
  surfaceTop: '#ffffff',
  // Text
  onSurface: '#1a1c1a',
  onSurfaceVariant: '#424940',
  outline: '#72796f',
  outlineVariant: '#c1c9bd',
  // Accents
  tertiary: '#ff9727',      // orange quantity badges
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  // Dark mode surfaces
  darkSurface: '#1a1f1a',
  darkSurfaceContainer: '#222822',
  darkSurfaceCard: '#2a332a',
  darkSurfaceHigh: '#313d31',
  darkOnSurface: '#e2e3dc',
  darkOnSurfaceVariant: '#c1c9bd',
  darkOutline: '#8b9389',
  // Status colors
  statusActive: '#1b6ef3',
  statusInProgress: '#ff9727',
  statusCompleted: '#006a28',
};

export const AVAILABLE_ICONS = [
  'leaf-outline', 'nutrition-outline', 'water-outline', 'snow-outline', 'pizza-outline',
  'cafe-outline', 'restaurant-outline', 'fast-food-outline', 'ice-cream-outline', 'fish-outline',
  'beer-outline', 'wine-outline', 'flame-outline', 'flower-outline', 'basket-outline',
  'cart-outline', 'bag-outline', 'bag-handle-outline', 'pricetag-outline', 'grid-outline',
  'cube-outline', 'home-outline', 'construct-outline', 'shirt-outline', 'paw-outline',
  'medical-outline', 'bandage-outline', 'sparkles-outline', 'happy-outline', 'book-outline',
  'phone-portrait-outline', 'hardware-chip-outline', 'body-outline', 'sunny-outline',
  'aperture-outline', 'ellipse-outline', 'ellipsis-horizontal-outline',
];

// 15-color vibrant palette for categories (from DESIGN.md)
export const AVAILABLE_COLORS = [
  '#006a28', '#f97316', '#3b82f6', '#dc2626', '#92400e',
  '#ec4899', '#9333ea', '#7c3aed', '#2563eb', '#0891b2',
  '#06b6d4', '#059669', '#16a34a', '#65a30d', '#ca8a04',
];

export const ITEM_UNITS = ['items', 'pcs', 'kg', 'g', 'lb', 'oz', 'L', 'ml', 'bags', 'boxes', 'cans', 'bottles', 'bunches'];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'Fr.', AUD: 'A$', CAD: 'C$',
  INR: '₹', JPY: '¥', CNY: '¥', KRW: '₩',
};
```

- [ ] **Step 2: Update sharedStyles.ts to use new tokens** (must happen in same commit to avoid broken imports)

Replace the content of `frontend/components/sharedStyles.ts`:
```typescript
import { StyleSheet } from 'react-native';
import { PALETTE } from './constants';

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  formLabel: { fontSize: 11, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  input: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 16, marginBottom: 16 },
  primaryButton: { backgroundColor: PALETTE.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' as const },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', fontSize: 16 },
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24 },
  centeredContent: { width: '100%' as any, maxWidth: 320, borderRadius: 20, padding: 28, alignItems: 'center' as const },
  centeredIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 16 },
  centeredTitle: { fontSize: 20, marginBottom: 8 },
  centeredMsg: { fontSize: 14, textAlign: 'center' as const, marginBottom: 20, lineHeight: 20 },
  centeredButtons: { flexDirection: 'row' as const, gap: 12, width: '100%' as any },
  centeredBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' as const },
});
```

- [ ] **Step 3: Commit both files together**
```bash
git add frontend/components/constants.ts frontend/components/sharedStyles.ts
git commit -m "feat: replace palette with Living Pantry design tokens and update sharedStyles"
```

---

## Task 3: Update types.ts + font imports in index.tsx (combined)

> **⚠️ Dependency note:** FontMap type changes and the font object implementation in `index.tsx` MUST land in the same commit. Changing FontMap alone (from `serif/body` keys to `display/body` keys) will break `index.tsx` until Task 7 updates the font object. Combine both changes in this task.

**Files:**
- Modify: `frontend/components/types.ts`
- Modify: `frontend/app/index.tsx` (font imports + font object only — full login redesign in Task 7)

- [ ] **Step 1: Update FontMap, Theme, add unit to GroceryItem**

Replace file content:
```typescript
export type FontMap = {
  display: string | undefined;       // Plus Jakarta Sans Bold — screen titles, category headers
  displayMedium: string | undefined; // Plus Jakarta Sans SemiBold
  displayRegular: string | undefined;// Plus Jakarta Sans Regular
  body: string | undefined;          // Inter Regular — item names, metadata
  bodyMedium: string | undefined;    // Inter Medium
  bodySemiBold: string | undefined;  // Inter SemiBold
  bodyBold: string | undefined;      // Inter Bold
};

export type Theme = {
  background: string;       // base layer
  surfaceContainer: string; // category sections / grouped backgrounds
  surface: string;          // individual cards
  text: string;
  textSecondary: string;
  inputBg: string;
  primary: string;          // #006a28 or dark equiv
  primaryContainer: string; // #5cfd80
  tertiary: string;         // #ff9727 orange badges
  outline: string;
  outlineVariant: string;
  error: string;
  isDark: boolean;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type GroceryItem = {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  price?: number;
  price_updated_at?: string;
};

export type WorkspaceMember = {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
};

export type Workspace = {
  workspace_id: string;
  name: string;
  type: 'personal' | 'shared';
  invite_code?: string;
  owner_id: string;
  member_ids: string[];
  members?: WorkspaceMember[];
  active_lists_count?: number;
  completed_lists_count?: number;
  currency?: string;
  created_at: string;
};

export type ShoppingList = {
  list_id: string;
  workspace_id: string;
  name: string;
  status: 'active' | 'in_progress' | 'completed';
  is_template: boolean;
  created_from_template_id?: string;
  total_items?: number;
  checked_items?: number;
  item_count?: number;
  created_at: string;
  completed_at?: string;
};

export type TabName = 'pantry' | 'lists' | 'categories' | 'settings';
```

- [ ] **Step 2: Update font imports in index.tsx** (in the same commit)

Replace Lora/Nunito imports and `useFonts` call and `font` object in `frontend/app/index.tsx`:
```typescript
import {
  useFonts,
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';

// Inside component:
const [fontsLoaded] = useFonts({
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
});

const font: FontMap = useMemo(() => ({
  display: fontsLoaded ? 'PlusJakartaSans_700Bold' : undefined,
  displayMedium: fontsLoaded ? 'PlusJakartaSans_600SemiBold' : undefined,
  displayRegular: fontsLoaded ? 'PlusJakartaSans_400Regular' : undefined,
  body: fontsLoaded ? 'Inter_400Regular' : undefined,
  bodyMedium: fontsLoaded ? 'Inter_500Medium' : undefined,
  bodySemiBold: fontsLoaded ? 'Inter_600SemiBold' : undefined,
  bodyBold: fontsLoaded ? 'Inter_700Bold' : undefined,
}), [fontsLoaded]);
```

- [ ] **Step 3: Commit both files together**
```bash
git add frontend/components/types.ts frontend/app/index.tsx
git commit -m "feat: update types and font system for Living Pantry design"
```

---

## Task 4: Add `unit` to backend GroceryItem model

**Files:**
- Modify: `backend/server.py`

- [ ] **Step 1: Add unit field to GroceryItemCreate, GroceryItemUpdate, GroceryItem models**

Find the `GroceryItemCreate` class and add `unit: str = "items"`. Do the same for `GroceryItemUpdate` (`unit: Optional[str] = None`) and `GroceryItem` (`unit: str = "items"`).

```python
# In GroceryItem model (the stored document model):
unit: str = "items"

# In GroceryItemCreate:
unit: str = "items"

# In GroceryItemUpdate:
unit: Optional[str] = None
```

Also update the create item endpoint to pass `unit` into the stored item, and the update endpoint to set `unit` if provided.

- [ ] **Step 2: Commit**
```bash
git add backend/server.py
git commit -m "feat: add unit field to GroceryItem model"
```

---

## Task 5: ThemeContext

**Files:**
- Create: `frontend/components/ThemeContext.tsx`

- [ ] **Step 1: Create ThemeContext with dark/light/system mode**

```typescript
import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PALETTE } from './constants';
import type { Theme } from './types';

type ColorMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  theme: Theme;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>('system');

  const isDark = colorMode === 'dark' || (colorMode === 'system' && systemScheme === 'dark');

  const theme: Theme = useMemo(() => isDark ? {
    background: PALETTE.darkSurface,
    surfaceContainer: PALETTE.darkSurfaceContainer,
    surface: PALETTE.darkSurfaceCard,
    text: PALETTE.darkOnSurface,
    textSecondary: PALETTE.darkOnSurfaceVariant,
    inputBg: PALETTE.darkSurfaceHigh,
    primary: PALETTE.primaryContainer,   // bright green in dark mode
    primaryContainer: PALETTE.primaryContainer + '30',
    tertiary: PALETTE.tertiary,
    outline: PALETTE.darkOutline,
    outlineVariant: PALETTE.darkOutline + '40',
    error: '#ffb4ab',
    isDark: true,
  } : {
    background: PALETTE.surface,
    surfaceContainer: PALETTE.surfaceContainer,
    surface: PALETTE.surfaceTop,
    text: PALETTE.onSurface,
    textSecondary: PALETTE.onSurfaceVariant,
    inputBg: PALETTE.surfaceContainer,
    primary: PALETTE.primary,
    primaryContainer: PALETTE.primaryContainer,
    tertiary: PALETTE.tertiary,
    outline: PALETTE.outline,
    outlineVariant: PALETTE.outlineVariant,
    error: PALETTE.error,
    isDark: false,
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ colorMode, setColorMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 2: Wrap app in ThemeProvider in `_layout.tsx`**

Replace the contents of `frontend/app/_layout.tsx` with:
```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../components/ThemeContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

The nesting order matters: `ThemeProvider` must be inside `SafeAreaProvider` (needs color scheme) and can be inside or outside `AuthProvider` — inside is shown here so settings screen can access both `useAuth` and `useTheme` without extra wrappers.

- [ ] **Step 3: Commit**
```bash
git add frontend/components/ThemeContext.tsx frontend/app/_layout.tsx
git commit -m "feat: add ThemeContext with light/dark/system mode"
```

---

## Task 6: BottomTabBar component

**Files:**
- Create: `frontend/components/BottomTabBar.tsx`

- [ ] **Step 1: Create BottomTabBar**

```typescript
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import type { TabName } from './types';

type Tab = { name: TabName; label: string; icon: string; activeIcon: string };

const TABS: Tab[] = [
  { name: 'pantry',      label: 'Pantry',     icon: 'storefront-outline',  activeIcon: 'storefront' },
  { name: 'lists',       label: 'Lists',      icon: 'list-outline',        activeIcon: 'list' },
  { name: 'categories',  label: 'Categories', icon: 'apps-outline',        activeIcon: 'apps' },
  { name: 'settings',    label: 'Settings',   icon: 'settings-outline',    activeIcon: 'settings' },
];

type Props = {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
};

export default function BottomTabBar({ activeTab, onTabPress }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      st.container,
      {
        backgroundColor: theme.surface,
        paddingBottom: Math.max(insets.bottom, 8),
        borderTopColor: theme.outlineVariant,
      }
    ]}>
      {TABS.map(tab => {
        const active = tab.name === activeTab;
        return (
          <TouchableOpacity
            key={tab.name}
            style={st.tab}
            onPress={() => onTabPress(tab.name)}
          >
            {active && (
              <View style={[st.activePill, { backgroundColor: theme.primary + '18' }]} />
            )}
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as any}
              size={24}
              color={active ? theme.primary : theme.outline}
            />
            <Text style={[
              st.label,
              { color: active ? theme.primary : theme.outline }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    width: 56,
    height: 32,
    borderRadius: 16,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
```

- [ ] **Step 2: Commit**
```bash
git add frontend/components/BottomTabBar.tsx
git commit -m "feat: add BottomTabBar with Pantry/Lists/Categories/Settings tabs"
```

---

## Task 7: Redesign Login screen (index.tsx unauthenticated state)

> **Note:** Font imports and `font` object are already updated in Task 3. This task only changes the JSX of the login/loading screens.

**Files:**
- Modify: `frontend/app/index.tsx`

Replace the login JSX in `index.tsx` with the new design. The login screen per the Stitch design shows:
- App logo (restaurant icon) + "The Living Pantry" header
- Feature callouts (Collaborative Lists, Real-time Sync, Smart Categories)
- "Welcome Back" card with email + password fields + Sign In button
- Toggle to Register mode

- [ ] **Step 1: Rewrite loading screen** (replace existing loading return in index.tsx)

```tsx
if (authLoading || !fontsLoaded) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.surface }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: PALETTE.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
        <Ionicons name="leaf" size={32} color="#fff" />
      </View>
      <Text style={{ fontSize: 22, fontFamily: font.display, color: PALETTE.primary, marginBottom: 4 }}>The Living Pantry</Text>
      <ActivityIndicator size="small" color={PALETTE.primary} style={{ marginTop: 16 }} />
    </View>
  );
}
```

- [ ] **Step 2: Rewrite login/register screen**

```tsx
if (!isAuthenticated) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.surface }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        {/* Brand header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: PALETTE.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="restaurant-outline" size={28} color="#fff" />
          </View>
          <Text style={{ fontSize: 28, fontFamily: font.display, color: PALETTE.primary }}>The Living Pantry</Text>
          <Text style={{ fontSize: 14, fontFamily: font.body, color: PALETTE.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
            Your household's shared{' '}
            <Text style={{ color: PALETTE.primary, fontFamily: font.bodySemiBold }}>grocery curator</Text>.
          </Text>
        </View>

        {/* Feature chips */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
          {[
            { icon: 'people-outline', title: 'Collaborative Lists', desc: 'Plan meals together in real-time' },
            { icon: 'sync-outline', title: 'Real-time Sync', desc: 'Always up-to-date across devices' },
          ].map(f => (
            <View key={f.title} style={{ flex: 1, backgroundColor: PALETTE.surfaceContainer, borderRadius: 16, padding: 14 }}>
              <Ionicons name={f.icon as any} size={22} color={PALETTE.primary} />
              <Text style={{ fontSize: 13, fontFamily: font.bodySemiBold, color: PALETTE.onSurface, marginTop: 8 }}>{f.title}</Text>
              <Text style={{ fontSize: 11, fontFamily: font.body, color: PALETTE.onSurfaceVariant, marginTop: 3 }}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* Smart categories banner */}
        <View style={{ backgroundColor: PALETTE.primary, borderRadius: 20, padding: 18, marginBottom: 28 }}>
          <Text style={{ fontSize: 18, fontFamily: font.display, color: '#fff' }}>Smart Categories</Text>
          <Text style={{ fontSize: 13, fontFamily: font.body, color: '#fff', opacity: 0.85, marginTop: 6 }}>
            Items automatically sorted by grocery aisle for faster shopping trips.
          </Text>
        </View>

        {/* Auth card */}
        <View style={{ backgroundColor: PALETTE.surfaceTop, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 }}>
          <Text style={{ fontSize: 20, fontFamily: font.display, color: PALETTE.onSurface, textAlign: 'center', marginBottom: 4 }}>
            {isRegisterMode ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: font.body, color: PALETTE.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
            {isRegisterMode ? 'Join the pantry community' : 'Sign in to sync your pantry lists'}
          </Text>

          {isRegisterMode && (
            <>
              <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: PALETTE.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>NAME</Text>
              <TextInput
                style={{ backgroundColor: PALETTE.surfaceContainer, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: font.body, color: PALETTE.onSurface, marginBottom: 16 }}
                placeholder="Your name"
                placeholderTextColor={PALETTE.outline}
                value={authName}
                onChangeText={setAuthName}
                autoCapitalize="words"
              />
            </>
          )}

          <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: PALETTE.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>EMAIL ADDRESS</Text>
          <TextInput
            style={{ backgroundColor: PALETTE.surfaceContainer, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: font.body, color: PALETTE.onSurface, marginBottom: 16 }}
            placeholder="hello@livingpantry.com"
            placeholderTextColor={PALETTE.outline}
            value={authEmail}
            onChangeText={t => { setAuthEmail(t); clearAuthError(); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: PALETTE.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>PASSWORD</Text>
          <TextInput
            style={{ backgroundColor: PALETTE.surfaceContainer, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: font.body, color: PALETTE.onSurface, marginBottom: 16 }}
            placeholder="Enter your password"
            placeholderTextColor={PALETTE.outline}
            value={authPassword}
            onChangeText={t => { setAuthPassword(t); clearAuthError(); }}
            secureTextEntry
          />

          {authError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PALETTE.errorContainer, padding: 12, borderRadius: 12, marginBottom: 12 }}>
              <Ionicons name="alert-circle" size={16} color={PALETTE.error} />
              <Text style={{ color: PALETTE.error, fontSize: 13, fontFamily: font.body, flex: 1 }}>{authError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={{ backgroundColor: PALETTE.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 }}
            onPress={() => isRegisterMode ? (authName.trim() && register(authEmail, authPassword, authName)) : login(authEmail, authPassword)}
            disabled={authLoading}
          >
            {authLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 16, fontFamily: font.bodyBold }}>{isRegisterMode ? 'Create Account' : 'Sign In'}</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => { setIsRegisterMode(!isRegisterMode); clearAuthError(); }} style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ color: PALETTE.onSurfaceVariant, fontSize: 14, fontFamily: font.body }}>
            {isRegisterMode ? "Already have an account? " : "Don't have an account? "}
            <Text style={{ color: PALETTE.primary, fontFamily: font.bodySemiBold }}>{isRegisterMode ? 'Sign In' : 'Register'}</Text>
          </Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', fontSize: 11, fontFamily: font.body, color: PALETTE.outline, paddingBottom: 24 }}>
          "The kitchen is the heart of every home; let's keep it organized."
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add frontend/app/index.tsx
git commit -m "feat: redesign login screen with Living Pantry branding"
```

---

## Task 8: Restructure index.tsx with tab system

**Files:**
- Modify: `frontend/app/index.tsx`

Remove the main grocery list JSX from `index.tsx` and replace with a tab container. The actual screen content moves to screen components (Tasks 9–15).

- [ ] **Step 1: Add tab state + imports**

Add at top of component:
```typescript
const [activeTab, setActiveTab] = useState<TabName>('pantry');
const { theme } = useTheme();
```

- [ ] **Step 2: Replace authenticated return with tab container**

```tsx
return (
  <View style={{ flex: 1, backgroundColor: theme.background }} >
    <StatusBar
      barStyle={theme.isDark ? 'light-content' : 'dark-content'}
      translucent
      backgroundColor="transparent"
    />
    <View style={{ flex: 1 }}>
      {activeTab === 'pantry' && (
        <PantryScreen font={font} items={items} setItems={setItems} categories={categories} fetchCategories={fetchCategories} fetchItems={fetchItems} loading={loading} />
      )}
      {activeTab === 'lists' && (
        <ListsScreen font={font} onNavigateToPantry={() => setActiveTab('pantry')} />
      )}
      {activeTab === 'categories' && (
        <CategoriesScreen font={font} categories={categories} fetchCategories={fetchCategories} />
      )}
      {activeTab === 'settings' && (
        <SettingsScreen font={font} />
      )}
    </View>
    <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
  </View>
);
```

- [ ] **Step 3: Commit**
```bash
git add frontend/app/index.tsx
git commit -m "feat: restructure index.tsx with 4-tab container"
```

---

## Task 9: PantryScreen — main grocery list

**Files:**
- Create: `frontend/app/screens/PantryScreen.tsx`

This extracts and redesigns the main list from `index.tsx`. Key design changes per Stitch mockup:
- Header: hamburger icon | workspace name (bold green, serif) | workspace type subtitle | item count pill (green pill) | avatar circle
- Title block: large bold list name + subtitle "Curated essentials..."
- Search bar + "Quick Add" green button (inline)
- Category sections: large category header (icon + name + item count badge)
- Item rows: checkbox | item name | quantity badge (orange pill); checked items show strikethrough + reduced opacity
- FAB: dark green rounded square (+)

- [ ] **Step 1: Create PantryScreen.tsx**

```typescript
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList,
  StyleSheet, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../components/ThemeContext';
import { PALETTE, EXPO_PUBLIC_BACKEND_URL } from '../../components/constants';
import type { FontMap, Category, GroceryItem } from '../../components/types';
import AddItemModal from '../../components/modals/AddItemModal';
import EditItemModal from '../../components/modals/EditItemModal';
import DeleteItemModal from '../../components/modals/DeleteItemModal';
import HouseholdSwitcherModal from '../../components/modals/HouseholdSwitcherModal';
import CreateHouseholdModal from '../../components/modals/CreateHouseholdModal';
import JoinHouseholdModal from '../../components/modals/JoinHouseholdModal';
import HouseholdDetailsModal from '../../components/modals/HouseholdDetailsModal';
import DeleteHouseholdModal from '../../components/modals/DeleteHouseholdModal';
import ListsModal from '../../components/modals/ListsModal';
import CreateListModal from '../../components/modals/CreateListModal';
import InviteCodeModal from '../../components/modals/InviteCodeModal';
import ReceiptScanModal from '../../components/modals/ReceiptScanModal';

type Props = {
  font: FontMap;
  items: GroceryItem[];
  setItems: React.Dispatch<React.SetStateAction<GroceryItem[]>>;
  categories: Category[];
  fetchCategories: () => void;
  fetchItems: () => void;
  loading: boolean;
};

export default function PantryScreen({ font, items, setItems, categories, fetchCategories, fetchItems, loading }: Props) {
  const { theme } = useTheme();
  const {
    user, workspaces, currentWorkspace, currentList, lists, templates,
    sessionToken, setCurrentWorkspace, deleteWorkspace, getInviteCode,
    leaveWorkspace, setCurrentList, fetchLists, updateList,
  } = useAuth();

  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top;
  const topPadding = Math.max(statusBarHeight, insets.top);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [showDeleteItem, setShowDeleteItem] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);

  const [showHouseholdSwitcher, setShowHouseholdSwitcher] = useState(false);
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const [showJoinHousehold, setShowJoinHousehold] = useState(false);
  const [showHouseholdDetails, setShowHouseholdDetails] = useState(false);
  const [showDeleteHousehold, setShowDeleteHousehold] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<typeof currentWorkspace>(null);
  const [deleteHouseholdLoading, setDeleteHouseholdLoading] = useState(false);

  const [showLists, setShowLists] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState('');
  const [showReceiptScan, setShowReceiptScan] = useState(false);

  const toggleItem = async (item: GroceryItem) => {
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ checked: !item.checked }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
        fetchLists();
      }
    } catch (e) { console.error(e); }
  };

  const handleShowInviteCode = async (ws?: typeof currentWorkspace) => {
    const target = ws || currentWorkspace;
    if (!target) return;
    try {
      const code = await getInviteCode(target.workspace_id);
      setCurrentInviteCode(code);
      setShowHouseholdSwitcher(false);
      setShowHouseholdDetails(false);
      setShowInviteCode(true);
    } catch (e) { console.error(e); }
  };

  const handleDeleteHousehold = async () => {
    if (!selectedHousehold) return;
    setDeleteHouseholdLoading(true);
    try {
      await deleteWorkspace(selectedHousehold.workspace_id);
      setShowDeleteHousehold(false);
      setShowHouseholdDetails(false);
      setSelectedHousehold(null);
    } catch (e) { console.error(e); }
    setDeleteHouseholdLoading(false);
  };

  const groupedItems = useMemo(() => {
    const filtered = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const groups: Record<string, GroceryItem[]> = {};
    filtered.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return categories.filter(c => groups[c.name]).map(c => ({
      title: c.name, data: groups[c.name], categoryInfo: c,
    }));
  }, [items, searchQuery, categories]);

  const uncheckedCount = useMemo(() => items.filter(i => !i.checked).length, [items]);
  const activeLists = useMemo(() => lists.filter(l => l.status !== 'completed'), [lists]);
  const completedLists = useMemo(() => lists.filter(l => l.status === 'completed'), [lists]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: topPadding }}>
      {/* Header */}
      <View style={[st.header]}>
        <TouchableOpacity onPress={() => setShowHouseholdSwitcher(true)} style={st.menuBtn}>
          <Ionicons name="menu" size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity style={st.workspaceInfo} onPress={() => setShowHouseholdSwitcher(true)}>
          <Text style={[st.workspaceName, { color: theme.primary, fontFamily: font.display }]} numberOfLines={1}>
            {currentWorkspace?.name || 'Select Household'}
          </Text>
          <Text style={[st.workspaceType, { color: theme.textSecondary, fontFamily: font.body }]}>
            {currentWorkspace?.type === 'personal' ? 'PERSONAL HOME' : 'SHARED HOME'}
          </Text>
        </TouchableOpacity>
        <View style={st.headerRight}>
          {currentList && (
            <TouchableOpacity
              style={[st.itemCountPill, { backgroundColor: theme.isDark ? PALETTE.darkSurfaceHigh : PALETTE.surfaceContainer }]}
              onPress={() => setShowLists(true)}
            >
              <Text style={[st.itemCountText, { color: theme.primary, fontFamily: font.bodyBold }]}>
                {uncheckedCount} items left
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[st.avatarCircle, { backgroundColor: theme.primary + '18' }]}
            onPress={() => { /* open settings tab or profile */ }}
          >
            <Ionicons name="person" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title block */}
      <View style={st.titleBlock}>
        <Text style={[st.listTitle, { color: theme.text, fontFamily: font.display }]} numberOfLines={2}>
          {currentList?.name || 'Weekly Groceries'}
        </Text>
        <Text style={[st.listSubtitle, { color: theme.textSecondary, fontFamily: font.body }]}>
          Curated essentials for the upcoming week.
        </Text>
      </View>

      {/* Search + Quick Add */}
      <View style={[st.searchRow]}>
        <View style={[st.searchBox, { backgroundColor: theme.isDark ? theme.surfaceContainer : theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.outline} />
          <TextInput
            style={[st.searchInput, { color: theme.text, fontFamily: font.body }]}
            placeholder="Search pantry or add..."
            placeholderTextColor={theme.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[st.quickAddBtn, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddItem(true)}
        >
          <Text style={[st.quickAddText, { fontFamily: font.bodyBold }]}>Quick Add</Text>
        </TouchableOpacity>
      </View>

      {/* List content */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : currentList ? (
        <SectionList
          sections={groupedItems}
          keyExtractor={item => item.id}
          renderSectionHeader={({ section }) => (
            <View style={[st.sectionHeader, { backgroundColor: theme.background }]}>
              <View style={[st.sectionIconWrap, { backgroundColor: section.categoryInfo.color + '20' }]}>
                <Ionicons name={section.categoryInfo.icon as any} size={18} color={section.categoryInfo.color} />
              </View>
              <Text style={[st.sectionTitle, { color: theme.text, fontFamily: font.display }]}>
                {section.title}
              </Text>
              <View style={[st.sectionBadge, { backgroundColor: theme.surfaceContainer }]}>
                <Text style={[st.sectionBadgeText, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
                  {section.data.length} ITEMS
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={[st.itemCard, {
              backgroundColor: item.checked ? theme.surfaceContainer : theme.surface,
              marginHorizontal: 16,
            }]}>
              <TouchableOpacity
                style={[st.checkbox, {
                  borderColor: item.checked ? theme.primary : theme.outline,
                  backgroundColor: item.checked ? theme.primary : 'transparent',
                }]}
                onPress={() => toggleItem(item)}
              >
                {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={st.itemContent}
                onPress={() => { setEditingItem(item); setShowEditItem(true); }}
              >
                <Text style={[
                  st.itemName,
                  { color: item.checked ? theme.textSecondary : theme.text, fontFamily: font.bodyMedium },
                  item.checked && st.itemChecked,
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
              {item.quantity > 0 && (
                <View style={[st.qtyBadge, { backgroundColor: item.checked ? theme.outline + '20' : PALETTE.tertiary + '20' }]}>
                  <Text style={[st.qtyText, {
                    color: item.checked ? theme.outline : PALETTE.tertiary,
                    fontFamily: font.bodySemiBold,
                  }]}>
                    {item.quantity} {item.unit || 'pcs'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={st.deleteBtn}
                onPress={() => { setItemToDelete(item); setShowDeleteItem(true); }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.outline} />
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="basket-outline" size={56} color={theme.outline} />
              <Text style={[{ fontSize: 18, marginTop: 16, color: theme.text, fontFamily: font.display }]}>
                {searchQuery ? 'Nothing found' : 'Your pantry is empty'}
              </Text>
              <Text style={[{ fontSize: 14, marginTop: 4, color: theme.textSecondary, fontFamily: font.body }]}>
                {searchQuery ? 'Try a different search' : 'Tap Quick Add to start'}
              </Text>
            </View>
          }
        />
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Ionicons name="list-outline" size={56} color={theme.outline} />
          <Text style={{ fontSize: 18, marginTop: 16, color: theme.text, fontFamily: font.display }}>No list selected</Text>
          <Text style={{ fontSize: 14, marginTop: 4, color: theme.textSecondary, fontFamily: font.body }}>Pick a list or create a new one</Text>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            onPress={() => setShowCreateList(true)}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: font.bodySemiBold }}>Create List</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      {currentList && (
        <TouchableOpacity
          style={[st.fab, { backgroundColor: theme.primary, bottom: 16 }]}
          onPress={() => setShowAddItem(true)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modals */}
      <AddItemModal visible={showAddItem} font={font} categories={categories} sessionToken={sessionToken} currentList={currentList} onClose={() => setShowAddItem(false)} onItemAdded={item => { setItems(prev => [item, ...prev]); fetchLists(); }} />
      <EditItemModal visible={showEditItem} font={font} categories={categories} sessionToken={sessionToken} item={editingItem} onClose={() => { setShowEditItem(false); setEditingItem(null); }} onItemUpdated={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))} onDeleteRequest={item => { setShowEditItem(false); setItemToDelete(item); setShowDeleteItem(true); }} />
      <DeleteItemModal visible={showDeleteItem} font={font} sessionToken={sessionToken} item={itemToDelete} onClose={() => { setShowDeleteItem(false); setItemToDelete(null); }} onDeleted={() => { if (itemToDelete) setItems(prev => prev.filter(i => i.id !== itemToDelete.id)); fetchLists(); }} />
      <HouseholdSwitcherModal visible={showHouseholdSwitcher} font={font} workspaces={workspaces} currentWorkspace={currentWorkspace} onClose={() => setShowHouseholdSwitcher(false)} onSelect={ws => { setCurrentWorkspace(ws); setShowHouseholdSwitcher(false); }} onCreateNew={() => { setShowHouseholdSwitcher(false); setShowCreateHousehold(true); }} onJoin={() => { setShowHouseholdSwitcher(false); setShowJoinHousehold(true); }} onInvite={ws => handleShowInviteCode(ws)} onSettings={ws => { setSelectedHousehold(ws); setShowHouseholdSwitcher(false); setShowHouseholdDetails(true); }} />
      <CreateHouseholdModal visible={showCreateHousehold} font={font} onClose={() => setShowCreateHousehold(false)} onCreated={ws => { setCurrentWorkspace(ws); setShowCreateHousehold(false); }} />
      <JoinHouseholdModal visible={showJoinHousehold} font={font} onClose={() => setShowJoinHousehold(false)} onJoined={ws => { setCurrentWorkspace(ws); setShowJoinHousehold(false); }} />
      <HouseholdDetailsModal visible={showHouseholdDetails} font={font} household={selectedHousehold} userId={user?.user_id || ''} onClose={() => setShowHouseholdDetails(false)} onInvite={() => { setShowHouseholdDetails(false); handleShowInviteCode(selectedHousehold); }} onDelete={() => setShowDeleteHousehold(true)} onLeave={() => { if (selectedHousehold) leaveWorkspace(selectedHousehold.workspace_id); setShowHouseholdDetails(false); }} />
      <DeleteHouseholdModal visible={showDeleteHousehold} font={font} householdName={selectedHousehold?.name || ''} loading={deleteHouseholdLoading} onClose={() => setShowDeleteHousehold(false)} onConfirm={handleDeleteHousehold} />
      <ListsModal visible={showLists} font={font} currentWorkspace={currentWorkspace} currentList={currentList} activeLists={activeLists} completedLists={completedLists} templates={templates} onClose={() => setShowLists(false)} onSelectList={list => { setCurrentList(list); setShowLists(false); }} onCreateNew={() => { setShowLists(false); setShowCreateList(true); }} />
      <CreateListModal visible={showCreateList} font={font} templates={templates} lists={lists} onClose={() => setShowCreateList(false)} onCreated={list => { setCurrentList(list); setShowCreateList(false); }} />
      <InviteCodeModal visible={showInviteCode} font={font} inviteCode={currentInviteCode} onClose={() => setShowInviteCode(false)} />
      {currentList && <ReceiptScanModal visible={showReceiptScan} font={font} listId={currentList.list_id} onClose={() => setShowReceiptScan(false)} onPricesSaved={() => { fetchItems(); fetchLists(); }} />}
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10 },
  menuBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  workspaceInfo: { flex: 1 },
  workspaceName: { fontSize: 22, lineHeight: 26 },
  workspaceType: { fontSize: 11, letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemCountPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  itemCountText: { fontSize: 13 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  titleBlock: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  listTitle: { fontSize: 36, lineHeight: 42 },
  listSubtitle: { fontSize: 14, marginTop: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  searchInput: { flex: 1, fontSize: 15 },
  quickAddBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  quickAddText: { color: '#fff', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 8 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { flex: 1, fontSize: 18 },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sectionBadgeText: { fontSize: 11 },
  itemCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15 },
  itemChecked: { textDecorationLine: 'line-through', opacity: 0.6 },
  qtyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  qtyText: { fontSize: 13 },
  deleteBtn: { padding: 4 },
  fab: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
});
```

- [ ] **Step 2: Keep `theme` prop on all modal calls for now** — PantryScreen initially passes `theme` to all modals unchanged. The `theme` prop will be removed from each modal's call site in Task 18 after all modals have been migrated to use `useTheme()` internally.

- [ ] **Step 3: Commit**
```bash
git add frontend/app/screens/PantryScreen.tsx
git commit -m "feat: create PantryScreen with Living Pantry main list design"
```

---

## Task 10: Redesign AddItemModal + EditItemModal

**Files:**
- Modify: `frontend/components/modals/AddItemModal.tsx`
- Modify: `frontend/components/modals/EditItemModal.tsx`

Per design: bottom sheet modal, "Add New Item" title + X close, ITEM NAME field, CATEGORY horizontal pill chips (with icon), QUANTITY +/- stepper, UNIT dropdown (picker), Cancel + Save Item buttons.

- [ ] **Step 1: Rewrite AddItemModal**

Remove `theme` from Props. Call `useTheme()` internally. Add `unit` state. Replace UI with:
- Bottom sheet style (slide up from bottom)
- "Add New Item" bold title
- Item name text input (labeled INPUT NAME)
- Horizontal scrolling category chips (icon + label, active = green fill)
- Quantity row: minus button | number | plus button (all styled as rounded squares)
- Unit: simple row of unit chip options (items, pcs, kg, lb, L, bags) OR a dropdown picker
- Cancel (outline) + Save Item (primary green) buttons side by side

Key style rules from DESIGN.md:
- Category chip active: `primary` background, white text
- Category chip inactive: gray background, gray text
- +/- buttons: `surfaceContainer` background, rounded-xl
- Save button: `primary` (#006a28) full-width rounded-xl

- [ ] **Step 2: Rewrite EditItemModal similarly** — same design as AddItemModal, pre-populated with existing item data.

- [ ] **Step 3: Commit**
```bash
git add frontend/components/modals/AddItemModal.tsx frontend/components/modals/EditItemModal.tsx
git commit -m "feat: redesign Add/Edit item modals with Living Pantry style"
```

---

## Task 11: Redesign CategoryModal (form view only)

**Files:**
- Modify: `frontend/components/modals/CategoryModal.tsx`

The list view is now in CategoriesScreen (Task 14). This modal becomes a full-screen form for add/edit only. Remove `theme` prop, use `useTheme()`.

Per design:
- Back arrow + "Edit Category" / "Add Category" title
- PREVIEW card (dashed border, shows selected icon + name pill in selected color)
- Category Name input
- Vibrant Palette: grid of 15 color circles, selected = ring
- Curated Icon: 6-column grid of icon cells, selected = colored background
- "Save Category" button (full-width, primary green)

- [ ] **Step 1: Strip list view, make it a form-only modal**

The modal now always shows the form. Props become:
```typescript
type Props = {
  visible: boolean;
  font: FontMap;
  category: Category | null;  // null = new category
  sessionToken: string | null;
  currentWorkspace: Workspace | null;
  onClose: () => void;
  onSaved: () => void;
};
```

- [ ] **Step 2: Rewrite with new design**

Preview card at top (dashed border `outlineVariant`):
```tsx
<View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: theme.outlineVariant, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 }}>
  <TouchableOpacity style={[{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: categoryColor, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
    <Ionicons name={categoryIcon as any} size={18} color="#fff" />
    <Text style={{ color: '#fff', fontFamily: font.bodyBold, fontSize: 15 }}>{categoryName || 'Fresh Produce'}</Text>
  </TouchableOpacity>
  <Text style={{ color: theme.textSecondary, fontFamily: font.body, fontSize: 12, marginTop: 8 }}>How it will look in your pantry</Text>
</View>
```

Color palette: `flexWrap: 'wrap'`, 5 per row, each circle `width: 44, height: 44, borderRadius: 22`. Selected state = white 3px ring with `elevation: 4`.

Icon grid: 6 columns, each cell `width: 48, height: 48, borderRadius: 12`. Selected = `categoryColor + '20'` background + `borderWidth: 2, borderColor: categoryColor`.

- [ ] **Step 3: Update CategoriesScreen and all callers to use new Props signature**

- [ ] **Step 4: Commit**
```bash
git add frontend/components/modals/CategoryModal.tsx
git commit -m "feat: redesign category form modal with preview + color/icon picker"
```

---

## Task 12: CategoriesScreen tab

**Files:**
- Create: `frontend/app/screens/CategoriesScreen.tsx`

Per design: full screen (not modal), back arrow not needed (it's a tab), "Categories" title + "Edit" button top-right, subtitle text, scrollable list of category cards (icon bg + name + item count), "Add Category" button, "Pro Tip" card at bottom.

- [ ] **Step 1: Create CategoriesScreen**

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { PALETTE, EXPO_PUBLIC_BACKEND_URL } from '../../components/constants';
import type { FontMap, Category } from '../../components/types';
import CategoryModal from '../../components/modals/CategoryModal';

type Props = {
  font: FontMap;
  categories: Category[];
  fetchCategories: () => void;
};

export default function CategoriesScreen({ font, categories, fetchCategories }: Props) {
  const { theme } = useTheme();
  const { sessionToken, currentWorkspace } = useAuth();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top, insets.top);

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleDelete = (cat: Category) => {
    Alert.alert('Delete Category', `Delete "${cat.name}"? Items will move to "Other".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!currentWorkspace) return;
        await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/categories/${cat.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        fetchCategories();
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: topPadding }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontFamily: font.display, color: theme.text }}>Categories</Text>
        <TouchableOpacity><Text style={{ color: theme.primary, fontFamily: font.bodySemiBold, fontSize: 15 }}>Edit</Text></TouchableOpacity>
      </View>
      <Text style={{ paddingHorizontal: 20, fontSize: 14, fontFamily: font.body, color: theme.textSecondary, marginBottom: 16 }}>
        Organize your kitchen essentials by tailoring categories to your household needs.
      </Text>

      <FlatList
        data={categories}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[st.catCard, { backgroundColor: theme.surface }]}
            onPress={() => { setEditingCategory(cat); setShowForm(true); }}
          >
            <View style={[st.catIconWrap, { backgroundColor: cat.color + '20' }]}>
              <Ionicons name={cat.icon as any} size={22} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: font.bodyMedium, color: theme.text }}>{cat.name}</Text>
              {cat.name === 'Other' && (
                <Text style={{ fontSize: 12, fontFamily: font.body, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>DEFAULT</Text>
              )}
            </View>
            {cat.name !== 'Other' && (
              <TouchableOpacity onPress={() => handleDelete(cat)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={18} color={theme.outline} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          <View style={{ marginTop: 20, gap: 16 }}>
            <TouchableOpacity
              style={[st.addBtn, { backgroundColor: theme.primary }]}
              onPress={() => { setEditingCategory(null); setShowForm(true); }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: font.bodyBold, fontSize: 16 }}>Add Category</Text>
            </TouchableOpacity>
            <View style={[st.proTip, { backgroundColor: theme.primary + '15' }]}>
              <Text style={{ fontFamily: font.bodyBold, color: theme.primary, fontSize: 14, marginBottom: 4 }}>Pro Tip</Text>
              <Text style={{ fontFamily: font.body, color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Group categories by your grocery store's layout to cut your shopping time in half.
              </Text>
            </View>
          </View>
        }
      />

      <CategoryModal
        visible={showForm}
        font={font}
        category={editingCategory}
        sessionToken={sessionToken}
        currentWorkspace={currentWorkspace}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); fetchCategories(); }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  catCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14 },
  catIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  proTip: { borderRadius: 16, padding: 16 },
});
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/screens/CategoriesScreen.tsx
git commit -m "feat: create CategoriesScreen tab with add/edit/delete"
```

---

## Task 13: Redesign ListsModal (Switch List bottom sheet)

**Files:**
- Modify: `frontend/components/modals/ListsModal.tsx`

Per design: bottom sheet titled "Switch List", ACTIVE LISTS section with list cards (colored icon + name + status badge + chevron), HISTORY section (grid of completed list chips), "Create New List" green button. Remove `theme` prop, use `useTheme()`.

Status badge colors:
- ACTIVE: blue `#1b6ef3`
- IN PROGRESS: orange `#ff9727`
- COMPLETED: green `#006a28`

List icons: colored square icon per list (use list name initial + category color or fixed colors).

- [ ] **Step 1: Rewrite ListsModal**

```typescript
// Key structural changes:
// - useTheme() instead of theme prop
// - "Switch List" title
// - Section header "ACTIVE LISTS" and "HISTORY"
// - Each active list: icon box + name + status chip + checkmark (if current) or chevron
// - History: horizontal scrollable chips showing completed list name + date + item count
// - Create New List button at bottom
```

- [ ] **Step 2: Commit**
```bash
git add frontend/components/modals/ListsModal.tsx
git commit -m "feat: redesign ListsModal as Switch List bottom sheet"
```

---

## Task 14: Redesign HouseholdSwitcherModal

**Files:**
- Modify: `frontend/components/modals/HouseholdSwitcherModal.tsx`

Per design: "Switch Household" bottom sheet. Each household: green square icon + name + type subtitle. Active = green border + checkmark. "Create New Household" primary button. "Join with Code" secondary button.

- [ ] **Step 1: Rewrite with new design, remove `theme` prop**
- [ ] **Step 2: Commit**
```bash
git add frontend/components/modals/HouseholdSwitcherModal.tsx
git commit -m "feat: redesign HouseholdSwitcherModal"
```

---

## Task 15: Redesign CreateHouseholdModal + JoinHouseholdModal + HouseholdDetailsModal

**Files:**
- Modify: `frontend/components/modals/CreateHouseholdModal.tsx`
- Modify: `frontend/components/modals/JoinHouseholdModal.tsx`
- Modify: `frontend/components/modals/HouseholdDetailsModal.tsx`

**CreateHouseholdModal** — "Plant Your Roots." hero with tree illustration (use large Ionicons `leaf` or `home` on green background), household name input, "Private Invite Code" info card, "Create Household →" button, feature chips at bottom.

**JoinHouseholdModal** — "Welcome Aboard" hero with `person-add` icon on green circle, invite code input (styled `XXXX-XXXX`), "Join Household →" primary button, divider "OR", "Scan QR Code" outline button, "Don't have a code? Create new" link.

**HouseholdDetailsModal** — household icon + name + est. date + member count, "Invite New Pantry Keepers" card with invite code + Copy button + QR placeholder, "Household Members" section with member rows (avatar + name + role badge), "Leave Household" outline button, "Delete Household" destructive red button.

- [ ] **Step 1: Rewrite all three, removing `theme` prop**
- [ ] **Step 2: Commit**
```bash
git add frontend/components/modals/CreateHouseholdModal.tsx \
        frontend/components/modals/JoinHouseholdModal.tsx \
        frontend/components/modals/HouseholdDetailsModal.tsx
git commit -m "feat: redesign household modals (create, join, details)"
```

---

## Task 16: SettingsScreen

**Files:**
- Create: `frontend/app/screens/SettingsScreen.tsx`

Per design: user card at top (avatar + name + plan badge), Appearance section (Light/Dark/System segmented control), HOUSEHOLD section (Household Settings row, Manage Members row with active badge), PREFERENCES section (Notifications, Privacy & Security), SUPPORT section (Help & Support, Log Out in red). Version at bottom.

- [ ] **Step 1: Create SettingsScreen**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { PALETTE } from '../../components/constants';
import type { FontMap } from '../../components/types';

type Props = { font: FontMap };

export default function SettingsScreen({ font }: Props) {
  const { theme, colorMode, setColorMode } = useTheme();
  const { user, logout, currentWorkspace } = useAuth();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top, insets.top);

  const memberCount = currentWorkspace?.member_ids?.length ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingTop: topPadding + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontFamily: font.display, color: theme.text }}>Settings</Text>
      </View>

      {/* User card */}
      {user && (
        <TouchableOpacity style={[st.userCard, { backgroundColor: theme.surface, marginHorizontal: 16 }]}>
          <View style={[st.avatar, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="person" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontFamily: font.display, color: theme.text }}>{user.name}</Text>
            <Text style={{ fontSize: 13, fontFamily: font.body, color: theme.textSecondary }}>{user.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.outline} />
        </TouchableOpacity>
      )}

      {/* Appearance */}
      <View style={st.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="color-palette-outline" size={18} color={theme.primary} />
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: font.display }]}>Appearance</Text>
        </View>
        <View style={[st.segmentedControl, { backgroundColor: theme.surfaceContainer }]}>
          {(['light', 'dark', 'system'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[st.segment, colorMode === mode && { backgroundColor: theme.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 }]}
              onPress={() => setColorMode(mode)}
            >
              <Ionicons
                name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                size={14}
                color={colorMode === mode ? theme.primary : theme.outline}
              />
              <Text style={{ fontSize: 13, fontFamily: colorMode === mode ? font.bodySemiBold : font.body, color: colorMode === mode ? theme.text : theme.outline, textTransform: 'capitalize' }}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Household */}
      <View style={st.sectionLabel}>
        <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>HOUSEHOLD</Text>
      </View>
      <View style={[st.menuGroup, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={st.menuRow}>
          <View style={[st.menuIcon, { backgroundColor: PALETTE.primary + '18' }]}><Ionicons name="home-outline" size={18} color={PALETTE.primary} /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Household Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.outline} />
        </TouchableOpacity>
        <View style={[st.divider, { backgroundColor: theme.surfaceContainer }]} />
        <TouchableOpacity style={st.menuRow}>
          <View style={[st.menuIcon, { backgroundColor: '#3b82f6' + '18' }]}><Ionicons name="people-outline" size={18} color="#3b82f6" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Manage Members</Text>
          {memberCount > 0 && (
            <View style={{ backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontFamily: font.bodySemiBold }}>{memberCount} Active</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={theme.outline} />
        </TouchableOpacity>
      </View>

      {/* Preferences */}
      <View style={st.sectionLabel}>
        <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>PREFERENCES</Text>
      </View>
      <View style={[st.menuGroup, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={st.menuRow}>
          <View style={[st.menuIcon, { backgroundColor: '#f97316' + '18' }]}><Ionicons name="notifications-outline" size={18} color="#f97316" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.outline} />
        </TouchableOpacity>
        <View style={[st.divider, { backgroundColor: theme.surfaceContainer }]} />
        <TouchableOpacity style={st.menuRow}>
          <View style={[st.menuIcon, { backgroundColor: '#6b7280' + '18' }]}><Ionicons name="shield-outline" size={18} color="#6b7280" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Privacy & Security</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.outline} />
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={st.sectionLabel}>
        <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>SUPPORT</Text>
      </View>
      <View style={[st.menuGroup, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={st.menuRow}>
          <View style={[st.menuIcon, { backgroundColor: '#8b5cf6' + '18' }]}><Ionicons name="help-circle-outline" size={18} color="#8b5cf6" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Help & Support</Text>
          <Ionicons name="open-outline" size={16} color={theme.outline} />
        </TouchableOpacity>
        <View style={[st.divider, { backgroundColor: theme.surfaceContainer }]} />
        <TouchableOpacity style={st.menuRow} onPress={logout}>
          <View style={[st.menuIcon, { backgroundColor: PALETTE.error + '18' }]}><Ionicons name="log-out-outline" size={18} color={PALETTE.error} /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyBold, color: PALETTE.error }}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ textAlign: 'center', fontSize: 11, fontFamily: font.body, color: theme.outline, marginTop: 32 }}>
        THE LIVING PANTRY v2.4.0{'\n'}Made with locally sourced ingredients.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15 },
  segmentedControl: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  sectionLabel: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  menuGroup: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
});
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/screens/SettingsScreen.tsx
git commit -m "feat: create SettingsScreen with appearance, household, and support sections"
```

---

## Task 17: ListsScreen tab content

**Files:**
- Create: `frontend/app/screens/ListsScreen.tsx`

Simple screen showing the same content as the ListsModal but in a full tab — active lists + history + create button. Tapping a list selects it and jumps to pantry tab.

- [ ] **Step 1: Create ListsScreen using same data as PantryScreen**

Pass `onNavigateToPantry` callback from index.tsx to switch tabs when a list is selected.

- [ ] **Step 2: Commit**
```bash
git add frontend/app/screens/ListsScreen.tsx
git commit -m "feat: create ListsScreen tab"
```

---

## Task 18: Migrate remaining modals + wire everything up

**Files:**
- Modify: all remaining modals (`DeleteItemModal`, `DeleteHouseholdModal`, `CreateListModal`, `ProfileModal`, `InviteCodeModal`, `ReceiptScanModal`)
- Modify: `frontend/app/screens/PantryScreen.tsx` — remove `theme` prop from all modal call sites

- [ ] **Step 1: Migrate remaining modals to useTheme()** — for each of `DeleteItemModal`, `DeleteHouseholdModal`, `CreateListModal`, `ProfileModal`, `InviteCodeModal`, `ReceiptScanModal`:
  - Remove `theme: Theme` from Props
  - Add `const { theme } = useTheme();` at top of component
  - Remove `theme` from all call sites in PantryScreen.tsx as each modal is migrated

- [ ] **Step 2: Remove `theme` prop from ALL modal calls in PantryScreen.tsx** (after all modals above are migrated). Also remove `theme` from the `font` props that still thread `theme` through indirectly.

- [ ] **Step 3: Verify the app builds and runs**
```bash
cd frontend && yarn start
```
Check on web: `yarn web`

- [ ] **Step 4: Fix any TypeScript errors**
```bash
cd frontend && yarn lint
```

- [ ] **Step 5: Final commit**
```bash
git add -A
git commit -m "feat: complete Living Pantry UI redesign — all screens updated"
```

---

## Final: Git commands for user

```bash
git add frontend/ backend/server.py docs/
git commit -m "feat: implement The Living Pantry UI redesign — new design system, 4-tab nav, all 11 screens"
git push origin living-pantry-redesign
```
