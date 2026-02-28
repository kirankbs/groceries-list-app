import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SectionList,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const AVAILABLE_ICONS = [
  'pricetag-outline', 'cart-outline', 'basket-outline', 'bag-outline',
  'leaf-outline', 'water-outline', 'restaurant-outline', 'pizza-outline',
  'cafe-outline', 'ice-cream-outline', 'snow-outline', 'cube-outline',
  'home-outline', 'ellipsis-horizontal-outline', 'nutrition-outline',
  'fish-outline', 'beer-outline', 'wine-outline', 'fast-food-outline',
];

const AVAILABLE_COLORS = [
  '#4CAF50', '#2196F3', '#F44336', '#FF9800', '#9C27B0',
  '#E91E63', '#00BCD4', '#795548', '#607D8B', '#9E9E9E',
];

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface GroceryItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  category: string;
  checked: boolean;
}

export default function GroceryTodo() {
  const {
    user, workspaces, currentWorkspace, currentList, lists, templates,
    isLoading: authLoading, isAuthenticated, login, logout, sessionToken,
    setCurrentWorkspace, createWorkspace, joinWorkspace, leaveWorkspace, deleteWorkspace,
    getInviteCode, fetchWorkspaces, setCurrentList, fetchLists, fetchTemplates,
    createList, updateList, deleteList, saveAsTemplate
  } = useAuth();

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Item modals
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemCategory, setNewItemCategory] = useState('Other');
  const [adding, setAdding] = useState(false);

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editCategory, setEditCategory] = useState('Other');
  const [updating, setUpdating] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Workspace modals
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showJoinWorkspaceModal, setShowJoinWorkspaceModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState('');
  const [showHouseholdDetailsModal, setShowHouseholdDetailsModal] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<typeof currentWorkspace>(null);
  const [showDeleteHouseholdModal, setShowDeleteHouseholdModal] = useState(false);

  // List modals
  const [showListsModal, setShowListsModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listCreateMode, setListCreateMode] = useState<'blank' | 'copy' | 'template'>('blank');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCopyListId, setSelectedCopyListId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryFormModal, setShowCategoryFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#4CAF50');
  const [categoryIcon, setCategoryIcon] = useState('pricetag-outline');
  const [savingCategory, setSavingCategory] = useState(false);

  const theme = useMemo(() => ({
    background: darkMode ? '#121212' : '#f8f9fa',
    surface: darkMode ? '#1e1e1e' : '#fff',
    text: darkMode ? '#ffffff' : '#2d3436',
    textSecondary: darkMode ? '#b0b0b0' : '#636e72',
    inputBg: darkMode ? '#2a2a2a' : '#f5f6fa',
  }), [darkMode]);

  const getCategoryInfo = useCallback((name: string) => {
    return categories.find(c => c.name === name) || { name, color: '#9E9E9E', icon: 'ellipsis-horizontal-outline' };
  }, [categories]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!sessionToken || !currentWorkspace) return;
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/categories`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error(e); }
  }, [sessionToken, currentWorkspace]);

  // Fetch items
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

  // CRUD operations
  const addItem = async () => {
    if (!newItemName.trim() || !currentList) return;
    setAdding(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ list_id: currentList.list_id, name: newItemName.trim(), quantity: parseInt(newItemQuantity) || 1, category: newItemCategory })
      });
      if (res.ok) {
        const item = await res.json();
        setItems(prev => [item, ...prev]);
        setNewItemName(''); setNewItemQuantity('1'); setNewItemCategory('Other');
        setShowAddItemModal(false);
        fetchLists();
      }
    } catch (e) { console.error(e); }
    setAdding(false);
  };

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

  const updateItem = async () => {
    if (!editingItem || !editName.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ name: editName.trim(), quantity: parseInt(editQuantity) || 1, category: editCategory })
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
        setShowEditItemModal(false);
      }
    } catch (e) { console.error(e); }
    setUpdating(false);
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
        setShowDeleteModal(false); setItemToDelete(null);
        fetchLists();
      }
    } catch (e) { console.error(e); }
    setDeleting(false);
  };

  // Workspace handlers
  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setWorkspaceLoading(true);
    try {
      const ws = await createWorkspace(workspaceName.trim());
      setCurrentWorkspace(ws);
      setShowCreateWorkspaceModal(false);
      setWorkspaceName('');
    } catch (e) { console.error(e); }
    setWorkspaceLoading(false);
  };

  const handleJoinWorkspace = async () => {
    if (!inviteCodeInput.trim()) return;
    setWorkspaceLoading(true);
    try {
      const ws = await joinWorkspace(inviteCodeInput.trim());
      setCurrentWorkspace(ws);
      setShowJoinWorkspaceModal(false);
      setInviteCodeInput('');
    } catch (e) { console.error(e); }
    setWorkspaceLoading(false);
  };

  const handleShowInviteCode = async () => {
    if (!currentWorkspace) return;
    try {
      const code = await getInviteCode(currentWorkspace.workspace_id);
      setCurrentInviteCode(code);
      setShowInviteCodeModal(true);
    } catch (e) { console.error(e); }
  };

  const handleShowHouseholdInvite = async (ws: typeof currentWorkspace) => {
    if (!ws) return;
    try {
      const code = await getInviteCode(ws.workspace_id);
      setCurrentInviteCode(code);
      setShowWorkspaceSwitcher(false);
      setShowInviteCodeModal(true);
    } catch (e) { console.error(e); }
  };

  const handleDeleteHousehold = async () => {
    if (!selectedHousehold) return;
    setWorkspaceLoading(true);
    try {
      await deleteWorkspace(selectedHousehold.workspace_id);
      setShowDeleteHouseholdModal(false);
      setShowHouseholdDetailsModal(false);
      setSelectedHousehold(null);
    } catch (e) { console.error(e); }
    setWorkspaceLoading(false);
  };

  // List handlers
  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setListLoading(true);
    try {
      const list = await createList(
        newListName.trim(),
        listCreateMode === 'copy' ? selectedCopyListId || undefined : undefined,
        listCreateMode === 'template' ? selectedTemplateId || undefined : undefined
      );
      setCurrentList(list);
      setShowCreateListModal(false);
      setNewListName(''); setListCreateMode('blank');
    } catch (e) { console.error(e); }
    setListLoading(false);
  };

  const handleCompleteList = async () => {
    if (!currentList) return;
    try {
      const updated = await updateList(currentList.list_id, { status: 'completed' });
      // Update currentList immediately for visual feedback
      setCurrentList(updated);
    } catch (e) { console.error(e); }
  };

  const handleReopenList = async () => {
    if (!currentList) return;
    try {
      const updated = await updateList(currentList.list_id, { status: 'active' });
      // Update currentList immediately for visual feedback
      setCurrentList(updated);
    } catch (e) { console.error(e); }
  };

  const handleSaveAsTemplate = async () => {
    if (!currentList) return;
    try {
      await saveAsTemplate(currentList.list_id);
    } catch (e) { console.error(e); }
  };

  // Grouped items
  const groupedItems = useMemo(() => {
    let filtered = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
  const activeLists = useMemo(() => lists.filter(l => l.status !== 'completed'), [lists]);
  const completedLists = useMemo(() => lists.filter(l => l.status === 'completed'), [lists]);

  // Loading
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
          <TouchableOpacity style={styles.googleButton} onPress={login}>
            <Ionicons name="logo-google" size={24} color="#fff" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main app
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {/* Household Selector */}
            <TouchableOpacity style={styles.workspaceSelector} onPress={() => setShowWorkspaceSwitcher(true)}>
              <Ionicons name={currentWorkspace?.type === 'personal' ? 'person' : 'people'} size={18} color="#4CAF50" />
              <Text style={[styles.workspaceName, { color: theme.text }]} numberOfLines={1}>
                {currentWorkspace?.name || 'Select Household'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            {/* List Selector */}
            <TouchableOpacity style={styles.listSelector} onPress={() => currentWorkspace && setShowListsModal(true)} disabled={!currentWorkspace}>
              <Text style={[styles.listName, { color: theme.textSecondary }]} numberOfLines={1}>
                {currentList?.name || 'No list selected'} • {uncheckedCount} items
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surface }]} onPress={() => setShowCategoryModal(true)}>
              <Ionicons name="pricetags-outline" size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surface }]} onPress={() => setDarkMode(!darkMode)}>
              <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfileModal(true)}>
              {user?.picture ? <Image source={{ uri: user.picture }} style={styles.profileImage} /> : <Ionicons name="person-circle" size={32} color={theme.text} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* List status bar */}
        {currentList && (
          <View style={[styles.listStatusBar, { backgroundColor: currentList.status === 'completed' ? '#4CAF50' : currentList.status === 'in_progress' ? '#FF9800' : '#2196F3' }]}>
            <Text style={styles.listStatusText}>
              {currentList.status === 'completed' ? 'Completed' : currentList.status === 'in_progress' ? 'In Progress' : 'Active'}
            </Text>
            {currentList.status === 'completed' ? (
              <TouchableOpacity onPress={handleReopenList} style={styles.completeButton}>
                <Text style={styles.completeButtonText}>Reopen List</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleCompleteList} style={styles.completeButton}>
                <Text style={styles.completeButtonText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Search items..." placeholderTextColor={theme.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={theme.textSecondary} /></TouchableOpacity> : null}
        </View>

        {/* Items list */}
        {currentList ? (
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
              <View style={[styles.itemContainer, { backgroundColor: theme.surface }]}>
                <TouchableOpacity style={[styles.checkbox, item.checked && styles.checkboxChecked]} onPress={() => toggleItem(item)}>
                  {item.checked && <Ionicons name="checkmark" size={18} color="#fff" />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.itemContent} onPress={() => { setEditingItem(item); setEditName(item.name); setEditQuantity(String(item.quantity)); setEditCategory(item.category); setShowEditItemModal(true); }}>
                  <Text style={[styles.itemText, { color: theme.text }, item.checked && styles.itemTextChecked]}>{item.name}</Text>
                  {item.quantity > 1 && <View style={styles.quantityBadge}><Text style={styles.quantityText}>x{item.quantity}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => { setItemToDelete(item); setShowDeleteModal(true); }}>
                  <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={64} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{searchQuery ? 'No items found' : 'List is empty'}</Text>
              </View>
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Select or create a list</Text>
            <TouchableOpacity style={styles.createListBtn} onPress={() => setShowCreateListModal(true)}>
              <Text style={styles.createListBtnText}>Create List</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FAB */}
        {currentList && (
          <TouchableOpacity style={styles.fab} onPress={() => setShowAddItemModal(true)}>
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        {/* =============== MODALS =============== */}

        {/* Household Switcher */}
        <Modal visible={showWorkspaceSwitcher} animationType="slide" transparent onRequestClose={() => setShowWorkspaceSwitcher(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Households</Text>
                <TouchableOpacity onPress={() => setShowWorkspaceSwitcher(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <FlatList
                data={workspaces}
                keyExtractor={w => w.workspace_id}
                renderItem={({ item: ws }) => (
                  <View style={[styles.workspaceItem, { backgroundColor: currentWorkspace?.workspace_id === ws.workspace_id ? '#4CAF5020' : 'transparent' }]}>
                    <TouchableOpacity style={styles.workspaceItemMain} onPress={() => { setCurrentWorkspace(ws); setShowWorkspaceSwitcher(false); }}>
                      <Ionicons name={ws.type === 'personal' ? 'person' : 'people'} size={24} color={ws.type === 'personal' ? '#2196F3' : '#4CAF50'} />
                      <View style={styles.workspaceItemInfo}>
                        <Text style={[styles.workspaceItemName, { color: theme.text }]}>{ws.name}</Text>
                        <Text style={[styles.workspaceItemMeta, { color: theme.textSecondary }]}>
                          {ws.type === 'personal' ? 'Personal' : `${ws.members?.length || 1} members`}
                        </Text>
                      </View>
                      {currentWorkspace?.workspace_id === ws.workspace_id && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                    </TouchableOpacity>
                    {ws.type === 'shared' && (
                      <View style={styles.workspaceItemActions}>
                        <TouchableOpacity style={styles.workspaceItemActionBtn} onPress={() => handleShowHouseholdInvite(ws)}>
                          <Ionicons name="share-outline" size={18} color="#4CAF50" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.workspaceItemActionBtn} onPress={() => { setSelectedHousehold(ws); setShowHouseholdDetailsModal(true); setShowWorkspaceSwitcher(false); }}>
                          <Ionicons name="settings-outline" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
              <View style={styles.workspaceActions}>
                <TouchableOpacity style={styles.workspaceActionBtn} onPress={() => { setShowWorkspaceSwitcher(false); setShowCreateWorkspaceModal(true); }}>
                  <Ionicons name="add-circle-outline" size={22} color="#4CAF50" />
                  <Text style={styles.workspaceActionText}>Create Household</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.workspaceActionBtn} onPress={() => { setShowWorkspaceSwitcher(false); setShowJoinWorkspaceModal(true); }}>
                  <Ionicons name="enter-outline" size={22} color="#2196F3" />
                  <Text style={[styles.workspaceActionText, { color: '#2196F3' }]}>Join Household</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Household Modal */}
        <Modal visible={showCreateWorkspaceModal} animationType="slide" transparent onRequestClose={() => setShowCreateWorkspaceModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Household</Text>
                <TouchableOpacity onPress={() => setShowCreateWorkspaceModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Household Name</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="e.g., My Family, Roommates..." placeholderTextColor={theme.textSecondary} value={workspaceName} onChangeText={setWorkspaceName} />
              <TouchableOpacity style={[styles.primaryButton, (!workspaceName.trim() || workspaceLoading) && styles.buttonDisabled]} onPress={handleCreateWorkspace} disabled={!workspaceName.trim() || workspaceLoading}>
                {workspaceLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Household</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Join Household Modal */}
        <Modal visible={showJoinWorkspaceModal} animationType="slide" transparent onRequestClose={() => setShowJoinWorkspaceModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Join Household</Text>
                <TouchableOpacity onPress={() => setShowJoinWorkspaceModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Invite Code</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Enter invite code" placeholderTextColor={theme.textSecondary} value={inviteCodeInput} onChangeText={setInviteCodeInput} autoCapitalize="none" />
              <TouchableOpacity style={[styles.primaryButton, (!inviteCodeInput.trim() || workspaceLoading) && styles.buttonDisabled]} onPress={handleJoinWorkspace} disabled={!inviteCodeInput.trim() || workspaceLoading}>
                {workspaceLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Join Household</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Household Details Modal */}
        <Modal visible={showHouseholdDetailsModal} animationType="slide" transparent onRequestClose={() => setShowHouseholdDetailsModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Household Settings</Text>
                <TouchableOpacity onPress={() => setShowHouseholdDetailsModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              {selectedHousehold && (
                <>
                  <View style={[styles.householdInfoCard, { backgroundColor: theme.inputBg }]}>
                    <Ionicons name="people" size={32} color="#4CAF50" />
                    <Text style={[styles.householdInfoName, { color: theme.text }]}>{selectedHousehold.name}</Text>
                    <Text style={[styles.householdInfoMeta, { color: theme.textSecondary }]}>{selectedHousehold.members?.length || 1} members</Text>
                  </View>
                  
                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>Members</Text>
                  {selectedHousehold.members?.map(m => (
                    <View key={m.user_id} style={styles.memberRow}>
                      {m.picture ? <Image source={{ uri: m.picture }} style={styles.memberAvatar} /> : <Ionicons name="person-circle" size={32} color={theme.textSecondary} />}
                      <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                      {m.user_id === selectedHousehold.owner_id && <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>Owner</Text></View>}
                    </View>
                  ))}

                  <View style={styles.householdActions}>
                    <TouchableOpacity style={[styles.householdActionBtn, { backgroundColor: '#4CAF5015' }]} onPress={() => { setShowHouseholdDetailsModal(false); handleShowHouseholdInvite(selectedHousehold); }}>
                      <Ionicons name="share-outline" size={20} color="#4CAF50" />
                      <Text style={[styles.householdActionBtnText, { color: '#4CAF50' }]}>Invite People</Text>
                    </TouchableOpacity>
                    {selectedHousehold.owner_id === user?.user_id ? (
                      <TouchableOpacity style={[styles.householdActionBtn, { backgroundColor: '#ff6b6b15' }]} onPress={() => setShowDeleteHouseholdModal(true)}>
                        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                        <Text style={[styles.householdActionBtnText, { color: '#ff6b6b' }]}>Delete Household</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.householdActionBtn, { backgroundColor: '#ff6b6b15' }]} onPress={() => { leaveWorkspace(selectedHousehold.workspace_id); setShowHouseholdDetailsModal(false); }}>
                        <Ionicons name="exit-outline" size={20} color="#ff6b6b" />
                        <Text style={[styles.householdActionBtnText, { color: '#ff6b6b' }]}>Leave Household</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Delete Household Confirmation Modal */}
        <Modal visible={showDeleteHouseholdModal} animationType="fade" transparent onRequestClose={() => setShowDeleteHouseholdModal(false)}>
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.deleteModalIcon}><Ionicons name="trash" size={40} color="#ff6b6b" /></View>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Delete Household?</Text>
              <Text style={[styles.deleteModalMsg, { color: theme.textSecondary }]}>This will permanently delete "{selectedHousehold?.name}" and all its shopping lists.</Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity style={[styles.deleteModalBtn, { backgroundColor: theme.inputBg }]} onPress={() => setShowDeleteHouseholdModal(false)}>
                  <Text style={[styles.deleteModalBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.deleteModalBtn, { backgroundColor: '#ff6b6b' }]} onPress={handleDeleteHousehold} disabled={workspaceLoading}>
                  {workspaceLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.deleteModalBtnText, { color: '#fff' }]}>Delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Lists Modal */}
        <Modal visible={showListsModal} animationType="slide" transparent onRequestClose={() => setShowListsModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Shopping Lists</Text>
                <TouchableOpacity onPress={() => setShowListsModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.createListButton} onPress={() => { setShowListsModal(false); setShowCreateListModal(true); }}>
                <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
                <Text style={styles.createListButtonText}>Create New List</Text>
              </TouchableOpacity>

              {activeLists.length > 0 && (
                <>
                  <Text style={[styles.listSectionTitle, { color: theme.text }]}>Active Lists</Text>
                  {activeLists.map(list => (
                    <TouchableOpacity key={list.list_id} style={[styles.listItem, { backgroundColor: currentList?.list_id === list.list_id ? '#4CAF5020' : 'transparent' }]} onPress={() => { setCurrentList(list); setShowListsModal(false); }}>
                      <View style={[styles.listStatusDot, { backgroundColor: list.status === 'in_progress' ? '#FF9800' : '#2196F3' }]} />
                      <View style={styles.listItemInfo}>
                        <Text style={[styles.listItemName, { color: theme.text }]}>{list.name}</Text>
                        <Text style={[styles.listItemMeta, { color: theme.textSecondary }]}>{list.checked_items || 0}/{list.total_items || 0} items</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {completedLists.length > 0 && (
                <>
                  <Text style={[styles.listSectionTitle, { color: theme.text, marginTop: 16 }]}>Completed</Text>
                  {completedLists.slice(0, 5).map(list => (
                    <TouchableOpacity key={list.list_id} style={[styles.listItem, { opacity: 0.7 }]} onPress={() => { setCurrentList(list); setShowListsModal(false); }}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <View style={styles.listItemInfo}>
                        <Text style={[styles.listItemName, { color: theme.text }]}>{list.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {templates.length > 0 && (
                <>
                  <Text style={[styles.listSectionTitle, { color: theme.text, marginTop: 16 }]}>Templates</Text>
                  {templates.map(tpl => (
                    <View key={tpl.list_id} style={styles.listItem}>
                      <Ionicons name="document-outline" size={20} color="#9C27B0" />
                      <View style={styles.listItemInfo}>
                        <Text style={[styles.listItemName, { color: theme.text }]}>{tpl.name}</Text>
                        <Text style={[styles.listItemMeta, { color: theme.textSecondary }]}>{tpl.item_count || 0} items</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Create List Modal */}
        <Modal visible={showCreateListModal} animationType="slide" transparent onRequestClose={() => setShowCreateListModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Shopping List</Text>
                <TouchableOpacity onPress={() => setShowCreateListModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>List Name</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="e.g., Weekly Groceries" placeholderTextColor={theme.textSecondary} value={newListName} onChangeText={setNewListName} />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Create From</Text>
              <View style={styles.createModeOptions}>
                {[{ mode: 'blank', label: 'Blank', icon: 'add-outline' }, { mode: 'template', label: 'Template', icon: 'document-outline' }, { mode: 'copy', label: 'Copy List', icon: 'copy-outline' }].map(opt => (
                  <TouchableOpacity key={opt.mode} style={[styles.createModeOption, listCreateMode === opt.mode && styles.createModeOptionActive]} onPress={() => setListCreateMode(opt.mode as any)}>
                    <Ionicons name={opt.icon as any} size={24} color={listCreateMode === opt.mode ? '#fff' : '#4CAF50'} />
                    <Text style={[styles.createModeText, listCreateMode === opt.mode && { color: '#fff' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {listCreateMode === 'template' && templates.length > 0 && (
                <ScrollView horizontal style={{ marginBottom: 16 }}>
                  {templates.map(tpl => (
                    <TouchableOpacity key={tpl.list_id} style={[styles.templateOption, selectedTemplateId === tpl.list_id && styles.templateOptionActive]} onPress={() => setSelectedTemplateId(tpl.list_id)}>
                      <Text style={styles.templateOptionText}>{tpl.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {listCreateMode === 'copy' && lists.length > 0 && (
                <ScrollView horizontal style={{ marginBottom: 16 }}>
                  {lists.map(lst => (
                    <TouchableOpacity key={lst.list_id} style={[styles.templateOption, selectedCopyListId === lst.list_id && styles.templateOptionActive]} onPress={() => setSelectedCopyListId(lst.list_id)}>
                      <Text style={styles.templateOptionText}>{lst.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity style={[styles.primaryButton, (!newListName.trim() || listLoading) && styles.buttonDisabled]} onPress={handleCreateList} disabled={!newListName.trim() || listLoading}>
                {listLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create List</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Add Item Modal */}
        <Modal visible={showAddItemModal} animationType="slide" transparent onRequestClose={() => setShowAddItemModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Item</Text>
                <TouchableOpacity onPress={() => setShowAddItemModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="e.g., Milk, Bread..." placeholderTextColor={theme.textSecondary} value={newItemName} onChangeText={setNewItemName} />
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]} onPress={() => setNewItemQuantity(String(Math.max(1, parseInt(newItemQuantity) - 1)))}><Ionicons name="remove" size={24} color={theme.text} /></TouchableOpacity>
                <TextInput style={[styles.qtyInput, { backgroundColor: theme.inputBg, color: theme.text }]} value={newItemQuantity} onChangeText={setNewItemQuantity} keyboardType="numeric" textAlign="center" />
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]} onPress={() => setNewItemQuantity(String(parseInt(newItemQuantity || '0') + 1))}><Ionicons name="add" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {categories.map(cat => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryChip, { borderColor: cat.color }, newItemCategory === cat.name && { backgroundColor: cat.color }]} onPress={() => setNewItemCategory(cat.name)}>
                    <Ionicons name={cat.icon as any} size={16} color={newItemCategory === cat.name ? '#fff' : cat.color} />
                    <Text style={[styles.categoryChipText, { color: newItemCategory === cat.name ? '#fff' : cat.color }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.primaryButton, (!newItemName.trim() || adding) && styles.buttonDisabled]} onPress={addItem} disabled={!newItemName.trim() || adding}>
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Add Item</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        <Modal visible={showEditItemModal} animationType="slide" transparent onRequestClose={() => setShowEditItemModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Item</Text>
                <TouchableOpacity onPress={() => setShowEditItemModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} value={editName} onChangeText={setEditName} />
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]} onPress={() => setEditQuantity(String(Math.max(1, parseInt(editQuantity) - 1)))}><Ionicons name="remove" size={24} color={theme.text} /></TouchableOpacity>
                <TextInput style={[styles.qtyInput, { backgroundColor: theme.inputBg, color: theme.text }]} value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric" textAlign="center" />
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]} onPress={() => setEditQuantity(String(parseInt(editQuantity || '0') + 1))}><Ionicons name="add" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {categories.map(cat => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryChip, { borderColor: cat.color }, editCategory === cat.name && { backgroundColor: cat.color }]} onPress={() => setEditCategory(cat.name)}>
                    <Ionicons name={cat.icon as any} size={16} color={editCategory === cat.name ? '#fff' : cat.color} />
                    <Text style={[styles.categoryChipText, { color: editCategory === cat.name ? '#fff' : cat.color }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.primaryButton, (!editName.trim() || updating) && styles.buttonDisabled]} onPress={updateItem} disabled={!editName.trim() || updating}>
                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteRow} onPress={() => { setShowEditItemModal(false); if (editingItem) { setItemToDelete(editingItem); setShowDeleteModal(true); } }}>
                <Ionicons name="trash-outline" size={20} color="#ff6b6b" /><Text style={styles.deleteRowText}>Delete Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Modal */}
        <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.deleteModalIcon}><Ionicons name="trash" size={40} color="#ff6b6b" /></View>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Delete Item?</Text>
              <Text style={[styles.deleteModalMsg, { color: theme.textSecondary }]}>"{itemToDelete?.name}"</Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity style={[styles.deleteModalBtn, { backgroundColor: theme.inputBg }]} onPress={() => setShowDeleteModal(false)}>
                  <Text style={[styles.deleteModalBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.deleteModalBtn, { backgroundColor: '#ff6b6b' }]} onPress={executeDelete} disabled={deleting}>
                  {deleting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.deleteModalBtnText, { color: '#fff' }]}>Delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Profile Modal */}
        <Modal visible={showProfileModal} animationType="slide" transparent onRequestClose={() => setShowProfileModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Profile</Text>
                <TouchableOpacity onPress={() => setShowProfileModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <View style={styles.profileInfo}>
                {user?.picture ? <Image source={{ uri: user.picture }} style={styles.profileLargeImage} /> : <Ionicons name="person-circle" size={80} color={theme.textSecondary} />}
                <Text style={[styles.profileName, { color: theme.text }]}>{user?.name}</Text>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
              </View>
              {currentWorkspace?.type === 'shared' && (
                <View style={[styles.workspaceCard, { backgroundColor: theme.inputBg }]}>
                  <View style={styles.workspaceCardHeader}>
                    <Ionicons name="people" size={24} color="#4CAF50" />
                    <Text style={[styles.workspaceCardTitle, { color: theme.text }]}>{currentWorkspace.name}</Text>
                  </View>
                  {currentWorkspace.members?.map(m => (
                    <View key={m.user_id} style={styles.memberRow}>
                      {m.picture ? <Image source={{ uri: m.picture }} style={styles.memberAvatar} /> : <Ionicons name="person-circle" size={32} color={theme.textSecondary} />}
                      <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                      {m.user_id === currentWorkspace.owner_id && <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>Owner</Text></View>}
                    </View>
                  ))}
                  <View style={styles.workspaceCardActions}>
                    <TouchableOpacity style={styles.workspaceCardBtn} onPress={handleShowInviteCode}>
                      <Ionicons name="share-outline" size={20} color="#4CAF50" /><Text style={styles.workspaceCardBtnText}>Invite</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.workspaceCardBtn, { borderColor: '#ff6b6b' }]} onPress={() => currentWorkspace && leaveWorkspace(currentWorkspace.workspace_id)}>
                      <Ionicons name="exit-outline" size={20} color="#ff6b6b" /><Text style={[styles.workspaceCardBtnText, { color: '#ff6b6b' }]}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color="#ff6b6b" /><Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Invite Code Modal */}
        <Modal visible={showInviteCodeModal} animationType="fade" transparent onRequestClose={() => setShowInviteCodeModal(false)}>
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.deleteModalIcon, { backgroundColor: '#4CAF5020' }]}><Ionicons name="share-social" size={40} color="#4CAF50" /></View>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Invite Code</Text>
              <Text style={[styles.inviteCodeDisplay, { color: theme.text, backgroundColor: theme.inputBg }]}>{currentInviteCode}</Text>
              <Text style={[styles.deleteModalMsg, { color: theme.textSecondary }]}>Share this code to invite members</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowInviteCodeModal(false)}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Category Modal (simplified) */}
        <Modal visible={showCategoryModal} animationType="slide" transparent onRequestClose={() => setShowCategoryModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Categories</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <FlatList
                data={categories}
                keyExtractor={c => c.id}
                renderItem={({ item: cat }) => (
                  <View style={[styles.categoryListItem, { backgroundColor: theme.inputBg }]}>
                    <View style={[styles.categoryListIcon, { backgroundColor: cat.color + '20' }]}><Ionicons name={cat.icon as any} size={20} color={cat.color} /></View>
                    <Text style={[styles.categoryListName, { color: theme.text }]}>{cat.name}</Text>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalInput: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, fontSize: 16, marginBottom: 16 },
  primaryButton: { backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  workspaceItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 12 },
  workspaceItemInfo: { flex: 1 },
  workspaceItemName: { fontSize: 16, fontWeight: '500' },
  workspaceItemMeta: { fontSize: 13 },
  workspaceActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  workspaceActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#4CAF50', gap: 6 },
  workspaceActionText: { color: '#4CAF50', fontWeight: '600' },
  createListButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 2, borderColor: '#4CAF50', borderStyle: 'dashed', marginBottom: 16, gap: 8 },
  createListButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
  listSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 12 },
  listStatusDot: { width: 10, height: 10, borderRadius: 5 },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 16, fontWeight: '500' },
  listItemMeta: { fontSize: 13 },
  createModeOptions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  createModeOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#4CAF50', gap: 4 },
  createModeOptionActive: { backgroundColor: '#4CAF50' },
  createModeText: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },
  templateOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#9C27B0', marginRight: 8 },
  templateOptionActive: { backgroundColor: '#9C27B0' },
  templateOptionText: { color: '#9C27B0' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { width: 60, height: 44, borderRadius: 10, fontSize: 18, fontWeight: '600' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 2, marginRight: 8, gap: 4 },
  categoryChipText: { fontSize: 14, fontWeight: '500' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  deleteRowText: { color: '#ff6b6b', fontWeight: '500' },
  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  deleteModalContent: { width: '100%', maxWidth: 320, borderRadius: 16, padding: 24, alignItems: 'center' },
  deleteModalIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ff6b6b20', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  deleteModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  deleteModalMsg: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  deleteModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  deleteModalBtnText: { fontWeight: '600' },
  profileInfo: { alignItems: 'center', marginBottom: 20 },
  profileLargeImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: 'bold' },
  profileEmail: { fontSize: 14 },
  workspaceCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  workspaceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  workspaceCardTitle: { fontSize: 16, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  memberName: { flex: 1, fontSize: 14 },
  ownerBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  ownerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  workspaceCardActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  workspaceCardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#4CAF50', gap: 6 },
  workspaceCardBtnText: { color: '#4CAF50', fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  logoutBtnText: { color: '#ff6b6b', fontWeight: '500' },
  inviteCodeDisplay: { fontSize: 24, fontWeight: 'bold', letterSpacing: 2, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 12 },
  categoryListItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 12 },
  categoryListIcon: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  categoryListName: { fontSize: 16, fontWeight: '500' },
  workspaceItemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  workspaceItemActions: { flexDirection: 'row', gap: 4 },
  workspaceItemActionBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  householdInfoCard: { alignItems: 'center', padding: 20, borderRadius: 12, marginBottom: 8 },
  householdInfoName: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  householdInfoMeta: { fontSize: 14, marginTop: 4 },
  householdActions: { marginTop: 20, gap: 12 },
  householdActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  householdActionBtnText: { fontSize: 16, fontWeight: '600' },
});
