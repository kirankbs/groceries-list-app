import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme, Category } from '../types';
import { EXPO_PUBLIC_BACKEND_URL, AVAILABLE_ICONS, AVAILABLE_COLORS } from '../constants';

interface Props {
  visible: boolean;
  theme: Theme;
  categories: Category[];
  onCategoriesChanged: () => void;
  onItemsChanged: () => void;
  onClose: () => void;
}

export function CategoryModal({ visible, theme, categories, onCategoriesChanged, onItemsChanged, onClose }: Props) {
  const { sessionToken, currentWorkspace } = useAuth();

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(AVAILABLE_COLORS[0]);
  const [categoryIcon, setCategoryIcon] = useState(AVAILABLE_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const openForm = (cat: Category | null) => {
    setEditingCategory(cat);
    setCategoryName(cat ? cat.name : '');
    setCategoryColor(cat ? cat.color : AVAILABLE_COLORS[0]);
    setCategoryIcon(cat ? cat.icon : AVAILABLE_ICONS[0]);
    setError('');
    setView('form');
  };

  const handleSave = async () => {
    if (!categoryName.trim() || !currentWorkspace || !sessionToken) return;
    setSaving(true);
    setError('');
    try {
      if (editingCategory) {
        const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ name: categoryName.trim(), color: categoryColor, icon: categoryIcon }),
        });
        if (!res.ok) { const err = await res.json(); setError(err.detail || 'Failed to update'); return; }
      } else {
        const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({
            name: categoryName.trim(),
            color: categoryColor,
            icon: categoryIcon,
            workspace_id: currentWorkspace.workspace_id,
          }),
        });
        if (!res.ok) { const err = await res.json(); setError(err.detail || 'Failed to create'); return; }
      }
      await onCategoriesChanged();
      setView('list');
    } catch { setError('Network error. Try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category?',
      `"${cat.name}" will be deleted. All items in this category will be moved to Other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories/${cat.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${sessionToken}` },
              });
              if (res.ok) { await onCategoriesChanged(); await onItemsChanged(); }
            } catch (e) { console.error(e); }
            finally { setDeleting(false); }
          },
        },
      ]
    );
  };

  const handleRequestClose = () => {
    if (view === 'form') {
      setView('list');
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleRequestClose}
    >
      <View style={modalStyles.overlay}>

        {/* LIST VIEW */}
        {view === 'list' && (
          <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: theme.text }]}>Manage Categories</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.addCategoryBtn, { backgroundColor: '#4CAF5015' }]}
                  onPress={() => openForm(null)}
                  data-testid="add-category-btn"
                >
                  <Ionicons name="add" size={18} color="#4CAF50" />
                  <Text style={{ color: '#4CAF50', fontWeight: '600', fontSize: 13 }}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} data-testid="close-category-modal">
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={categories}
              keyExtractor={c => c.id}
              renderItem={({ item: cat }) => (
                <View style={[styles.categoryListItem, { backgroundColor: theme.inputBg }]}>
                  <View style={[styles.categoryListIcon, { backgroundColor: cat.color + '25' }]}>
                    <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryListName, { color: theme.text, flex: 1 }]}>{cat.name}</Text>
                  {cat.name !== 'Other' && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.catActionBtn, { backgroundColor: '#2196F318' }]}
                        onPress={() => openForm(cat)}
                        data-testid={`edit-cat-btn-${cat.id}`}
                      >
                        <Ionicons name="pencil-outline" size={15} color="#2196F3" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.catActionBtn, { backgroundColor: '#FF634718' }]}
                        onPress={() => handleDelete(cat)}
                        data-testid={`delete-cat-btn-${cat.id}`}
                      >
                        {deleting
                          ? <ActivityIndicator size={14} color="#FF6347" />
                          : <Ionicons name="trash-outline" size={15} color="#FF6347" />
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </View>
        )}

        {/* FORM VIEW */}
        {view === 'form' && (
          <View style={[modalStyles.content, { backgroundColor: theme.surface, height: '90%' as any }]}>
            <View style={modalStyles.header}>
              <TouchableOpacity
                onPress={() => setView('list')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="chevron-back" size={20} color={theme.text} />
                <Text style={[modalStyles.title, { color: theme.text }]}>
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} data-testid="close-cat-form">
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Live Preview */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: theme.inputBg, marginBottom: 16 }}>
                <View style={[styles.categoryListIcon, { backgroundColor: categoryColor + '25', width: 44, height: 44, borderRadius: 11 }]}>
                  <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: categoryName ? theme.text : theme.textSecondary }}>
                  {categoryName || 'Category Preview'}
                </Text>
              </View>

              {/* Name */}
              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Category Name</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                placeholder="e.g. Vegetables, Electronics..."
                placeholderTextColor={theme.textSecondary}
                value={categoryName}
                onChangeText={t => { setCategoryName(t); setError(''); }}
                autoFocus
                data-testid="category-name-input"
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              {/* Color Picker */}
              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Color</Text>
              <View style={styles.colorPickerRow}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorCircle, { backgroundColor: color }, categoryColor === color && styles.colorCircleSelected]}
                    onPress={() => setCategoryColor(color)}
                  />
                ))}
              </View>

              {/* Icon Picker */}
              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Icon</Text>
              <View style={styles.iconPickerGrid}>
                {AVAILABLE_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconCell,
                      { backgroundColor: categoryIcon === icon ? categoryColor + '25' : theme.inputBg },
                      categoryIcon === icon && { borderWidth: 2, borderColor: categoryColor },
                    ]}
                    onPress={() => setCategoryIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={22} color={categoryIcon === icon ? categoryColor : theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 8 }} />
            </ScrollView>

            <TouchableOpacity
              style={[modalStyles.primaryButton, { marginTop: 12 }, (saving || !categoryName.trim()) && modalStyles.primaryButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !categoryName.trim()}
              data-testid="save-category-btn"
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={modalStyles.primaryButtonText}>{editingCategory ? 'Save Changes' : 'Create Category'}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = {
  addCategoryBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  categoryListItem: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, gap: 12 },
  categoryListIcon: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center' as const, alignItems: 'center' as const },
  categoryListName: { fontSize: 16, fontWeight: '500' as const },
  catActionBtn: { width: 30, height: 30, borderRadius: 7, justifyContent: 'center' as const, alignItems: 'center' as const },
  formLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 10, marginTop: 14, letterSpacing: 0.3, textTransform: 'uppercase' as const },
  errorText: { color: '#FF6347', fontSize: 13, marginTop: -10, marginBottom: 12 },
  colorPickerRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10, marginBottom: 4 },
  colorCircle: { width: 34, height: 34, borderRadius: 17 },
  colorCircleSelected: { borderWidth: 3, borderColor: '#fff', elevation: 4 },
  iconPickerGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 4 },
  iconCell: { width: 50, height: 50, borderRadius: 10, justifyContent: 'center' as const, alignItems: 'center' as const },
};
