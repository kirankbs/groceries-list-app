# TypeScript Types

```typescript
// frontend/components/types.ts

type FontMap = {
  display: string | undefined;        // PlusJakartaSans_700Bold
  displayMedium: string | undefined;  // PlusJakartaSans_600SemiBold
  displayRegular: string | undefined; // PlusJakartaSans_400Regular
  body: string | undefined;           // Inter_400Regular
  bodyMedium: string | undefined;     // Inter_500Medium
  bodySemiBold: string | undefined;   // Inter_600SemiBold
  bodyBold: string | undefined;       // Inter_700Bold
  serif: string | undefined;          // PlusJakartaSans_700Bold (alias)
  serifMedium: string | undefined;    // PlusJakartaSans_500Medium (alias)
};

type Theme = {
  background: string; surfaceContainer: string; surface: string;
  text: string; textSecondary: string; inputBg: string;
  primary: string; primaryContainer: string; tertiary: string;
  outline: string; outlineVariant: string; error: string;
  border: string; isDark: boolean;
};

type Category = { id: string; name: string; color: string; icon: string; };

type GroceryItem = {
  id: string; list_id: string; name: string;
  quantity: number; unit: string; category: string; checked: boolean;
  price?: number; price_updated_at?: string;
};

type WorkspaceMember = { user_id: string; name: string; email: string; picture?: string; };

type Workspace = {
  workspace_id: string; name: string; type: 'personal' | 'shared';
  invite_code?: string; owner_id: string; member_ids: string[];
  members?: WorkspaceMember[];
  active_lists_count?: number; completed_lists_count?: number;
  currency?: string; created_at: string;
};

type ShoppingList = {
  list_id: string; workspace_id: string; name: string;
  status: 'active' | 'in_progress' | 'completed';
  is_template: boolean; created_from_template_id?: string;
  total_items?: number; checked_items?: number; item_count?: number;
  created_at: string; completed_at?: string;
};

type TabName = 'pantry' | 'lists' | 'categories' | 'settings';
```
