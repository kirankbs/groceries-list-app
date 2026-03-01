import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Theme, Category, GroceryItem, Workspace } from '../components/types';
import { EXPO_PUBLIC_BACKEND_URL } from '../components/constants';

// Modal components
import { AddItemModal } from '../components/modals/AddItemModal';
import { EditItemModal } from '../components/modals/EditItemModal';
import { DeleteItemModal } from '../components/modals/DeleteItemModal';
import { CategoryModal } from '../components/modals/CategoryModal';
import { HouseholdSwitcherModal } from '../components/modals/HouseholdSwitcherModal';
import { CreateHouseholdModal } from '../components/modals/CreateHouseholdModal';
import { JoinHouseholdModal } from '../components/modals/JoinHouseholdModal';
import { HouseholdDetailsModal } from '../components/modals/HouseholdDetailsModal';
import { DeleteHouseholdModal } from '../components/modals/DeleteHouseholdModal';
import { ListsModal } from '../components/modals/ListsModal';
import { CreateListModal } from '../components/modals/CreateListModal';
import { ProfileModal } from '../components/modals/ProfileModal';
import { InviteCodeModal } from '../components/modals/InviteCodeModal';
import { CategoryModal } from '../components/modals/CategoryModal';
import { ReceiptScanModal } from '../components/modals/ReceiptScanModal';

export default function GroceryTodo() {
  const {
    user, currentWorkspace, currentList, isLoading: authLoading, isAuthenticated,
    login, sessionToken, setCurrentWorkspace, getInviteCode, setCurrentList,
    fetchLists, updateList, saveAsTemplate,
  } = useAuth();

  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top;
  const topPadding = Math.max(statusBarHeight, insets.top);

  // Core data state
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Item deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Item editing trigger
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);

  // Modal visibility flags
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showJoinWorkspaceModal, setShowJoinWorkspaceModal] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState('');
  const [showHouseholdDetailsModal, setShowHouseholdDetailsModal] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<Workspace | null>(null);
  const [showDeleteHouseholdModal, setShowDeleteHouseholdModal] = useState(false);
  const [showListsModal, setShowListsModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReceiptScanModal, setShowReceiptScanModal] = useState(false);

  const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', CHF: 'Fr.', AUD: 'A$', CAD: 'C$',
  };
  const currencySymbol = CURRENCY_SYMBOLS[currentWorkspace?.currency || 'EUR'] || '€';

  const theme: Theme = useMemo(() => ({
    background: darkMode ? '#121212' : '#f8f9fa',
    surface: darkMode ? '#1e1e1e' : '#fff',
    text: darkMode ? '#ffffff' : '#2d3436',
    textSecondary: darkMode ? '#b0b0b0' : '#636e72',
    inputBg: darkMode ? '#2a2a2a' : '#f5f6fa',
  }), [darkMode]);

  const getCategoryInfo = useCallback((name: string) => {
    return categories.find(c => c.name === name) || { name, color: '#9E9E9E', icon: 'ellipsis-horizontal-outline' };
  }, [categories]);

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

  useEffect(() => {
    if (currentWorkspace) fetchCategories();
  }, [currentWorkspace, fetchCategories]);

  useEffect(() => {
    if (currentList) fetchItems();
  }, [currentList, fetchItems]);

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

  const executeDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
        setShowDeleteModal(false);
        setItemToDelete(null);
        fetchLists();
      }
    } catch (e) { console.error(e); }
    setDeleting(false);
  };

  const handleCompleteList = async () => {
    if (!currentList) return;
    try {
      const updated = await updateList(currentList.list_id, { status: 'completed' });
      setCurrentList(updated as any);
    } catch (e) { console.error(e); }
  };

  const handleReopenList = async () => {
    if (!currentList) return;
    try {
      const updated = await updateList(currentList.list_id, { status: 'active' });
      setCurrentList(updated as any);
    } catch (e) { console.error(e); }
  };

  const handleShowInviteCode = async (ws?: Workspace) => {
    const target = ws || currentWorkspace;
    if (!target) return;
    try {
      const code = await getInviteCode(target.workspace_id);
      setCurrentInviteCode(code);
      setShowInviteCodeModal(true);
    } catch (e) { console.error(e); }
  };

  const groupedItems = useMemo(() => {
    const filtered = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const groups: { [key: string]: GroceryItem[] } = {};
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

  // Loading state
  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loginContainer}>
          <View style={styles.loginHeader}>
            <View style={styles.loginIconContainer}>
              <Ionicons name="cart" size={64} color="#4CAF50" />
            </View>
            <Text style={[styles.loginTitle, { color: theme.text }]}>Grocery Todo</Text>
            <Text style={[styles.loginSubtitle, { color: theme.textSecondary }]}>
              Manage shopping lists with your family
            </Text>
          </View>
          <View style={styles.loginFeatures}>
            {['Multiple households', 'Share with family', 'Shopping sessions', 'Templates'].map(f => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={[styles.featureText, { color: theme.text }]}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.googleButton} onPress={login} testID="google-login-btn">
            <Ionicons name="logo-google" size={24} color="#fff" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main app
  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background, paddingTop: topPadding }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.workspaceSelector}
              onPress={() => setShowWorkspaceSwitcher(true)}
              testID="household-selector-btn"
            >
              <Ionicons name={currentWorkspace?.type === 'personal' ? 'person' : 'people'} size={18} color="#4CAF50" />
              <Text style={[styles.workspaceName, { color: theme.text }]} numberOfLines={1}>
                {currentWorkspace?.name || 'Select Household'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.listSelector}
              onPress={() => currentWorkspace && setShowListsModal(true)}
              disabled={!currentWorkspace}
              testID="list-selector-btn"
            >
              <Text style={[styles.listName, { color: theme.textSecondary }]} numberOfLines={1}>
                {currentList?.name || 'No list selected'} • {uncheckedCount} items
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
              onPress={() => setShowCategoryModal(true)}
              testID="categories-btn"
            >
              <Ionicons name="pricetags-outline" size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
              onPress={() => setDarkMode(!darkMode)}
              testID="theme-toggle-btn"
            >
              <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfileModal(true)} testID="profile-btn">
              {user?.picture
                ? <Image source={{ uri: user.picture }} style={styles.profileImage} />
                : <Ionicons name="person-circle" size={32} color={theme.text} />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* List status bar */}
        {currentList && (
          <View style={[styles.listStatusBar, {
            backgroundColor: currentList.status === 'completed' ? '#4CAF50'
              : currentList.status === 'in_progress' ? '#FF9800' : '#2196F3'
          }]}>
            <Text style={styles.listStatusText}>
              {currentList.status === 'completed' ? 'Completed'
                : currentList.status === 'in_progress' ? 'In Progress' : 'Active'}
            </Text>
            <View style={styles.statusBarActions}>
              {(currentList.status === 'in_progress' || currentList.status === 'completed') && (
                <TouchableOpacity
                  onPress={() => setShowReceiptScanModal(true)}
                  style={[styles.completeButton, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                  testID="scan-receipt-btn"
                >
                  <Ionicons name="camera-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.completeButtonText}>Scan Receipt</Text>
                </TouchableOpacity>
              )}
              {currentList.status === 'completed' ? (
                <TouchableOpacity onPress={handleReopenList} style={styles.completeButton} testID="reopen-list-btn">
                  <Text style={styles.completeButtonText}>Reopen</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleCompleteList} style={styles.completeButton} testID="complete-list-btn">
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search items..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="clear-search-btn">
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Items list */}
        {currentList ? (
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <SectionList
              sections={groupedItems}
              keyExtractor={item => item.id}
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                  <View style={[styles.sectionIcon, { backgroundColor: section.categoryInfo.color + '20' }]}>
                    <Ionicons name={section.categoryInfo.icon as any} size={18} color={section.categoryInfo.color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: section.categoryInfo.color }]}>{section.title}</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: section.categoryInfo.color + '20' }]}>
                    <Text style={[styles.sectionBadgeText, { color: section.categoryInfo.color }]}>{section.data.length}</Text>
                  </View>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={[styles.itemContainer, { backgroundColor: theme.surface }]} testID={`item-${item.id}`}>
                  <TouchableOpacity
                    style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                    onPress={() => toggleItem(item)}
                    testID={`checkbox-${item.id}`}
                  >
                    {item.checked && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.itemContent}
                    onPress={() => { setEditingItem(item); setShowEditItemModal(true); }}
                    testID={`edit-item-${item.id}`}
                  >
                    <Text style={[styles.itemText, { color: theme.text }, item.checked && styles.itemTextChecked]}>
                      {item.name}
                    </Text>
                    {item.quantity > 1 && (
                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityText}>x{item.quantity}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {item.price != null && (
                    <Text style={[styles.itemPrice, { color: theme.textSecondary }]} testID={`price-${item.id}`}>
                      {currencySymbol}{item.price.toFixed(2)}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => { setItemToDelete(item); setShowDeleteModal(true); }}
                    testID={`trash-item-${item.id}`}
                  >
                    <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              contentContainerStyle={styles.listContent}
              ListFooterComponent={() => {
                const pricedItems = items.filter(i => i.price != null);
                if (pricedItems.length === 0) return null;
                const total = pricedItems.reduce((sum, i) => sum + (i.price || 0), 0);
                return (
                  <View style={[styles.totalSpentFooter, { backgroundColor: theme.surface }]} testID="total-spent-footer">
                    <Text style={[styles.totalSpentLabel, { color: theme.textSecondary }]}>Total spent</Text>
                    <Text style={[styles.totalSpentValue, { color: '#4CAF50' }]} testID="total-spent-value">
                      {currencySymbol}{total.toFixed(2)}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="cart-outline" size={64} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {searchQuery ? 'No items found' : 'List is empty'}
                  </Text>
                </View>
              }
            />
          )
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Select or create a list</Text>
            <TouchableOpacity style={styles.createListBtn} onPress={() => setShowCreateListModal(true)} testID="create-list-empty-btn">
              <Text style={styles.createListBtnText}>Create List</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FAB */}
        {currentList && (
          <TouchableOpacity
            style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 8 }]}
            onPress={() => setShowAddItemModal(true)}
            testID="fab-add-item"
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        {/* =============== MODALS =============== */}

        <AddItemModal
          visible={showAddItemModal}
          theme={theme}
          categories={categories}
          onItemAdded={item => setItems(prev => [item, ...prev])}
          onListUpdated={fetchLists}
          onClose={() => setShowAddItemModal(false)}
        />

        <EditItemModal
          visible={showEditItemModal}
          theme={theme}
          categories={categories}
          item={editingItem}
          onItemUpdated={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
          onRequestDelete={item => { setItemToDelete(item); setShowDeleteModal(true); }}
          onClose={() => setShowEditItemModal(false)}
        />

        <DeleteItemModal
          visible={showDeleteModal}
          theme={theme}
          item={itemToDelete}
          deleting={deleting}
          onClose={() => { setShowDeleteModal(false); setItemToDelete(null); }}
          onConfirm={executeDelete}
        />

        <HouseholdSwitcherModal
          visible={showWorkspaceSwitcher}
          theme={theme}
          onClose={() => setShowWorkspaceSwitcher(false)}
          onCreateClick={() => setShowCreateWorkspaceModal(true)}
          onJoinClick={() => setShowJoinWorkspaceModal(true)}
          onShowInvite={ws => { setShowWorkspaceSwitcher(false); handleShowInviteCode(ws); }}
          onShowSettings={ws => { setSelectedHousehold(ws); setShowHouseholdDetailsModal(true); }}
        />

        <CreateHouseholdModal
          visible={showCreateWorkspaceModal}
          theme={theme}
          onClose={() => setShowCreateWorkspaceModal(false)}
          onCreated={ws => setCurrentWorkspace(ws as any)}
        />

        <JoinHouseholdModal
          visible={showJoinWorkspaceModal}
          theme={theme}
          onClose={() => setShowJoinWorkspaceModal(false)}
          onJoined={ws => setCurrentWorkspace(ws as any)}
        />

        <HouseholdDetailsModal
          visible={showHouseholdDetailsModal}
          theme={theme}
          selectedHousehold={selectedHousehold}
          onClose={() => setShowHouseholdDetailsModal(false)}
          onInvite={ws => { setShowHouseholdDetailsModal(false); handleShowInviteCode(ws); }}
          onDeleteRequest={() => setShowDeleteHouseholdModal(true)}
        />

        <DeleteHouseholdModal
          visible={showDeleteHouseholdModal}
          theme={theme}
          household={selectedHousehold}
          onClose={() => setShowDeleteHouseholdModal(false)}
          onDeleted={() => { setShowDeleteHouseholdModal(false); setShowHouseholdDetailsModal(false); setSelectedHousehold(null); }}
        />

        <ListsModal
          visible={showListsModal}
          theme={theme}
          onClose={() => setShowListsModal(false)}
          onCreateClick={() => setShowCreateListModal(true)}
        />

        <CreateListModal
          visible={showCreateListModal}
          theme={theme}
          onClose={() => setShowCreateListModal(false)}
          onListCreated={list => setCurrentList(list as any)}
        />

        <ProfileModal
          visible={showProfileModal}
          theme={theme}
          onClose={() => setShowProfileModal(false)}
          onInvite={() => { setShowProfileModal(false); handleShowInviteCode(); }}
        />

        <InviteCodeModal
          visible={showInviteCodeModal}
          theme={theme}
          code={currentInviteCode}
          onClose={() => setShowInviteCodeModal(false)}
        />

        <CategoryModal
          visible={showCategoryModal}
          theme={theme}
          categories={categories}
          onCategoriesChanged={fetchCategories}
          onItemsChanged={fetchItems}
          onClose={() => setShowCategoryModal(false)}
        />

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  loginHeader: { alignItems: 'center', marginBottom: 40 },
  loginIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#4CAF5020', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  loginTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  loginSubtitle: { fontSize: 16, textAlign: 'center' },
  loginFeatures: { marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  featureText: { fontSize: 16 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', paddingVertical: 16, borderRadius: 14, gap: 12 },
  googleButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  workspaceSelector: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  workspaceName: { fontSize: 18, fontWeight: 'bold', maxWidth: 200 },
  listSelector: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listName: { fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  profileButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 40, height: 40, borderRadius: 20 },
  listStatusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8 },
  listStatusText: { color: '#fff', fontWeight: '600' },
  completeButton: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  completeButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  sectionIcon: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { fontSize: 13, fontWeight: '600' },
  itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#4CAF50' },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemTextChecked: { textDecorationLine: 'line-through', opacity: 0.5 },
  quantityBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  quantityText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteButton: { padding: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  createListBtn: { marginTop: 16, backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createListBtnText: { color: '#fff', fontWeight: '600' },
  fab: { position: 'absolute', right: 16, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
