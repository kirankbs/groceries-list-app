import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE, AVAILABLE_COLORS, AVAILABLE_ICONS, EXPO_PUBLIC_BACKEND_URL } from '../constants';
import { modalStyles } from '../sharedStyles';
import type { Theme, FontMap, Category, Workspace } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  categories: Category[];
  sessionToken: string | null;
  currentWorkspace: Workspace | null;
  onClose: () => void;
  onCategoriesChanged: () => void;
}

export default function CategoryModal({
  visible, theme, font, categories, sessionToken, currentWorkspace,
  onClose, onCategoriesChanged,
}: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(AVAILABLE_COLORS[0]);
  const [categoryIcon, setCategoryIcon] = useState(AVAILABLE_ICONS[0]);
  const [categoryError, setCategoryError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openForm = (cat: Category | null) => {
    setEditingCategory(cat);
    setCategoryName(cat?.name || '');
    setCategoryColor(cat?.color || AVAILABLE_COLORS[0]);
    setCategoryIcon(cat?.icon || AVAILABLE_ICONS[0]);
    setCategoryError('');
    setView('form');
  };

  const handleClose = () => {
    if (view === 'form') {
      setView('list');
    } else {
      setView('list');
      onClose();
    }
  };

  const handleSave = async () => {
    if (!categoryName.trim() || saving || !currentWorkspace) return;
    setSaving(true);
    setCategoryError('');
    try {
      const url = editingCategory
        ? `${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/categories/${editingCategory.id}`
        : `${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/categories`;
      const resp = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name: categoryName.trim(), color: categoryColor, icon: categoryIcon }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setCategoryError(err.detail || 'Failed to save category');
        return;
      }
      onCategoriesChanged();
      setView('list');
    } catch {
      setCategoryError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Items in this category will move to "Other".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentWorkspace) return;
            setDeleting(true);
            try {
              await fetch(
                `${EXPO_PUBLIC_BACKEND_URL}/api/workspaces/${currentWorkspace.workspace_id}/categories/${cat.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${sessionToken}` },
                },
              );
              onCategoriesChanged();
            } catch {
              // silent
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        {view === 'list' && (
          <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>Categories</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: PALETTE.sage + '15' }]}
                  onPress={() => openForm(null)}
                >
                  <Ionicons name="add" size={16} color={PALETTE.sage} />
                  <Text style={{ color: PALETTE.sage, fontFamily: font.bodySemiBold, fontSize: 13 }}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={categories}
              keyExtractor={c => c.id}
              renderItem={({ item: cat }) => (
                <View style={[styles.catItem, { backgroundColor: theme.inputBg }]}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <Text style={[styles.catName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                    {cat.name}
                  </Text>
                  {cat.name !== 'Other' && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.catActionBtn, { backgroundColor: PALETTE.sage + '15' }]}
                        onPress={() => openForm(cat)}
                      >
                        <Ionicons name="pencil-outline" size={14} color={PALETTE.sage} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.catActionBtn, { backgroundColor: PALETTE.rust + '12' }]}
                        onPress={() => handleDelete(cat)}
                      >
                        {deleting ? (
                          <ActivityIndicator size={14} color={PALETTE.rust} />
                        ) : (
                          <Ionicons name="trash-outline" size={14} color={PALETTE.rust} />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </View>
        )}

        {view === 'form' && (
          <View style={[modalStyles.content, { backgroundColor: theme.surface, height: '90%' }]}>
            <View style={modalStyles.header}>
              <TouchableOpacity
                onPress={() => setView('list')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="chevron-back" size={18} color={theme.text} />
                <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setView('list'); onClose(); }}
                style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={[styles.preview, { backgroundColor: theme.inputBg }]}>
                <View style={[styles.catIcon, { backgroundColor: categoryColor + '20', width: 44, height: 44, borderRadius: 11 }]}>
                  <Ionicons name={categoryIcon as any} size={22} color={categoryColor} />
                </View>
                <Text style={{ fontSize: 16, fontFamily: font.serifMedium, color: categoryName ? theme.text : PALETTE.sand }}>
                  {categoryName || 'Preview'}
                </Text>
              </View>

              <Text style={[styles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
                Name
              </Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, fontFamily: font.body }]}
                placeholder="e.g., Vegetables, Electronics..."
                placeholderTextColor={PALETTE.sand}
                value={categoryName}
                onChangeText={t => { setCategoryName(t); setCategoryError(''); }}
                autoFocus
              />
              {!!categoryError && (
                <Text style={[styles.errorText, { fontFamily: font.body }]}>{categoryError}</Text>
              )}

              <Text style={[styles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
                Color
              </Text>
              <View style={styles.colorRow}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      categoryColor === color && styles.colorCircleSelected,
                    ]}
                    onPress={() => setCategoryColor(color)}
                  />
                ))}
              </View>

              <Text style={[styles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
                Icon
              </Text>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconCell,
                      { backgroundColor: categoryIcon === icon ? categoryColor + '20' : theme.inputBg },
                      categoryIcon === icon && { borderWidth: 2, borderColor: categoryColor },
                    ]}
                    onPress={() => setCategoryIcon(icon)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={20}
                      color={categoryIcon === icon ? categoryColor : theme.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                modalStyles.primaryButton,
                { marginTop: 12 },
                (saving || !categoryName.trim()) && modalStyles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !categoryName.trim()}
            >
              {saving ? (
                <ActivityIndicator color={PALETTE.cream} size="small" />
              ) : (
                <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  catItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 10 },
  catIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catName: { fontSize: 15, flex: 1 },
  catActionBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 16 },
  formLabel: { fontSize: 12, marginBottom: 10, marginTop: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  errorText: { color: PALETTE.rust, fontSize: 13, marginTop: -10, marginBottom: 12 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  colorCircle: { width: 34, height: 34, borderRadius: 17 },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: PALETTE.cream,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  iconCell: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
