import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { EXPO_PUBLIC_BACKEND_URL } from '../components/constants';
import { FontMap, Category, GroceryItem } from '../components/types';
import type { TabName } from '../components/types';
import { offlineCache } from '../services/offlineCache';
import { syncQueue } from '../services/syncQueue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../components/ThemeContext';
import BottomTabBar from '../components/BottomTabBar';
import PantryScreen from './screens/PantryScreen';
import ListsScreen from './screens/ListsScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import SettingsScreen from './screens/SettingsScreen';
import CreateListModal from '../components/modals/CreateListModal';
import HouseholdDetailsModal from '../components/modals/HouseholdDetailsModal';
import InviteCodeModal from '../components/modals/InviteCodeModal';
import DeleteHouseholdModal from '../components/modals/DeleteHouseholdModal';

export default function GroceryTodo() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const {
    user, currentWorkspace, currentList, lists, templates, setCurrentList, createList,
    isLoading: authLoading, isAuthenticated, login, register, logout, sessionToken,
    authError, clearAuthError, getInviteCode, leaveWorkspace, deleteWorkspace,
    isOnline, wasOffline, pendingSyncCount, refreshPendingCount,
  } = useAuth();
  const insets = useSafeAreaInsets();

  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabName>('pantry');
  const [showCreateListFromListsTab, setShowCreateListFromListsTab] = useState(false);
  const [showHouseholdDetailsFromSettings, setShowHouseholdDetailsFromSettings] = useState(false);
  const [showInviteCodeFromSettings, setShowInviteCodeFromSettings] = useState(false);
  const [currentInviteCodeFromSettings, setCurrentInviteCodeFromSettings] = useState('');
  const [showDeleteHouseholdFromSettings, setShowDeleteHouseholdFromSettings] = useState(false);
  const [deleteHouseholdFromSettingsLoading, setDeleteHouseholdFromSettingsLoading] = useState(false);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const font: FontMap = useMemo(() => ({
    display: fontsLoaded ? 'PlusJakartaSans_700Bold' : undefined,
    displayMedium: fontsLoaded ? 'PlusJakartaSans_600SemiBold' : undefined,
    displayRegular: fontsLoaded ? 'PlusJakartaSans_400Regular' : undefined,
    body: fontsLoaded ? 'Inter_400Regular' : undefined,
    bodyMedium: fontsLoaded ? 'Inter_500Medium' : undefined,
    bodySemiBold: fontsLoaded ? 'Inter_600SemiBold' : undefined,
    bodyBold: fontsLoaded ? 'Inter_700Bold' : undefined,
    serif: fontsLoaded ? 'PlusJakartaSans_700Bold' : undefined,
    serifMedium: fontsLoaded ? 'PlusJakartaSans_500Medium' : undefined,
  }), [fontsLoaded]);

  const fetchCategories = useCallback(async () => {
    if (!sessionToken || !currentWorkspace) return;
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/categories`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error(e); }
  }, [sessionToken, currentWorkspace]);

  const fetchItems = useCallback(async () => {
    if (!sessionToken || !currentList) return;
    setLoading(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/lists/${currentList.list_id}/items`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        await offlineCache.setItems(currentList.list_id, data);
        setLastSynced(new Date());
      }
    } catch (e) {
      // Offline: serve cached items for this list
      const cached = await offlineCache.getItems(currentList.list_id);
      if (cached) setItems(cached.data);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, currentList]);

  useEffect(() => { if (currentWorkspace) fetchCategories(); }, [currentWorkspace, fetchCategories]);
  useEffect(() => { if (currentList) fetchItems(); }, [currentList, fetchItems]);

  // When connectivity returns, flush queued mutations then re-confirm server state.
  // Flush runs unconditionally (not gated on currentList); fetchItems is gated.
  useEffect(() => {
    if (!wasOffline || !sessionToken) return;
    (async () => {
      setIsSyncing(true);
      await syncQueue.flush(sessionToken);
      await refreshPendingCount();
      if (currentList) await fetchItems();
      setIsSyncing(false);
    })();
  }, [wasOffline, sessionToken, currentList, fetchItems, refreshPendingCount]);

  if (authLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f6f5' }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#006a28', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="leaf" size={32} color="#fff" />
        </View>
        <Text style={{ fontSize: 22, fontFamily: font.display, color: '#006a28', marginBottom: 4 }}>The Living Pantry</Text>
        <ActivityIndicator size="small" color="#006a28" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (!isAuthenticated) {
    const handleAuthSubmit = () => {
      if (isRegisterMode) { if (authName.trim()) register(authEmail, authPassword, authName); }
      else { login(authEmail, authPassword); }
    };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f6f5' }}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
          {/* Brand header */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#006a28', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="restaurant-outline" size={28} color="#fff" />
            </View>
            <Text style={{ fontSize: 28, fontFamily: font.display, color: '#006a28' }}>The Living Pantry</Text>
            <Text style={{ fontSize: 14, fontFamily: font.body, color: '#424940', marginTop: 4, textAlign: 'center' }}>
              Your household&apos;s shared{' '}
              <Text style={{ color: '#006a28', fontFamily: font.bodySemiBold }}>grocery curator</Text>.
            </Text>
          </View>

          {/* Feature chips */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
            {[
              { icon: 'people-outline', title: 'Collaborative Lists', desc: 'Plan meals together in real-time.' },
              { icon: 'sync-outline', title: 'Real-time Sync', desc: 'Always up-to-date across devices.' },
            ].map(f => (
              <View key={f.title} style={{ flex: 1, backgroundColor: '#eae7e7', borderRadius: 16, padding: 14 }}>
                <Ionicons name={f.icon as any} size={22} color="#006a28" />
                <Text style={{ fontSize: 13, fontFamily: font.bodySemiBold, color: '#1a1c1a', marginTop: 8 }}>{f.title}</Text>
                <Text style={{ fontSize: 11, fontFamily: font.body, color: '#424940', marginTop: 3 }}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* Smart categories banner */}
          <View style={{ backgroundColor: '#006a28', borderRadius: 20, padding: 18, marginBottom: 28 }}>
            <Text style={{ fontSize: 18, fontFamily: font.display, color: '#fff' }}>Smart Categories</Text>
            <Text style={{ fontSize: 13, fontFamily: font.body, color: '#fff', opacity: 0.85, marginTop: 6 }}>
              Items automatically sorted by grocery aisle for faster shopping trips.
            </Text>
          </View>

          {/* Auth card */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 }}>
            <Text style={{ fontSize: 20, fontFamily: font.display, color: '#1a1c1a', textAlign: 'center', marginBottom: 4 }}>
              {isRegisterMode ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: font.body, color: '#424940', textAlign: 'center', marginBottom: 24 }}>
              {isRegisterMode ? 'Join the pantry community' : 'Sign in to sync your pantry lists'}
            </Text>

            {isRegisterMode && (
              <>
                <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: '#424940', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>NAME</Text>
                <TextInput
                  style={{ backgroundColor: '#eae7e7', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: font.body, color: '#1a1c1a', marginBottom: 16 }}
                  placeholder="Your name"
                  placeholderTextColor="#72796f"
                  value={authName}
                  onChangeText={setAuthName}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: '#424940', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>EMAIL ADDRESS</Text>
            <TextInput
              style={{ backgroundColor: '#eae7e7', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: font.body, color: '#1a1c1a', marginBottom: 16 }}
              placeholder="hello@livingpantry.com"
              placeholderTextColor="#72796f"
              value={authEmail}
              onChangeText={t => { setAuthEmail(t); clearAuthError(); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: '#424940', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>PASSWORD</Text>
            <TextInput
              style={{ backgroundColor: '#eae7e7', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: font.body, color: '#1a1c1a', marginBottom: 16 }}
              placeholder="Enter your password"
              placeholderTextColor="#72796f"
              value={authPassword}
              onChangeText={t => { setAuthPassword(t); clearAuthError(); }}
              secureTextEntry
            />

            {authError && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffdad6', padding: 12, borderRadius: 12, marginBottom: 12 }}>
                <Ionicons name="alert-circle" size={16} color="#ba1a1a" />
                <Text style={{ color: '#ba1a1a', fontSize: 13, fontFamily: font.body, flex: 1 }}>{authError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: '#006a28', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4, opacity: authLoading ? 0.6 : 1 }}
              onPress={handleAuthSubmit}
              disabled={authLoading}
            >
              {authLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontSize: 16, fontFamily: font.bodyBold }}>{isRegisterMode ? 'Create Account' : 'Sign In'}</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => { setIsRegisterMode(!isRegisterMode); clearAuthError(); }} style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ color: '#424940', fontSize: 14, fontFamily: font.body }}>
              {isRegisterMode ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={{ color: '#006a28', fontFamily: font.bodySemiBold }}>{isRegisterMode ? 'Sign In' : 'Register'}</Text>
            </Text>
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', fontSize: 11, fontFamily: font.body, color: '#72796f', paddingBottom: 24 }}>
            &quot;The kitchen is the heart of every home; let&apos;s keep it organized.&quot;
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const syncStatusLabel = (() => {
    if (isSyncing) return 'Syncing…';
    if (!isOnline) {
      const parts: string[] = ['Offline'];
      if (lastSynced) {
        const mins = Math.floor((Date.now() - lastSynced.getTime()) / 60000);
        parts.push(`synced ${mins < 1 ? 'just now' : `${mins} min ago`}`);
      }
      if (pendingSyncCount > 0) parts.push(`${pendingSyncCount} pending`);
      return parts.join(' · ');
    }
    return null;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      {(syncStatusLabel) && (
        <View style={{
          backgroundColor: isSyncing ? '#1a6b3c' : '#795c00',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: (insets.top || 0) + 8,
          paddingBottom: 8,
          gap: 8,
          zIndex: 100,
        }}>
          <Ionicons
            name={isSyncing ? 'sync-outline' : 'cloud-offline-outline'}
            size={15}
            color="#fff"
          />
          <Text style={{
            color: '#fff',
            fontSize: 13,
            fontFamily: font.body,
            flex: 1,
          }}>
            {syncStatusLabel}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        {activeTab === 'pantry' && (
          <PantryScreen
            font={font}
            items={items}
            setItems={setItems}
            categories={categories}
            fetchCategories={fetchCategories}
            fetchItems={fetchItems}
            loading={loading}
          />
        )}
        {activeTab === 'lists' && (
          <ListsScreen
            font={font}
            lists={lists}
            currentList={currentList}
            onSelectList={setCurrentList}
            onNavigateToPantry={() => setActiveTab('pantry')}
            onCreateNew={() => setShowCreateListFromListsTab(true)}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesScreen font={font} categories={categories} fetchCategories={fetchCategories} />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen font={font} onOpenHouseholdDetails={() => setShowHouseholdDetailsFromSettings(true)} />
        )}
      </View>
      <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
      <CreateListModal
        visible={showCreateListFromListsTab}
        font={font}
        templates={templates}
        lists={lists}
        onClose={() => setShowCreateListFromListsTab(false)}
        onCreated={list => {
          setCurrentList(list);
          setShowCreateListFromListsTab(false);
          setActiveTab('pantry');
        }}
      />
      <HouseholdDetailsModal
        visible={showHouseholdDetailsFromSettings}
        font={font}
        household={currentWorkspace ?? null}
        userId={user?.user_id}
        onClose={() => setShowHouseholdDetailsFromSettings(false)}
        onInvite={async () => {
          if (!currentWorkspace) return;
          try {
            const code = await getInviteCode(currentWorkspace.workspace_id);
            setCurrentInviteCodeFromSettings(code);
            setShowHouseholdDetailsFromSettings(false);
            setShowInviteCodeFromSettings(true);
          } catch { /* ignore */ }
        }}
        onDelete={() => {
          setShowHouseholdDetailsFromSettings(false);
          setShowDeleteHouseholdFromSettings(true);
        }}
        onLeave={async () => {
          if (!currentWorkspace) return;
          try { await leaveWorkspace(currentWorkspace.workspace_id); } catch { /* ignore */ }
          setShowHouseholdDetailsFromSettings(false);
        }}
      />
      <InviteCodeModal
        visible={showInviteCodeFromSettings}
        font={font}
        inviteCode={currentInviteCodeFromSettings}
        onClose={() => setShowInviteCodeFromSettings(false)}
      />
      <DeleteHouseholdModal
        visible={showDeleteHouseholdFromSettings}
        font={font}
        householdName={currentWorkspace?.name ?? ''}
        loading={deleteHouseholdFromSettingsLoading}
        onClose={() => setShowDeleteHouseholdFromSettings(false)}
        onConfirm={async () => {
          if (!currentWorkspace) return;
          setDeleteHouseholdFromSettingsLoading(true);
          try {
            await deleteWorkspace(currentWorkspace.workspace_id);
            setShowDeleteHouseholdFromSettings(false);
          } catch { /* ignore */ }
          setDeleteHouseholdFromSettingsLoading(false);
        }}
      />
    </View>
  );
}
