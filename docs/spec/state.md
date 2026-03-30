# State Management

## AuthContext (`contexts/AuthContext.tsx`)

### State fields

| Field | Type | Notes |
|---|---|---|
| `user` | `User \| null` | Current authenticated user |
| `workspaces` | `Workspace[]` | All workspaces user is member of |
| `currentWorkspace` | `Workspace \| null` | Active workspace |
| `currentList` | `ShoppingList \| null` | Active shopping list |
| `lists` | `ShoppingList[]` | Non-template lists for currentWorkspace |
| `templates` | `ShoppingList[]` | Template lists for currentWorkspace |
| `isLoading` | `boolean` | Auth/init loading flag |
| `isAuthenticated` | `boolean` | Derived: `!!user` |
| `sessionToken` | `string \| null` | In-memory token mirror |
| `authError` | `string \| null` | Login/register error message |
| `pendingSyncCount` | `number` | Count of items in offline sync queue |
| `isOnline` | `boolean` | From `useNetworkStatus` hook |
| `wasOffline` | `boolean` | One-cycle flag: true on offline→online transition only |

### Methods (all `useCallback`)

| Signature | Notes |
|---|---|
| `login(email, password): Promise<void>` | POST /auth/login; stores token; fetches user data |
| `register(email, password, name): Promise<void>` | POST /auth/register; same post-flow as login |
| `logout(): Promise<void>` | POST /auth/logout; clears all state |
| `refreshUser(): Promise<void>` | Re-fetches /auth/me with current token |
| `clearAuthError(): void` | Sets authError = null |
| `requestPasswordReset(email): Promise<{success, error?}>` | POST /auth/forgot-password; returns success/error |
| `confirmPasswordReset(email, code, newPassword): Promise<{success, error?}>` | POST /auth/reset-password; returns success/error |
| `refreshPendingCount(): Promise<void>` | Re-reads syncQueue.count() into pendingSyncCount |
| `setCurrentWorkspace(workspace): Promise<void>` | Switches workspace; fetches lists + templates; auto-selects first active list |
| `createWorkspace(name): Promise<Workspace>` | POST /workspaces; calls fetchWorkspaces() |
| `joinWorkspace(inviteCode): Promise<Workspace>` | POST /workspaces/join; calls fetchWorkspaces() |
| `leaveWorkspace(workspaceId): Promise<void>` | POST /workspaces/{id}/leave; falls back to personal workspace |
| `deleteWorkspace(workspaceId): Promise<void>` | DELETE /workspaces/{id}; falls back to personal workspace |
| `getInviteCode(workspaceId): Promise<string>` | GET /workspaces/{id}/invite-code |
| `regenerateInviteCode(workspaceId): Promise<string>` | POST /workspaces/{id}/regenerate-code |
| `fetchWorkspaces(): Promise<Workspace[] \| undefined>` | GET /workspaces; updates currentWorkspace if found |
| `setCurrentList(list \| null): void` | Direct state setter |
| `fetchLists(): Promise<void>` | GET /workspaces/{id}/lists; auto-selects only if workspace changed |
| `fetchTemplates(): Promise<void>` | GET /workspaces/{id}/templates |
| `createList(name, copyFromListId?, fromTemplateId?): Promise<ShoppingList>` | POST /lists; calls fetchLists() |
| `updateList(listId, {name?, status?}): Promise<ShoppingList>` | PUT /lists/{id}; calls fetchLists() |
| `deleteList(listId): Promise<void>` | DELETE /lists/{id}; nulls currentList if deleted |
| `saveAsTemplate(listId): Promise<ShoppingList>` | POST /lists/{id}/save-as-template; calls fetchTemplates() |
| `updateWorkspaceCurrency(workspaceId, currency): Promise<void>` | PUT /workspaces/{id}/currency; calls fetchWorkspaces() |

**Init sequence:** on mount, reads token from storage → `fetchUserData(token, shouldSelectWorkspace=true)` → selects personal workspace (or first), fetches lists + templates in parallel, auto-selects first non-completed list.

---

## ThemeContext (`components/ThemeContext.tsx`)

| Field | Type | Notes |
|---|---|---|
| `colorMode` | `'light' \| 'dark' \| 'system'` | Default: `'system'` |
| `setColorMode(mode)` | `(ColorMode) => void` | State only (not persisted to disk) |
| `theme` | `Theme` | Derived from colorMode + system scheme |
| `isDark` | `boolean` | `colorMode === 'dark' \|\| (colorMode === 'system' && systemScheme === 'dark')` |
