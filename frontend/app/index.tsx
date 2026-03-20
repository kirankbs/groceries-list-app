import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SectionList,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView,
  StatusBar, Image, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

import { PALETTE, EXPO_PUBLIC_BACKEND_URL } from '../components/constants';
import { Theme, FontMap, Category, GroceryItem } from '../components/types';

import AddItemModal from '../components/modals/AddItemModal';
import EditItemModal from '../components/modals/EditItemModal';
import DeleteItemModal from '../components/modals/DeleteItemModal';
import HouseholdSwitcherModal from '../components/modals/HouseholdSwitcherModal';
import CreateHouseholdModal from '../components/modals/CreateHouseholdModal';
import JoinHouseholdModal from '../components/modals/JoinHouseholdModal';
import HouseholdDetailsModal from '../components/modals/HouseholdDetailsModal';
import DeleteHouseholdModal from '../components/modals/DeleteHouseholdModal';
import ListsModal from '../components/modals/ListsModal';
import CreateListModal from '../components/modals/CreateListModal';
import ProfileModal from '../components/modals/ProfileModal';
import InviteCodeModal from '../components/modals/InviteCodeModal';
import CategoryModal from '../components/modals/CategoryModal';
import ReceiptScanModal from '../components/modals/ReceiptScanModal';

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
    user, workspaces, currentWorkspace, currentList, lists, templates,
    isLoading: authLoading, isAuthenticated, login, register, logout, sessionToken,
    authError, clearAuthError,
    setCurrentWorkspace, deleteWorkspace, getInviteCode, leaveWorkspace,
    setCurrentList, fetchLists, fetchTemplates, updateList, saveAsTemplate,
  } = useAuth();

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top;
  const topPadding = Math.max(statusBarHeight, insets.top);

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [showProfile, setShowProfile] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showReceiptScan, setShowReceiptScan] = useState(false);

  const font: FontMap = useMemo(() => ({
    display: fontsLoaded ? 'PlusJakartaSans_700Bold' : undefined,
    displayMedium: fontsLoaded ? 'PlusJakartaSans_600SemiBold' : undefined,
    displayRegular: fontsLoaded ? 'PlusJakartaSans_400Regular' : undefined,
    body: fontsLoaded ? 'Inter_400Regular' : undefined,
    bodyMedium: fontsLoaded ? 'Inter_500Medium' : undefined,
    bodySemiBold: fontsLoaded ? 'Inter_600SemiBold' : undefined,
    bodyBold: fontsLoaded ? 'Inter_700Bold' : undefined,
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
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [sessionToken, currentList]);

  useEffect(() => { if (currentWorkspace) fetchCategories(); }, [currentWorkspace, fetchCategories]);
  useEffect(() => { if (currentList) fetchItems(); }, [currentList, fetchItems]);

  const toggleItem = async (item: GroceryItem) => {
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ checked: !item.checked })
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
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

  const handleCompleteList = async () => {
    if (!currentList) return;
    try { setCurrentList(await updateList(currentList.list_id, { status: 'completed' })); } catch (e) { console.error(e); }
  };

  const handleReopenList = async () => {
    if (!currentList) return;
    try { setCurrentList(await updateList(currentList.list_id, { status: 'active' })); } catch (e) { console.error(e); }
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
      title: c.name, data: groups[c.name], categoryInfo: c
    }));
  }, [items, searchQuery, categories]);

  const uncheckedCount = useMemo(() => items.filter(i => !i.checked).length, [items]);
  const activeLists = useMemo(() => lists.filter(l => l.status !== 'completed'), [lists]);
  const completedLists = useMemo(() => lists.filter(l => l.status === 'completed'), [lists]);

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
              Your household's shared{' '}
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
            "The kitchen is the heart of every home; let's keep it organized."
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={[st.safeArea, { backgroundColor: theme.background, paddingTop: topPadding }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[st.header, { borderBottomColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={st.workspaceSelector} onPress={() => setShowHouseholdSwitcher(true)}>
              <View style={[st.wsIconCircle, { backgroundColor: currentWorkspace?.type === 'personal' ? PALETTE.sage + '20' : PALETTE.terracotta + '20' }]}>
                <Ionicons name={currentWorkspace?.type === 'personal' ? 'person' : 'people'} size={14} color={currentWorkspace?.type === 'personal' ? PALETTE.sage : PALETTE.terracotta} />
              </View>
              <Text style={[st.workspaceName, { color: theme.text, fontFamily: font.displayMedium }]} numberOfLines={1}>{currentWorkspace?.name || 'Select Household'}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={st.listSelector} onPress={() => currentWorkspace && setShowLists(true)} disabled={!currentWorkspace}>
              <Text style={[st.listName, { color: theme.textSecondary, fontFamily: font.body }]} numberOfLines={1}>{currentList?.name || 'No list selected'} · {uncheckedCount} left</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={st.headerActions}>
            <TouchableOpacity style={[st.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowCategories(true)}>
              <Ionicons name="pricetags-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[st.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setDarkMode(!darkMode)}>
              <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[st.profileButton, { backgroundColor: theme.accent + '15' }]} onPress={() => setShowProfile(true)}>
              {user?.picture ? <Image source={{ uri: user.picture }} style={st.profileImage} /> : <Ionicons name="person" size={18} color={theme.accent} />}
            </TouchableOpacity>
          </View>
        </View>

        {currentList && (
          <View style={[st.listStatusBar, { backgroundColor: currentList.status === 'completed' ? PALETTE.sage + '18' : currentList.status === 'in_progress' ? PALETTE.amber + '18' : PALETTE.terracotta + '08', borderColor: currentList.status === 'completed' ? PALETTE.sage + '30' : currentList.status === 'in_progress' ? PALETTE.amber + '30' : 'transparent' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[st.statusDot, { backgroundColor: currentList.status === 'completed' ? PALETTE.sage : currentList.status === 'in_progress' ? PALETTE.amber : PALETTE.terracotta }]} />
              <Text style={[st.listStatusText, { color: currentList.status === 'completed' ? PALETTE.forest : currentList.status === 'in_progress' ? PALETTE.chestnut : PALETTE.terracotta, fontFamily: font.bodySemiBold }]}>
                {currentList.status === 'completed' ? 'Completed' : currentList.status === 'in_progress' ? 'In Progress' : 'Active'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(currentList.status === 'in_progress' || currentList.status === 'completed') && (
                <TouchableOpacity onPress={() => setShowReceiptScan(true)} style={[st.statusAction, { backgroundColor: PALETTE.terracotta + '18' }]}>
                  <Ionicons name="receipt-outline" size={14} color={PALETTE.terracotta} />
                  <Text style={[st.statusActionText, { color: PALETTE.terracotta, fontFamily: font.bodySemiBold }]}>Scan Receipt</Text>
                </TouchableOpacity>
              )}
              {currentList.status === 'completed' ? (
                <TouchableOpacity onPress={handleReopenList} style={[st.statusAction, { backgroundColor: PALETTE.sage + '20' }]}>
                  <Text style={[st.statusActionText, { color: PALETTE.forest, fontFamily: font.bodySemiBold }]}>Reopen</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleCompleteList} style={[st.statusAction, { backgroundColor: PALETTE.sage + '20' }]}>
                  <Text style={[st.statusActionText, { color: PALETTE.forest, fontFamily: font.bodySemiBold }]}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={[st.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput style={[st.searchInput, { color: theme.text, fontFamily: font.body }]} placeholder="Search your list..." placeholderTextColor={PALETTE.sand} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={theme.textSecondary} /></TouchableOpacity> : null}
        </View>

        {currentList ? (
          <SectionList
            sections={groupedItems}
            keyExtractor={item => item.id}
            renderSectionHeader={({ section }) => (
              <View style={[st.sectionHeader, { backgroundColor: theme.background }]}>
                <View style={[st.sectionIcon, { backgroundColor: section.categoryInfo.color + '18' }]}>
                  <Ionicons name={section.categoryInfo.icon as any} size={16} color={section.categoryInfo.color} />
                </View>
                <Text style={[st.sectionTitle, { color: section.categoryInfo.color, fontFamily: font.displayMedium }]}>{section.title}</Text>
                <View style={[st.sectionBadge, { backgroundColor: section.categoryInfo.color + '15' }]}>
                  <Text style={[st.sectionBadgeText, { color: section.categoryInfo.color, fontFamily: font.bodySemiBold }]}>{section.data.length}</Text>
                </View>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={[st.itemContainer, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.cardShadow }]}>
                <TouchableOpacity style={[st.checkbox, item.checked && { backgroundColor: PALETTE.sage, borderColor: PALETTE.sage }]} onPress={() => toggleItem(item)}>
                  {item.checked && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
                <TouchableOpacity style={st.itemContent} onPress={() => { setEditingItem(item); setShowEditItem(true); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.itemText, { color: theme.text, fontFamily: font.bodyMedium }, item.checked && st.itemTextChecked]}>{item.name}</Text>
                    {item.price != null && <Text style={[{ fontSize: 12, color: PALETTE.sage, fontFamily: font.body, marginTop: 1 }]}>{currentWorkspace?.currency === 'USD' ? '$' : currentWorkspace?.currency === 'GBP' ? '£' : currentWorkspace?.currency === 'INR' ? '₹' : '€'}{item.price.toFixed(2)}</Text>}
                  </View>
                  {item.quantity > 1 && <View style={[st.quantityBadge, { backgroundColor: PALETTE.terracotta }]}><Text style={[st.quantityText, { fontFamily: font.bodySemiBold }]}>x{item.quantity}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={st.deleteButton} onPress={() => { setItemToDelete(item); setShowDeleteItem(true); }}>
                  <Ionicons name="trash-outline" size={20} color={PALETTE.dustyRose} />
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            contentContainerStyle={st.listContent}
            ListEmptyComponent={
              <View style={st.emptyContainer}>
                <Ionicons name="basket-outline" size={56} color={PALETTE.sand} />
                <Text style={[st.emptyTitle, { color: theme.text, fontFamily: font.displayMedium }]}>{searchQuery ? 'Nothing found' : 'Your list is empty'}</Text>
                <Text style={[st.emptySubtitle, { color: theme.textSecondary, fontFamily: font.body }]}>{searchQuery ? 'Try a different search' : 'Tap + to start adding items'}</Text>
              </View>
            }
          />
        ) : (
          <View style={st.emptyContainer}>
            <Ionicons name="list-outline" size={56} color={PALETTE.sand} />
            <Text style={[st.emptyTitle, { color: theme.text, fontFamily: font.displayMedium }]}>No list selected</Text>
            <Text style={[st.emptySubtitle, { color: theme.textSecondary, fontFamily: font.body }]}>Pick a list or create a new one</Text>
            <TouchableOpacity style={st.emptyButton} onPress={() => setShowCreateList(true)}>
              <Text style={[st.emptyButtonText, { fontFamily: font.bodySemiBold }]}>Create List</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentList && (
          <TouchableOpacity style={[st.fab, { bottom: Math.max(insets.bottom, 16) + 8 }]} onPress={() => setShowAddItem(true)}>
            <Ionicons name="add" size={30} color={PALETTE.cream} />
          </TouchableOpacity>
        )}

        <AddItemModal visible={showAddItem} theme={theme} font={font} categories={categories} sessionToken={sessionToken} currentList={currentList} onClose={() => setShowAddItem(false)} onItemAdded={item => { setItems(prev => [item, ...prev]); fetchLists(); }} />
        <EditItemModal visible={showEditItem} theme={theme} font={font} categories={categories} sessionToken={sessionToken} item={editingItem} onClose={() => { setShowEditItem(false); setEditingItem(null); }} onItemUpdated={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))} onDeleteRequest={item => { setShowEditItem(false); setItemToDelete(item); setShowDeleteItem(true); }} />
        <DeleteItemModal visible={showDeleteItem} theme={theme} font={font} sessionToken={sessionToken} item={itemToDelete} onClose={() => { setShowDeleteItem(false); setItemToDelete(null); }} onDeleted={() => { if (itemToDelete) setItems(prev => prev.filter(i => i.id !== itemToDelete.id)); fetchLists(); }} />
        <HouseholdSwitcherModal visible={showHouseholdSwitcher} theme={theme} font={font} workspaces={workspaces} currentWorkspace={currentWorkspace} onClose={() => setShowHouseholdSwitcher(false)} onSelect={ws => { setCurrentWorkspace(ws); setShowHouseholdSwitcher(false); }} onCreateNew={() => { setShowHouseholdSwitcher(false); setShowCreateHousehold(true); }} onJoin={() => { setShowHouseholdSwitcher(false); setShowJoinHousehold(true); }} onInvite={ws => handleShowInviteCode(ws)} onSettings={ws => { setSelectedHousehold(ws); setShowHouseholdSwitcher(false); setShowHouseholdDetails(true); }} />
        <CreateHouseholdModal visible={showCreateHousehold} theme={theme} font={font} onClose={() => setShowCreateHousehold(false)} onCreated={ws => { setCurrentWorkspace(ws); setShowCreateHousehold(false); }} />
        <JoinHouseholdModal visible={showJoinHousehold} theme={theme} font={font} onClose={() => setShowJoinHousehold(false)} onJoined={ws => { setCurrentWorkspace(ws); setShowJoinHousehold(false); }} />
        <HouseholdDetailsModal visible={showHouseholdDetails} theme={theme} font={font} household={selectedHousehold} userId={user?.user_id || ''} onClose={() => setShowHouseholdDetails(false)} onInvite={() => { setShowHouseholdDetails(false); handleShowInviteCode(selectedHousehold); }} onDelete={() => setShowDeleteHousehold(true)} onLeave={() => { if (selectedHousehold) leaveWorkspace(selectedHousehold.workspace_id); setShowHouseholdDetails(false); }} />
        <DeleteHouseholdModal visible={showDeleteHousehold} theme={theme} font={font} householdName={selectedHousehold?.name || ''} loading={deleteHouseholdLoading} onClose={() => setShowDeleteHousehold(false)} onConfirm={handleDeleteHousehold} />
        <ListsModal visible={showLists} theme={theme} font={font} currentWorkspace={currentWorkspace} currentList={currentList} activeLists={activeLists} completedLists={completedLists} templates={templates} onClose={() => setShowLists(false)} onSelectList={list => { setCurrentList(list); setShowLists(false); }} onCreateNew={() => { setShowLists(false); setShowCreateList(true); }} />
        <CreateListModal visible={showCreateList} theme={theme} font={font} templates={templates} lists={lists} onClose={() => setShowCreateList(false)} onCreated={list => { setCurrentList(list); setShowCreateList(false); }} />
        <ProfileModal visible={showProfile} theme={theme} font={font} user={user} currentWorkspace={currentWorkspace} onClose={() => setShowProfile(false)} onInvite={() => { setShowProfile(false); handleShowInviteCode(); }} onLeave={() => { if (currentWorkspace) leaveWorkspace(currentWorkspace.workspace_id); }} onLogout={logout} />
        <InviteCodeModal visible={showInviteCode} theme={theme} font={font} inviteCode={currentInviteCode} onClose={() => setShowInviteCode(false)} />
        <CategoryModal visible={showCategories} theme={theme} font={font} categories={categories} sessionToken={sessionToken} currentWorkspace={currentWorkspace} onClose={() => setShowCategories(false)} onCategoriesChanged={() => { fetchCategories(); fetchItems(); }} />
        {currentList && <ReceiptScanModal visible={showReceiptScan} theme={theme} font={font} listId={currentList.list_id} onClose={() => setShowReceiptScan(false)} onPricesSaved={() => { fetchItems(); fetchLists(); }} />}
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1 },
  wsIconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  workspaceSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  workspaceName: { fontSize: 18, maxWidth: 200 },
  listSelector: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  listName: { fontSize: 13 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  profileButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 38, height: 38, borderRadius: 19 },
  listStatusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginBottom: 6, borderWidth: 1 },
  listStatusText: { fontSize: 13 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusActionText: { fontSize: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, flex: 1 },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sectionBadgeText: { fontSize: 12 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: PALETTE.sage, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemText: { fontSize: 15 },
  itemTextChecked: { textDecorationLine: 'line-through', opacity: 0.4 },
  quantityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  quantityText: { color: '#fff', fontSize: 11 },
  deleteButton: { padding: 6 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4 },
  emptyButton: { marginTop: 20, backgroundColor: PALETTE.terracotta, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: PALETTE.cream, fontSize: 15 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: PALETTE.terracotta, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: PALETTE.terracotta, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
});
