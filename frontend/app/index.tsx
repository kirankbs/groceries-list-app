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
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Category definitions with colors
const CATEGORIES = [
  { name: 'Produce', color: '#4CAF50', icon: 'leaf-outline' },
  { name: 'Dairy', color: '#2196F3', icon: 'water-outline' },
  { name: 'Meat', color: '#F44336', icon: 'restaurant-outline' },
  { name: 'Bakery', color: '#FF9800', icon: 'pizza-outline' },
  { name: 'Beverages', color: '#9C27B0', icon: 'cafe-outline' },
  { name: 'Snacks', color: '#E91E63', icon: 'ice-cream-outline' },
  { name: 'Frozen', color: '#00BCD4', icon: 'snow-outline' },
  { name: 'Pantry', color: '#795548', icon: 'cube-outline' },
  { name: 'Household', color: '#607D8B', icon: 'home-outline' },
  { name: 'Other', color: '#9E9E9E', icon: 'ellipsis-horizontal-outline' },
];

const getCategoryInfo = (categoryName: string) => {
  return CATEGORIES.find(c => c.name === categoryName) || CATEGORIES[CATEGORIES.length - 1];
};

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  checked: boolean;
  created_at: string;
}

export default function GroceryTodo() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemCategory, setNewItemCategory] = useState('Other');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editCategory, setEditCategory] = useState('Other');
  const [updating, setUpdating] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Theme colors
  const theme = useMemo(() => ({
    background: darkMode ? '#121212' : '#f8f9fa',
    surface: darkMode ? '#1e1e1e' : '#fff',
    text: darkMode ? '#ffffff' : '#2d3436',
    textSecondary: darkMode ? '#b0b0b0' : '#636e72',
    border: darkMode ? '#333' : '#eee',
    inputBg: darkMode ? '#2a2a2a' : '#f5f6fa',
  }), [darkMode]);

  // Fetch all grocery items
  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groceries`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Add new grocery item
  const addItem = async () => {
    if (!newItemName.trim()) return;

    setAdding(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groceries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Toggle item checked status
  const toggleItem = async (item: GroceryItem) => {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/groceries/${item.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checked: !item.checked }),
        }
      );

      if (response.ok) {
        const updatedItem = await response.json();
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? updatedItem : i))
        );
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
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/groceries/${editingItem.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editName.trim(),
            quantity: parseInt(editQuantity) || 1,
            category: editCategory,
          }),
        }
      );

      if (response.ok) {
        const updatedItem = await response.json();
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? updatedItem : i))
        );
        setShowEditModal(false);
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Show delete confirmation modal
  const showDeleteConfirmation = (item: GroceryItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
    // Close edit modal if open
    setShowEditModal(false);
  };

  // Delete item - actual deletion
  const executeDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      console.log('Deleting item:', itemToDelete.id);
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/groceries/${itemToDelete.id}`,
        { method: 'DELETE' }
      );

      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
        console.log('Item deleted successfully');
        setShowDeleteModal(false);
        setItemToDelete(null);
      } else {
        console.error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  // Filter items based on search query and group by category
  const groupedItems = useMemo(() => {
    let filtered = items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categoryOrder = CATEGORIES.map(c => c.name);
    const groups: { [key: string]: GroceryItem[] } = {};

    filtered.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });

    const sections = categoryOrder
      .filter(cat => groups[cat] && groups[cat].length > 0)
      .map(cat => ({
        title: cat,
        data: groups[cat],
        categoryInfo: getCategoryInfo(cat),
      }));

    return sections;
  }, [items, searchQuery]);

  // Count unchecked items
  const uncheckedCount = useMemo(() => {
    return items.filter(i => !i.checked).length;
  }, [items]);

  const renderItem = ({ item }: { item: GroceryItem }) => {
    return (
      <View style={[styles.itemContainer, { backgroundColor: theme.surface }]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, item.checked && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
          onPress={() => toggleItem(item)}
        >
          {item.checked && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
        </TouchableOpacity>
        
        {/* Item content - tap to edit */}
        <TouchableOpacity 
          style={styles.itemContent}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemText, { color: theme.text }, item.checked && styles.itemTextChecked]}>
              {item.name}
            </Text>
            {item.quantity > 1 && (
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>x{item.quantity}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tapToEdit, { color: theme.textSecondary }]}>
            Tap to edit
          </Text>
        </TouchableOpacity>
        
        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => showDeleteConfirmation(item)}
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; categoryInfo: { color: string; icon: string } } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <View style={[styles.sectionIcon, { backgroundColor: section.categoryInfo.color + '20' }]}>
        <Ionicons name={section.categoryInfo.icon as any} size={18} color={section.categoryInfo.color} />
      </View>
      <Text style={[styles.sectionTitle, { color: section.categoryInfo.color }]}>
        {section.title}
      </Text>
      <View style={[styles.sectionBadge, { backgroundColor: section.categoryInfo.color + '20' }]}>
        <Text style={[styles.sectionBadgeText, { color: section.categoryInfo.color }]}>
          {groupedItems.find(s => s.title === section.title)?.data.length || 0}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading groceries...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Grocery List</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {uncheckedCount} items to buy
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
              onPress={() => setDarkMode(!darkMode)}
            >
              <Ionicons
                name={darkMode ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Info text */}
        <View style={styles.infoBar}>
          <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Items grouped by category • Tap item to edit
          </Text>
        </View>

        {/* Items List - Grouped by Category */}
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
                {searchQuery
                  ? 'No items found'
                  : 'Your grocery list is empty'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Tap + to add items'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        {/* Floating Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Delete Confirmation Modal - Custom modal that works on web */}
        <Modal
          visible={showDeleteModal}
          animationType="fade"
          transparent={true}
          onRequestClose={cancelDelete}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.deleteModalIcon}>
                <Ionicons name="trash" size={40} color="#ff6b6b" />
              </View>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Delete Item?</Text>
              <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
                Are you sure you want to delete "{itemToDelete?.name}"?
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.cancelButton, { backgroundColor: theme.inputBg }]}
                  onPress={cancelDelete}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                  onPress={executeDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Item Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Grocery Item</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Item Name */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                placeholder="e.g., Milk, Bread, Eggs..."
                placeholderTextColor={theme.textSecondary}
                value={newItemName}
                onChangeText={setNewItemName}
              />

              {/* Quantity */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: theme.inputBg }]}
                  onPress={() => setNewItemQuantity(String(Math.max(1, parseInt(newItemQuantity) - 1)))}
                >
                  <Ionicons name="remove" size={24} color={theme.text} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.quantityInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: theme.inputBg }]}
                  onPress={() => setNewItemQuantity(String(parseInt(newItemQuantity || '0') + 1))}
                >
                  <Ionicons name="add" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Category */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.categoryOption,
                      { borderColor: cat.color },
                      newItemCategory === cat.name && { backgroundColor: cat.color },
                    ]}
                    onPress={() => setNewItemCategory(cat.name)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={newItemCategory === cat.name ? '#fff' : cat.color}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        { color: newItemCategory === cat.name ? '#fff' : cat.color },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Add Button */}
              <TouchableOpacity
                style={[
                  styles.addItemButton,
                  (!newItemName.trim() || adding) && styles.addButtonDisabled,
                ]}
                onPress={addItem}
                disabled={!newItemName.trim() || adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addItemButtonText}>Add to List</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Item</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Item Name */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                placeholder="Item name..."
                placeholderTextColor={theme.textSecondary}
                value={editName}
                onChangeText={setEditName}
              />

              {/* Quantity */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: theme.inputBg }]}
                  onPress={() => setEditQuantity(String(Math.max(1, parseInt(editQuantity) - 1)))}
                >
                  <Ionicons name="remove" size={24} color={theme.text} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.quantityInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: theme.inputBg }]}
                  onPress={() => setEditQuantity(String(parseInt(editQuantity || '0') + 1))}
                >
                  <Ionicons name="add" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Category */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.categoryOption,
                      { borderColor: cat.color },
                      editCategory === cat.name && { backgroundColor: cat.color },
                    ]}
                    onPress={() => setEditCategory(cat.name)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={editCategory === cat.name ? '#fff' : cat.color}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        { color: editCategory === cat.name ? '#fff' : cat.color },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Update Button */}
              <TouchableOpacity
                style={[
                  styles.addItemButton,
                  (!editName.trim() || updating) && styles.addButtonDisabled,
                ]}
                onPress={updateItem}
                disabled={!editName.trim() || updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addItemButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              {/* Delete from edit modal */}
              <TouchableOpacity
                style={styles.deleteFromEditButton}
                onPress={() => {
                  if (editingItem) {
                    showDeleteConfirmation(editingItem);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                <Text style={styles.deleteFromEditText}>Delete Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 16,
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  tapToEdit: {
    fontSize: 11,
    marginTop: 2,
  },
  quantityBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  quantityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 12,
    marginLeft: 4,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  // Delete confirmation modal styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#ff6b6b',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Other modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 80,
    height: 48,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 24,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 10,
    gap: 6,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addItemButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#b2bec3',
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteFromEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 12,
    gap: 8,
  },
  deleteFromEditText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '500',
  },
});
