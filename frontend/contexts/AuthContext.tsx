import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  personal_workspace_id: string;
  created_at: string;
}

interface WorkspaceMember {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

interface Workspace {
  workspace_id: string;
  name: string;
  type: 'personal' | 'shared';
  invite_code?: string;
  owner_id: string;
  member_ids: string[];
  members?: WorkspaceMember[];
  active_lists_count?: number;
  completed_lists_count?: number;
  created_at: string;
}

interface ShoppingList {
  list_id: string;
  workspace_id: string;
  name: string;
  status: 'active' | 'in_progress' | 'completed';
  is_template: boolean;
  created_from_template_id?: string;
  total_items?: number;
  checked_items?: number;
  created_at: string;
  completed_at?: string;
}

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentList: ShoppingList | null;
  lists: ShoppingList[];
  templates: ShoppingList[];
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  authError: string | null;
  // Auth
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthError: () => void;
  // Workspaces
  setCurrentWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  joinWorkspace: (inviteCode: string) => Promise<Workspace>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  getInviteCode: (workspaceId: string) => Promise<string>;
  regenerateInviteCode: (workspaceId: string) => Promise<string>;
  fetchWorkspaces: () => Promise<void>;
  // Lists
  setCurrentList: (list: ShoppingList | null) => void;
  fetchLists: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  createList: (name: string, copyFromListId?: string, fromTemplateId?: string) => Promise<ShoppingList>;
  updateList: (listId: string, data: { name?: string; status?: string }) => Promise<ShoppingList>;
  deleteList: (listId: string) => Promise<void>;
  saveAsTemplate: (listId: string) => Promise<ShoppingList>;
  updateWorkspaceCurrency: (workspaceId: string, currency: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [currentList, setCurrentListState] = useState<ShoppingList | null>(null);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [templates, setTemplates] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const getStoredToken = useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem('session_token');
      }
      return await SecureStore.getItemAsync('session_token');
    } catch {
      return null;
    }
  }, []);

  const storeToken = useCallback(async (token: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('session_token', token);
      } else {
        await SecureStore.setItemAsync('session_token', token);
      }
      setSessionToken(token);
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }, []);

  const clearToken = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('session_token');
      } else {
        await SecureStore.deleteItemAsync('session_token');
      }
      setSessionToken(null);
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }, []);

  const fetchUserData = useCallback(async (token: string, shouldSelectWorkspace: boolean = false) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setWorkspaces(data.workspaces || []);

        if (shouldSelectWorkspace && data.workspaces && data.workspaces.length > 0) {
          const personalWs = data.workspaces.find((w: Workspace) => w.type === 'personal');
          const wsToSelect = personalWs || data.workspaces[0];

          if (wsToSelect) {
            setCurrentWorkspaceState(wsToSelect);

            try {
              const headers = { 'Authorization': `Bearer ${token}` };
              const [listsResponse, templatesResponse] = await Promise.all([
                fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${wsToSelect.workspace_id}/lists`, { headers }),
                fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${wsToSelect.workspace_id}/templates`, { headers }),
              ]);
              if (listsResponse.ok) {
                const listsData = await listsResponse.json();
                setLists(listsData);
                if (listsData.length > 0) {
                  const activeList = listsData.find((l: ShoppingList) => l.status !== 'completed');
                  setCurrentListState(activeList || listsData[0]);
                }
              }
              if (templatesResponse.ok) {
                setTemplates(await templatesResponse.json());
              }
            } catch (err) {
              console.error('Error fetching initial lists:', err);
            }
          }
        }
        return true;
      }
      await clearToken();
      return false;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return false;
    }
  }, [clearToken]);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const token = await getStoredToken();
      if (token) {
        const success = await fetchUserData(token, true);
        if (success) {
          setSessionToken(token);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        await storeToken(data.session_token);
        await fetchUserData(data.session_token, true);
      } else {
        const err = await response.json();
        setAuthError(err.detail || 'Login failed');
      }
    } catch (error) {
      setAuthError('Could not connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [storeToken, fetchUserData]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (response.ok) {
        const data = await response.json();
        await storeToken(data.session_token);
        await fetchUserData(data.session_token, true);
      } else {
        const err = await response.json();
        setAuthError(err.detail || 'Registration failed');
      }
    } catch (error) {
      setAuthError('Could not connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [storeToken, fetchUserData]);

  const logout = useCallback(async () => {
    try {
      if (sessionToken) {
        await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        });
      }
    } finally {
      await clearToken();
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setCurrentListState(null);
      setLists([]);
      setTemplates([]);
    }
  }, [sessionToken, clearToken]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const refreshUser = useCallback(async () => {
    if (sessionToken) {
      await fetchUserData(sessionToken);
    }
  }, [sessionToken, fetchUserData]);

  // Workspace functions
  const setCurrentWorkspace = useCallback(async (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    setCurrentListState(null);
    setLists([]);
    setTemplates([]);

    if (sessionToken && workspace) {
      try {
        const headers = { 'Authorization': `Bearer ${sessionToken}` };
        const [listsResponse, templatesResponse] = await Promise.all([
          fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${workspace.workspace_id}/lists`, { headers }),
          fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${workspace.workspace_id}/templates`, { headers }),
        ]);
        if (listsResponse.ok) {
          const listsData = await listsResponse.json();
          setLists(listsData);
          if (listsData.length > 0) {
            const activeList = listsData.find((l: ShoppingList) => l.status !== 'completed');
            setCurrentListState(activeList || listsData[0]);
          }
        }
        if (templatesResponse.ok) {
          setTemplates(await templatesResponse.json());
        }
      } catch (error) {
        console.error('Error fetching workspace data:', error);
      }
    }
  }, [sessionToken]);

  const fetchWorkspaces = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
        if (currentWorkspace) {
          const updated = data.find((w: Workspace) => w.workspace_id === currentWorkspace.workspace_id);
          if (updated) {
            setCurrentWorkspaceState(updated);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  }, [sessionToken, currentWorkspace]);

  const createWorkspace = useCallback(async (name: string): Promise<Workspace> => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create workspace');
    }
    const newWorkspace = await response.json();
    await fetchWorkspaces();
    return newWorkspace;
  }, [sessionToken, fetchWorkspaces]);

  const joinWorkspace = useCallback(async (inviteCode: string): Promise<Workspace> => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ invite_code: inviteCode }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to join workspace');
    }
    const joinedWorkspace = await response.json();
    await fetchWorkspaces();
    return joinedWorkspace;
  }, [sessionToken, fetchWorkspaces]);

  const leaveWorkspace = useCallback(async (workspaceId: string) => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${workspaceId}/leave`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to leave workspace');
    }
    await fetchWorkspaces();
    if (currentWorkspace?.workspace_id === workspaceId) {
      const personalWs = workspaces.find(w => w.type === 'personal');
      if (personalWs) setCurrentWorkspaceState(personalWs);
    }
  }, [sessionToken, fetchWorkspaces, currentWorkspace, workspaces]);

  const getInviteCode = useCallback(async (workspaceId: string): Promise<string> => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${workspaceId}/invite-code`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get invite code');
    }
    const data = await response.json();
    return data.invite_code;
  }, [sessionToken]);

  const regenerateInviteCode = useCallback(async (workspaceId: string): Promise<string> => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${workspaceId}/regenerate-code`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to regenerate invite code');
    }
    const data = await response.json();
    await fetchWorkspaces();
    return data.invite_code;
  }, [sessionToken, fetchWorkspaces]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete household');
    }
    await fetchWorkspaces();
    if (currentWorkspace?.workspace_id === workspaceId) {
      const personalWs = workspaces.find(w => w.type === 'personal');
      if (personalWs) setCurrentWorkspaceState(personalWs);
    }
  }, [sessionToken, fetchWorkspaces, currentWorkspace, workspaces]);

  // List functions
  const setCurrentList = useCallback((list: ShoppingList | null) => {
    setCurrentListState(list);
  }, []);

  const fetchLists = useCallback(async () => {
    if (!sessionToken || !currentWorkspace) return;
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/lists`,
        { headers: { 'Authorization': `Bearer ${sessionToken}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setLists(data);
        const shouldAutoSelect = !currentList || currentList.workspace_id !== currentWorkspace.workspace_id;
        if (shouldAutoSelect && data.length > 0) {
          const activeList = data.find((l: ShoppingList) => l.status !== 'completed');
          setCurrentListState(activeList || data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  }, [sessionToken, currentWorkspace, currentList]);

  const fetchTemplates = useCallback(async () => {
    if (!sessionToken || !currentWorkspace) return;
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/templates`,
        { headers: { 'Authorization': `Bearer ${sessionToken}` } }
      );
      if (response.ok) {
        setTemplates(await response.json());
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [sessionToken, currentWorkspace]);

  const createList = useCallback(async (
    name: string, copyFromListId?: string, fromTemplateId?: string
  ): Promise<ShoppingList> => {
    if (!sessionToken || !currentWorkspace) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({
        name, workspace_id: currentWorkspace.workspace_id,
        copy_from_list_id: copyFromListId, from_template_id: fromTemplateId,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create list');
    }
    const newList = await response.json();
    await fetchLists();
    return newList;
  }, [sessionToken, currentWorkspace, fetchLists]);

  const updateList = useCallback(async (
    listId: string, data: { name?: string; status?: string }
  ): Promise<ShoppingList> => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update list');
    }
    const updatedList = await response.json();
    await fetchLists();
    return updatedList;
  }, [sessionToken, fetchLists]);

  const deleteList = useCallback(async (listId: string) => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/lists/${listId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete list');
    }
    await fetchLists();
    if (currentList?.list_id === listId) setCurrentListState(null);
  }, [sessionToken, fetchLists, currentList]);

  const saveAsTemplate = useCallback(async (listId: string): Promise<ShoppingList> => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/lists/${listId}/save-as-template`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save as template');
    }
    const template = await response.json();
    await fetchTemplates();
    return template;
  }, [sessionToken, fetchTemplates]);

  const updateWorkspaceCurrency = useCallback(async (workspaceId: string, currency: string) => {
    if (!sessionToken) throw new Error('Not authenticated');
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${workspaceId}/currency`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ currency }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update currency');
    }
    await fetchWorkspaces();
  }, [sessionToken, fetchWorkspaces]);

  return (
    <AuthContext.Provider
      value={{
        user, workspaces, currentWorkspace, currentList, lists, templates,
        isLoading, isAuthenticated: !!user, sessionToken, authError,
        login, register, logout, refreshUser, clearAuthError,
        setCurrentWorkspace, createWorkspace, joinWorkspace, leaveWorkspace,
        deleteWorkspace, getInviteCode, regenerateInviteCode, fetchWorkspaces,
        setCurrentList, fetchLists, fetchTemplates, createList, updateList,
        deleteList, saveAsTemplate, updateWorkspaceCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
