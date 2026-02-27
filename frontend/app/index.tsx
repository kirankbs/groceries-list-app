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

// Available icons for categories
const AVAILABLE_ICONS = [
  'pricetag-outline', 'cart-outline', 'basket-outline', 'bag-outline',
  'leaf-outline', 'water-outline', 'restaurant-outline', 'pizza-outline',
  'cafe-outline', 'ice-cream-outline', 'snow-outline', 'cube-outline',
  'home-outline', 'ellipsis-horizontal-outline', 'nutrition-outline',
  'fish-outline', 'beer-outline', 'wine-outline', 'fast-food-outline',
  'flame-outline', 'medical-outline', 'fitness-outline', 'sparkles-outline',
  'heart-outline', 'star-outline', 'gift-outline', 'diamond-outline'
];

// Available colors for categories
const AVAILABLE_COLORS = [
  '#4CAF50', '#2196F3', '#F44336', '#FF9800', '#9C27B0',
  '#E91E63', '#00BCD4', '#795548', '#607D8B', '#9E9E9E',
  '#FF5722', '#673AB7', '#3F51B5', '#009688', '#8BC34A',
];

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
}

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  checked: boolean;
  created_at: string;
}

export default function GroceryTodo() {
  const { user, household, isLoading: authLoading, isAuthenticated, login, logout, sessionToken,
    createHousehold, joinHousehold, leaveHousehold, getInviteCode, regenerateInviteCode, refreshUser } = useAuth();

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemCategory, setNewItemCategory] = useState('Other');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Edit item modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editCategory, setEditCategory] = useState('Other');
  const [updating, setUpdating] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryFormModal, setShowCategoryFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#4CAF50');
  const [categoryIcon, setCategoryIcon] = useState('pricetag-outline');
  const [savingCategory, setSavingCategory] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Household modals
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [householdAction, setHouseholdAction] = useState<'create' | 'join'>('create');
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState('');

  // Theme colors
  const theme = useMemo(() => ({
    background: darkMode ? '#121212' : '#f8f9fa',
    surface: darkMode ? '#1e1e1e' : '#fff',
    text: darkMode ? '#ffffff' : '#2d3436',
    textSecondary: darkMode ? '#b0b0b0' : '#636e72',
    border: darkMode ? '#333' : '#eee',
    inputBg: darkMode ? '#2a2a2a' : '#f5f6fa',
  }), [darkMode]);

  const getCategoryInfo = useCallback((categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat || { name: categoryName, color: '#9E9E9E', icon: 'ellipsis-horizontal-outline' };
  }, [categories]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const headers: any = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories`, { headers });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [sessionToken]);

  // Fetch groceries
  const fetchItems = useCallback(async () => {
    try {
      const headers: any = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groceries`, { headers });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!authLoading) {
      fetchCategories();
      fetchItems();
    }
  }, [authLoading, fetchCategories, fetchItems, isAuthenticated, household]);

  // Add item
  const addItem = async () => {
    if (!newItemName.trim()) return;
    setAdding(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groceries`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newItemName.trim(),
          quantity: parseInt(newItemQuantity) || 1,
          category: newItemCategory,
        }),
      });
      if (response.ok) {
        const newItem = await response.json();
        setItems((prev) => [newItem, ...prev]);
        setNewItemName('');
        setNewItemQuantity('1');
        setNewItemCategory('Other');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setAdding(false);
    }
  };

  // Toggle item
  const toggleItem = async (item: GroceryItem) => {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groceries/${item.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ checked: !item.checked }),
      });
      if (response.ok) {
        const updatedItem = await response.json();
        setItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));
      }
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  // Open edit modal
  const openEditModal = (item: GroceryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(String(item.quantity));
    setEditCategory(item.category);
    setShowEditModal(true);
  };

  // Update item
  const updateItem = async () => {
    if (!editingItem || !editName.trim()) return;
    setUpdating(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groceries/${editingItem.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: editName.trim(),
          quantity: parseInt(editQuantity) || 1,
          category: editCategory,
        }),
      });
      if (response.ok) {
        const updatedItem = await response.json();
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updatedItem : i)));
        setShowEditModal(false);
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Delete confirmation
  const showDeleteConfirmation = (item: GroceryItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
    setShowEditModal(false);
  };

  // Execute delete
  const executeDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const headers: any = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groceries/${itemToDelete.id}`, {
        method: 'DELETE',
        headers,
      });
      if (response.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
        setShowDeleteModal(false);
        setItemToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Category management functions
  const openCategoryForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryColor(category.color);
      setCategoryIcon(category.icon);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryColor('#4CAF50');
      setCategoryIcon('pricetag-outline');
    }
    setShowCategoryFormModal(true);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) return;
    setSavingCategory(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const url = editingCategory
        ? `${EXPO_PUBLIC_BACKEND_URL}/api/categories/${editingCategory.id}`
        : `${EXPO_PUBLIC_BACKEND_URL}/api/categories`;
      
      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({ name: categoryName.trim(), color: categoryColor, icon: categoryIcon }),
      });
      if (response.ok) {
        await fetchCategories();
        await fetchItems();
        setShowCategoryFormModal(false);
        setEditingCategory(null);
        setCategoryName('');
      }
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSavingCategory(false);
    }
  };

  const showDeleteCategoryConfirmation = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryModal(true);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeletingCategory(true);
    try {
      const headers: any = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers,
      });
      if (response.ok) {
        await fetchCategories();
        await fetchItems();
        setShowDeleteCategoryModal(false);
        setCategoryToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setDeletingCategory(false);
    }
  };

  // Household functions
  const handleCreateHousehold = async () => {
    if (!householdName.trim()) return;
    setHouseholdLoading(true);
    try {
      await createHousehold(householdName.trim());
      setShowHouseholdModal(false);
      setHouseholdName('');
      await fetchCategories();
      await fetchItems();
    } catch (error: any) {
      console.error('Error creating household:', error);
    } finally {
      setHouseholdLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) return;
    setHouseholdLoading(true);
    try {
      await joinHousehold(inviteCode.trim());
      setShowHouseholdModal(false);
      setInviteCode('');
      await fetchCategories();
      await fetchItems();
    } catch (error: any) {
      console.error('Error joining household:', error);
    } finally {
      setHouseholdLoading(false);
    }
  };

  const handleLeaveHousehold = async () => {
    setHouseholdLoading(true);
    try {
      await leaveHousehold();
      setShowProfileModal(false);
      await fetchCategories();
      await fetchItems();
    } catch (error: any) {
      console.error('Error leaving household:', error);
    } finally {
      setHouseholdLoading(false);
    }
  };

  const handleShowInviteCode = async () => {
    try {
      const code = await getInviteCode();
      setCurrentInviteCode(code);
      setShowInviteCodeModal(true);
    } catch (error) {
      console.error('Error getting invite code:', error);
    }
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    let filtered = items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categoryOrder = categories.map(c => c.name);
    const groups: { [key: string]: GroceryItem[] } = {};

    filtered.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    return categoryOrder
      .filter(cat => groups[cat] && groups[cat].length > 0)
      .map(cat => ({
        title: cat,
        data: groups[cat],
        categoryInfo: getCategoryInfo(cat),
      }));
  }, [items, searchQuery, categories, getCategoryInfo]);

  const uncheckedCount = useMemo(() => items.filter(i => !i.checked).length, [items]);

  // Render item
  const renderItem = ({ item }: { item: GroceryItem }) => (
    <View style={[styles.itemContainer, { backgroundColor: theme.surface }]}>
      <TouchableOpacity
        style={[styles.checkbox, item.checked && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
        onPress={() => toggleItem(item)}
      >
        {item.checked && <Ionicons name="checkmark" size={18} color="#fff" />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemContent} onPress={() => openEditModal(item)} activeOpacity={0.7}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemText, { color: theme.text }, item.checked && styles.itemTextChecked]}>
            {item.name}
          </Text>
          {item.quantity > 1 && (
            <View style={styles.quantityBadge}><Text style={styles.quantityText}>x{item.quantity}</Text></View>
          )}
        </View>
        <Text style={[styles.tapToEdit, { color: theme.textSecondary }]}>Tap to edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => showDeleteConfirmation(item)}>
        <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <View style={[styles.sectionIcon, { backgroundColor: section.categoryInfo.color + '20' }]}>
        <Ionicons name={section.categoryInfo.icon} size={18} color={section.categoryInfo.color} />
      </View>
      <Text style={[styles.sectionTitle, { color: section.categoryInfo.color }]}>{section.title}</Text>
      <View style={[styles.sectionBadge, { backgroundColor: section.categoryInfo.color + '20' }]}>
        <Text style={[styles.sectionBadgeText, { color: section.categoryInfo.color }]}>{section.data.length}</Text>
      </View>
    </View>
  );

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={[styles.categoryItemRow, { backgroundColor: theme.surface }]}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={20} color={item.color} />
      </View>
      <View style={styles.categoryItemInfo}>
        <Text style={[styles.categoryItemName, { color: theme.text }]}>{item.name}</Text>
      </View>
      <View style={styles.categoryItemActions}>
        <TouchableOpacity style={styles.categoryActionBtn} onPress={() => openCategoryForm(item)}>
          <Ionicons name="pencil-outline" size={20} color={theme.text} />
        </TouchableOpacity>
        {item.name !== 'Other' && (
          <TouchableOpacity style={styles.categoryActionBtn} onPress={() => showDeleteCategoryConfirmation(item)}>
            <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Loading screen
  if (authLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <View style={styles.loginContainer}>
          <View style={styles.loginHeader}>
            <View style={styles.loginIconContainer}>
              <Ionicons name="cart" size={64} color="#4CAF50" />
            </View>
            <Text style={[styles.loginTitle, { color: theme.text }]}>Grocery Todo</Text>
            <Text style={[styles.loginSubtitle, { color: theme.textSecondary }]}>
              Manage your shopping list together with your family
            </Text>
          </View>
          
          <View style={styles.loginFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: theme.text }]}>Share lists with family</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: theme.text }]}>Organize by categories</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: theme.text }]}>Real-time sync</Text>
            </View>
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
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {household ? household.name : 'Grocery List'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {uncheckedCount} items to buy
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surface }]} onPress={() => setShowCategoryModal(true)}>
              <Ionicons name="pricetags-outline" size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surface }]} onPress={() => setDarkMode(!darkMode)}>
              <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileButton, { backgroundColor: theme.surface }]} onPress={() => setShowProfileModal(true)}>
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={28} color={theme.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Household banner */}
        {!household && (
          <TouchableOpacity style={styles.householdBanner} onPress={() => setShowHouseholdModal(true)}>
            <Ionicons name="people-outline" size={20} color="#fff" />
            <Text style={styles.householdBannerText}>Create or join a household to share lists</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search groceries..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Items List */}
        <SectionList
          sections={groupedItems}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery ? 'No items found' : 'Your grocery list is empty'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                {searchQuery ? 'Try a different search term' : 'Tap + to add items'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>

        {/* ==================== MODALS ==================== */}

        {/* Profile Modal */}
        <Modal visible={showProfileModal} animationType="slide" transparent={true} onRequestClose={() => setShowProfileModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Profile</Text>
                <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* User info */}
              <View style={styles.profileInfo}>
                {user?.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.profileLargeImage} />
                ) : (
                  <View style={[styles.profilePlaceholder, { backgroundColor: theme.inputBg }]}>
                    <Ionicons name="person" size={40} color={theme.textSecondary} />
                  </View>
                )}
                <Text style={[styles.profileName, { color: theme.text }]}>{user?.name}</Text>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
              </View>

              {/* Household section */}
              <View style={styles.profileSection}>
                <Text style={[styles.profileSectionTitle, { color: theme.text }]}>Household</Text>
                {household ? (
                  <View style={[styles.householdCard, { backgroundColor: theme.inputBg }]}>
                    <View style={styles.householdInfo}>
                      <Ionicons name="home" size={24} color="#4CAF50" />
                      <View style={styles.householdDetails}>
                        <Text style={[styles.householdName, { color: theme.text }]}>{household.name}</Text>
                        <Text style={[styles.householdMembers, { color: theme.textSecondary }]}>
                          {household.members?.length || 1} member{(household.members?.length || 1) > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    {household.members && household.members.length > 0 && (
                      <View style={styles.membersList}>
                        {household.members.map((member) => (
                          <View key={member.user_id} style={styles.memberRow}>
                            {member.picture ? (
                              <Image source={{ uri: member.picture }} style={styles.memberImage} />
                            ) : (
                              <View style={[styles.memberPlaceholder, { backgroundColor: theme.surface }]}>
                                <Ionicons name="person" size={16} color={theme.textSecondary} />
                              </View>
                            )}
                            <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
                            {member.user_id === household.owner_id && (
                              <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>Owner</Text></View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.householdActions}>
                      <TouchableOpacity style={styles.householdActionBtn} onPress={handleShowInviteCode}>
                        <Ionicons name="share-outline" size={20} color="#4CAF50" />
                        <Text style={styles.householdActionText}>Invite</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.householdActionBtn, { borderColor: '#ff6b6b' }]} onPress={handleLeaveHousehold}>
                        <Ionicons name="exit-outline" size={20} color="#ff6b6b" />
                        <Text style={[styles.householdActionText, { color: '#ff6b6b' }]}>Leave</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.createHouseholdBtn, { backgroundColor: theme.inputBg }]} onPress={() => { setShowProfileModal(false); setShowHouseholdModal(true); }}>
                    <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
                    <Text style={[styles.createHouseholdText, { color: theme.text }]}>Create or Join Household</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Logout button */}
              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Household Create/Join Modal */}
        <Modal visible={showHouseholdModal} animationType="slide" transparent={true} onRequestClose={() => setShowHouseholdModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Household</Text>
                <TouchableOpacity onPress={() => setShowHouseholdModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={styles.householdTabs}>
                <TouchableOpacity 
                  style={[styles.householdTab, householdAction === 'create' && styles.householdTabActive]} 
                  onPress={() => setHouseholdAction('create')}
                >
                  <Text style={[styles.householdTabText, householdAction === 'create' && styles.householdTabTextActive]}>Create New</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.householdTab, householdAction === 'join' && styles.householdTabActive]} 
                  onPress={() => setHouseholdAction('join')}
                >
                  <Text style={[styles.householdTabText, householdAction === 'join' && styles.householdTabTextActive]}>Join Existing</Text>
                </TouchableOpacity>
              </View>

              {householdAction === 'create' ? (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Household Name</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                    placeholder="e.g., Smith Family"
                    placeholderTextColor={theme.textSecondary}
                    value={householdName}
                    onChangeText={setHouseholdName}
                  />
                  <TouchableOpacity
                    style={[styles.addItemButton, (!householdName.trim() || householdLoading) && styles.addButtonDisabled]}
                    onPress={handleCreateHousehold}
                    disabled={!householdName.trim() || householdLoading}
                  >
                    {householdLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addItemButtonText}>Create Household</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Invite Code</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                    placeholder="Enter invite code"
                    placeholderTextColor={theme.textSecondary}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.addItemButton, (!inviteCode.trim() || householdLoading) && styles.addButtonDisabled]}
                    onPress={handleJoinHousehold}
                    disabled={!inviteCode.trim() || householdLoading}
                  >
                    {householdLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addItemButtonText}>Join Household</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Invite Code Modal */}
        <Modal visible={showInviteCodeModal} animationType="fade" transparent={true} onRequestClose={() => setShowInviteCodeModal(false)}>
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.deleteModalIcon, { backgroundColor: '#4CAF5020' }]}>
                <Ionicons name="share-social" size={40} color="#4CAF50" />
              </View>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Invite Code</Text>
              <Text style={[styles.inviteCodeDisplay, { color: theme.text, backgroundColor: theme.inputBg }]}>{currentInviteCode}</Text>
              <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
                Share this code with family members to invite them to your household.
              </Text>
              <TouchableOpacity style={[styles.addItemButton, { marginTop: 16 }]} onPress={() => setShowInviteCodeModal(false)}>
                <Text style={styles.addItemButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Item Modal */}
        <Modal visible={showDeleteModal} animationType="fade" transparent={true} onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.deleteModalIcon}><Ionicons name="trash" size={40} color="#ff6b6b" /></View>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Delete Item?</Text>
              <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
                Are you sure you want to delete "{itemToDelete?.name}"?
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity style={[styles.deleteModalButton, styles.cancelButton, { backgroundColor: theme.inputBg }]} onPress={() => setShowDeleteModal(false)}>
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.deleteModalButton, styles.confirmDeleteButton]} onPress={executeDelete} disabled={deleting}>
                  {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Item Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent={true} onRequestClose={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Grocery Item</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="e.g., Milk, Bread, Eggs..." placeholderTextColor={theme.textSecondary} value={newItemName} onChangeText={setNewItemName} />
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity style={[styles.quantityButton, { backgroundColor: theme.inputBg }]} onPress={() => setNewItemQuantity(String(Math.max(1, parseInt(newItemQuantity) - 1)))}><Ionicons name="remove" size={24} color={theme.text} /></TouchableOpacity>
                <TextInput style={[styles.quantityInput, { backgroundColor: theme.inputBg, color: theme.text }]} value={newItemQuantity} onChangeText={setNewItemQuantity} keyboardType="numeric" textAlign="center" />
                <TouchableOpacity style={[styles.quantityButton, { backgroundColor: theme.inputBg }]} onPress={() => setNewItemQuantity(String(parseInt(newItemQuantity || '0') + 1))}><Ionicons name="add" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryOption, { borderColor: cat.color }, newItemCategory === cat.name && { backgroundColor: cat.color }]} onPress={() => setNewItemCategory(cat.name)}>
                    <Ionicons name={cat.icon as any} size={16} color={newItemCategory === cat.name ? '#fff' : cat.color} />
                    <Text style={[styles.categoryOptionText, { color: newItemCategory === cat.name ? '#fff' : cat.color }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.addItemButton, (!newItemName.trim() || adding) && styles.addButtonDisabled]} onPress={addItem} disabled={!newItemName.trim() || adding}>
                {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addItemButtonText}>Add to List</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        <Modal visible={showEditModal} animationType="slide" transparent={true} onRequestClose={() => setShowEditModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Item</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Item name..." placeholderTextColor={theme.textSecondary} value={editName} onChangeText={setEditName} />
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity style={[styles.quantityButton, { backgroundColor: theme.inputBg }]} onPress={() => setEditQuantity(String(Math.max(1, parseInt(editQuantity) - 1)))}><Ionicons name="remove" size={24} color={theme.text} /></TouchableOpacity>
                <TextInput style={[styles.quantityInput, { backgroundColor: theme.inputBg, color: theme.text }]} value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric" textAlign="center" />
                <TouchableOpacity style={[styles.quantityButton, { backgroundColor: theme.inputBg }]} onPress={() => setEditQuantity(String(parseInt(editQuantity || '0') + 1))}><Ionicons name="add" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryOption, { borderColor: cat.color }, editCategory === cat.name && { backgroundColor: cat.color }]} onPress={() => setEditCategory(cat.name)}>
                    <Ionicons name={cat.icon as any} size={16} color={editCategory === cat.name ? '#fff' : cat.color} />
                    <Text style={[styles.categoryOptionText, { color: editCategory === cat.name ? '#fff' : cat.color }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.addItemButton, (!editName.trim() || updating) && styles.addButtonDisabled]} onPress={updateItem} disabled={!editName.trim() || updating}>
                {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addItemButtonText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteFromEditButton} onPress={() => editingItem && showDeleteConfirmation(editingItem)}>
                <Ionicons name="trash-outline" size={20} color="#ff6b6b" /><Text style={styles.deleteFromEditText}>Delete Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Category Management Modal */}
        <Modal visible={showCategoryModal} animationType="slide" transparent={true} onRequestClose={() => setShowCategoryModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Manage Categories</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.addCategoryButton} onPress={() => openCategoryForm()}>
                <Ionicons name="add-circle-outline" size={24} color="#4CAF50" /><Text style={styles.addCategoryText}>Create New Category</Text>
              </TouchableOpacity>
              <FlatList data={categories} renderItem={renderCategoryItem} keyExtractor={(item) => item.id} style={styles.categoryList} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />
            </View>
          </View>
        </Modal>

        {/* Category Form Modal */}
        <Modal visible={showCategoryFormModal} animationType="slide" transparent={true} onRequestClose={() => setShowCategoryFormModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>
                <TouchableOpacity onPress={() => setShowCategoryFormModal(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <View style={styles.categoryPreview}>
                <View style={[styles.categoryPreviewIcon, { backgroundColor: categoryColor + '20' }]}><Ionicons name={categoryIcon as any} size={32} color={categoryColor} /></View>
                <Text style={[styles.categoryPreviewName, { color: categoryColor }]}>{categoryName || 'Category Name'}</Text>
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category Name</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Enter category name..." placeholderTextColor={theme.textSecondary} value={categoryName} onChangeText={setCategoryName} />
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                {AVAILABLE_COLORS.map((color) => (
                  <TouchableOpacity key={color} style={[styles.colorOption, { backgroundColor: color }, categoryColor === color && styles.colorOptionSelected]} onPress={() => setCategoryColor(color)}>
                    {categoryColor === color && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                {AVAILABLE_ICONS.map((icon) => (
                  <TouchableOpacity key={icon} style={[styles.iconOption, { backgroundColor: theme.inputBg }, categoryIcon === icon && { backgroundColor: categoryColor + '30', borderColor: categoryColor, borderWidth: 2 }]} onPress={() => setCategoryIcon(icon)}>
                    <Ionicons name={icon as any} size={24} color={categoryIcon === icon ? categoryColor : theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.addItemButton, (!categoryName.trim() || savingCategory) && styles.addButtonDisabled]} onPress={saveCategory} disabled={!categoryName.trim() || savingCategory}>
                {savingCategory ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addItemButtonText}>{editingCategory ? 'Save Changes' : 'Create Category'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Category Modal */}
        <Modal visible={showDeleteCategoryModal} animationType="fade" transparent={true} onRequestClose={() => setShowDeleteCategoryModal(false)}>
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.deleteModalIcon}><Ionicons name="pricetag" size={40} color="#ff6b6b" /></View>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Delete Category?</Text>
              <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
                Are you sure you want to delete "{categoryToDelete?.name}"? Items will be moved to "Other".
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity style={[styles.deleteModalButton, styles.cancelButton, { backgroundColor: theme.inputBg }]} onPress={() => setShowDeleteCategoryModal(false)}>
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.deleteModalButton, styles.confirmDeleteButton]} onPress={executeDeleteCategory} disabled={deletingCategory}>
                  {deletingCategory ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
                </TouchableOpacity>
              </View>
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
  loadingText: { marginTop: 12, fontSize: 16 },
  // Login styles
  loginContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  loginHeader: { alignItems: 'center', marginBottom: 40 },
  loginIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#4CAF5020', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  loginTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  loginSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  loginFeatures: { marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  featureText: { fontSize: 16 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', paddingVertical: 16, borderRadius: 14, gap: 12 },
  googleButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  profileButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  // Household banner
  householdBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', marginHorizontal: 20, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 8 },
  householdBannerText: { color: '#fff', flex: 1, fontSize: 14 },
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 16, borderRadius: 12 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingTop: 16, gap: 10 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  sectionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sectionBadgeText: { fontSize: 14, fontWeight: '600' },
  itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12 },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemTextChecked: { textDecorationLine: 'line-through', opacity: 0.5 },
  tapToEdit: { fontSize: 11, marginTop: 2 },
  quantityBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  quantityText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteButton: { padding: 12, marginLeft: 4 },
  separator: { height: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalInput: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16, marginBottom: 20 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  quantityButton: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quantityInput: { width: 80, height: 48, borderRadius: 12, fontSize: 18, fontWeight: '600' },
  categoryScroll: { marginBottom: 24 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 2, marginRight: 10, gap: 6 },
  categoryOptionText: { fontSize: 14, fontWeight: '500' },
  addItemButton: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  addButtonDisabled: { backgroundColor: '#b2bec3' },
  addItemButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteFromEditButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 12, gap: 8 },
  deleteFromEditText: { color: '#ff6b6b', fontSize: 16, fontWeight: '500' },
  // Delete modal
  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  deleteModalContent: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, alignItems: 'center' },
  deleteModalIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255, 107, 107, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  deleteModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  deleteModalMessage: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  deleteModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButton: {},
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  confirmDeleteButton: { backgroundColor: '#ff6b6b' },
  confirmDeleteText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Category management
  addCategoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#4CAF50', borderStyle: 'dashed', marginBottom: 16, gap: 8 },
  addCategoryText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
  categoryList: { flex: 1 },
  categoryItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryItemInfo: { flex: 1 },
  categoryItemName: { fontSize: 16, fontWeight: '500' },
  categoryItemActions: { flexDirection: 'row', gap: 8 },
  categoryActionBtn: { padding: 8 },
  categoryPreview: { alignItems: 'center', marginBottom: 24, paddingVertical: 16 },
  categoryPreviewIcon: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  categoryPreviewName: { fontSize: 18, fontWeight: '600' },
  colorScroll: { marginBottom: 20 },
  colorOption: { width: 40, height: 40, borderRadius: 20, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  colorOptionSelected: { borderWidth: 3, borderColor: '#fff' },
  iconScroll: { marginBottom: 24 },
  iconOption: { width: 48, height: 48, borderRadius: 12, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  // Profile
  profileInfo: { alignItems: 'center', marginBottom: 24 },
  profileLargeImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  profilePlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  profileEmail: { fontSize: 14 },
  profileSection: { marginBottom: 24 },
  profileSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  householdCard: { borderRadius: 12, padding: 16 },
  householdInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  householdDetails: { marginLeft: 12 },
  householdName: { fontSize: 16, fontWeight: '600' },
  householdMembers: { fontSize: 14, marginTop: 2 },
  membersList: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  memberImage: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  memberPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  memberName: { flex: 1, fontSize: 14 },
  ownerBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  ownerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  householdActions: { flexDirection: 'row', gap: 12 },
  householdActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#4CAF50', gap: 6 },
  householdActionText: { color: '#4CAF50', fontWeight: '500' },
  createHouseholdBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 10 },
  createHouseholdText: { fontSize: 16, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  logoutText: { color: '#ff6b6b', fontSize: 16, fontWeight: '500' },
  // Household modal
  householdTabs: { flexDirection: 'row', marginBottom: 24, borderRadius: 12, overflow: 'hidden' },
  householdTab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f0f0f0' },
  householdTabActive: { backgroundColor: '#4CAF50' },
  householdTabText: { fontWeight: '600', color: '#666' },
  householdTabTextActive: { color: '#fff' },
  // Invite code
  inviteCodeDisplay: { fontSize: 24, fontWeight: 'bold', letterSpacing: 2, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 16 },
});
