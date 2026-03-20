export type FontMap = {
  display: string | undefined;
  displayMedium: string | undefined;
  displayRegular: string | undefined;
  body: string | undefined;
  bodyMedium: string | undefined;
  bodySemiBold: string | undefined;
  bodyBold: string | undefined;
};

export type Theme = {
  background: string;
  surfaceContainer: string;
  surface: string;
  text: string;
  textSecondary: string;
  inputBg: string;
  primary: string;
  primaryContainer: string;
  tertiary: string;
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
