import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AUTH_URL = 'https://auth.emergentagent.com/';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  household_id?: string;
  created_at: string;
}

interface Household {
  household_id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  member_ids: string[];
  members?: { user_id: string; name: string; email: string; picture?: string }[];
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  household: Household | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  createHousehold: (name: string) => Promise<Household>;
  joinHousehold: (inviteCode: string) => Promise<Household>;
  leaveHousehold: () => Promise<void>;
  getInviteCode: () => Promise<string>;
  regenerateInviteCode: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Get stored session token
  const getStoredToken = useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        // For web, try to get from localStorage
        return localStorage.getItem('session_token');
      } else {
        return await SecureStore.getItemAsync('session_token');
      }
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }, []);

  // Store session token
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

  // Clear session token
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

  // Fetch user data
  const fetchUserData = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setHousehold(data.household);
        return true;
      } else {
        await clearToken();
        return false;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      return false;
    }
  }, [clearToken]);

  // Process session ID from auth redirect
  const processSessionId = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        await storeToken(data.session_token);
        setUser(data.user);
        
        // Fetch full user data including household
        await fetchUserData(data.session_token);
      } else {
        console.error('Session exchange failed');
      }
    } catch (error) {
      console.error('Error processing session ID:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeToken, fetchUserData]);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      // Check for session_id in URL (web only)
      if (Platform.OS === 'web') {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');
        
        if (sessionId) {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          await processSessionId(sessionId);
          return;
        }
      }

      // Check for stored token
      const token = await getStoredToken();
      if (token) {
        const success = await fetchUserData(token);
        if (success) {
          setSessionToken(token);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [getStoredToken, fetchUserData, processSessionId]);

  // Handle deep link for mobile
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      // Parse session_id from URL
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const hash = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hash);
        const sessionId = params.get('session_id');
        
        if (sessionId) {
          await processSessionId(sessionId);
        }
      }
    };

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for URL changes
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [processSessionId]);

  // Login function
  const login = useCallback(async () => {
    try {
      setIsLoading(true);

      // Determine redirect URL based on platform
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin + window.location.pathname
        : Linking.createURL('/');

      const authUrl = `${AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        // For web, redirect to auth page
        window.location.href = authUrl;
      } else {
        // For mobile, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const hashIndex = result.url.indexOf('#');
          if (hashIndex !== -1) {
            const hash = result.url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const sessionId = params.get('session_id');
            
            if (sessionId) {
              await processSessionId(sessionId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [processSessionId]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (sessionToken) {
        await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearToken();
      setUser(null);
      setHousehold(null);
    }
  }, [sessionToken, clearToken]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (sessionToken) {
      await fetchUserData(sessionToken);
    }
  }, [sessionToken, fetchUserData]);

  // Create household
  const createHousehold = useCallback(async (name: string): Promise<Household> => {
    if (!sessionToken) throw new Error('Not authenticated');

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/households`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create household');
    }

    const newHousehold = await response.json();
    await refreshUser();
    return newHousehold;
  }, [sessionToken, refreshUser]);

  // Join household
  const joinHousehold = useCallback(async (inviteCode: string): Promise<Household> => {
    if (!sessionToken) throw new Error('Not authenticated');

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/households/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ invite_code: inviteCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to join household');
    }

    const joinedHousehold = await response.json();
    await refreshUser();
    return joinedHousehold;
  }, [sessionToken, refreshUser]);

  // Leave household
  const leaveHousehold = useCallback(async () => {
    if (!sessionToken) throw new Error('Not authenticated');

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/households/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to leave household');
    }

    await refreshUser();
  }, [sessionToken, refreshUser]);

  // Get invite code
  const getInviteCode = useCallback(async (): Promise<string> => {
    if (!sessionToken) throw new Error('Not authenticated');

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/households/invite-code`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get invite code');
    }

    const data = await response.json();
    return data.invite_code;
  }, [sessionToken]);

  // Regenerate invite code
  const regenerateInviteCode = useCallback(async (): Promise<string> => {
    if (!sessionToken) throw new Error('Not authenticated');

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/households/regenerate-code`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to regenerate invite code');
    }

    const data = await response.json();
    await refreshUser();
    return data.invite_code;
  }, [sessionToken, refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        household,
        isLoading,
        isAuthenticated: !!user,
        sessionToken,
        login,
        logout,
        refreshUser,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        getInviteCode,
        regenerateInviteCode,
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
