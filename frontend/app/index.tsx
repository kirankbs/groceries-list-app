import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
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

type SortOption = 'created_at' | 'name' | 'category';

export default function GroceryTodo() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemCategory, setNewItemCategory] = useState('Other');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

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
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/groceries?sort_by=${sortBy}&sort_order=desc`
      );
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

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
      Alert.alert('Error', 'Failed to add item');
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

  // Delete item
  const deleteItem = async (itemId: string) => {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/groceries/${itemId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Confirm delete
  const confirmDelete = (item: GroceryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
      ]
    );
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    let filtered = items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort locally for immediate response
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'category') {
      filtered.sort((a, b) => a.category.localeCompare(b.category));
    }
    
    return filtered;
  }, [items, searchQuery, sortBy]);

  // Separate checked and unchecked items
  const uncheckedItems = filteredItems.filter((item) => !item.checked);
  const checkedItems = filteredItems.filter((item) => item.checked);

  const renderItem = ({ item }: { item: GroceryItem }) => {
    const categoryInfo = getCategoryInfo(item.category);
    
    return (
      <TouchableOpacity
        style={[styles.itemContainer, { backgroundColor: theme.surface }]}
        onPress={() => toggleItem(item)}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, item.checked && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}>
          {item.checked && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
        </View>
        <View style={styles.itemContent}>
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
          <View style={[styles.categoryTag, { backgroundColor: categoryInfo.color + '20' }]}>
            <Ionicons name={categoryInfo.icon as any} size={12} color={categoryInfo.color} />
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
              {item.category}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.badge, { backgroundColor: darkMode ? '#333' : '#dfe6e9' }]}>
        <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{count}</Text>
      </View>
    </View>
  );

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name': return 'Name';
      case 'category': return 'Category';
      default: return 'Date';
    }
  };

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
              {uncheckedItems.length} items to buy
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
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
              onPress={() => setShowSortModal(true)}
            >
              <Ionicons name="funnel-outline" size={20} color={theme.text} />
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

        {/* Sort indicator */}
        <View style={styles.sortIndicator}>
          <Text style={[styles.sortText, { color: theme.textSecondary }]}>
            Sorted by: {getSortLabel()}
          </Text>
        </View>

        {/* Items List */}
        <FlatList
          data={[...uncheckedItems, ...checkedItems]}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            uncheckedItems.length > 0 ? (
              renderSectionHeader('To Buy', uncheckedItems.length)
            ) : null
          }
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

        {/* Completed Section Header */}
        {checkedItems.length > 0 && uncheckedItems.length > 0 && (
          <View style={styles.completedDivider}>
            {renderSectionHeader('Completed', checkedItems.length)}
          </View>
        )}

        {/* Floating Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>

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
                  onPress={() => setNewItemQuantity(String(parseInt(newItemQuantity) + 1))}
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

        {/* Sort Modal */}
        <Modal
          visible={showSortModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowSortModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          >
            <View style={[styles.sortModalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sortModalTitle, { color: theme.text }]}>Sort By</Text>
              
              {[
                { value: 'created_at', label: 'Date Added', icon: 'time-outline' },
                { value: 'name', label: 'Name (A-Z)', icon: 'text-outline' },
                { value: 'category', label: 'Category', icon: 'pricetag-outline' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionActive,
                  ]}
                  onPress={() => {
                    setSortBy(option.value as SortOption);
                    setShowSortModal(false);
                  }}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={sortBy === option.value ? '#4CAF50' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: sortBy === option.value ? '#4CAF50' : theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={22} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
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
  sortIndicator: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sortText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
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
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  separator: {
    height: 10,
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
  completedDivider: {
    paddingHorizontal: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
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
  sortModalContent: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 20,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    flex: 1,
  },
});
