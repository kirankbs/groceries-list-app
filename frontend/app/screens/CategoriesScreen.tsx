import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Platform, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { EXPO_PUBLIC_BACKEND_URL } from '../../components/constants';
import type { FontMap, Category, GroceryItem } from '../../components/types';
import CategoryModal from '../../components/modals/CategoryModal';

type Props = {
  font: FontMap;
  categories: Category[];
  fetchCategories: () => void;
  items: GroceryItem[];
};

export default function CategoriesScreen({ font, categories, fetchCategories, items }: Props) {
  const { theme } = useTheme();
  const { sessionToken, currentWorkspace } = useAuth();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top,
    insets.top
  );

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const itemCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [items]);

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Items will move to "Other".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!currentWorkspace) return;
            try {
              await fetch(
                `${EXPO_PUBLIC_BACKEND_URL}/api/categories/${cat.id}`,
                { method: 'DELETE', headers: { Authorization: `Bearer ${sessionToken}` } }
              );
              fetchCategories();
            } catch { /* silent */ }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: topPadding }}>
      {/* Header */}
      <View style={st.pageHeader}>
        <Text style={[st.pageTitle, { color: theme.text, fontFamily: font.display }]}>Categories</Text>
        <TouchableOpacity>
          <Text style={{ color: theme.primary, fontFamily: font.bodySemiBold, fontSize: 15 }}>Edit</Text>
        </TouchableOpacity>
      </View>
      <Text style={[st.subtitle, { color: theme.textSecondary, fontFamily: font.body }]}>
        Organize your kitchen essentials by tailoring categories to your household needs.
      </Text>

      <FlatList
        data={categories}
        keyExtractor={c => c.id}
        contentContainerStyle={st.listContent}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[st.catCard, { backgroundColor: theme.surface }]}
            onPress={() => { setEditingCategory(cat); setShowForm(true); }}
            disabled={cat.name === 'Other'}
          >
            <View style={[st.catIconWrap, { backgroundColor: cat.color + '20' }]}>
              <Ionicons name={cat.icon as any} size={22} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: font.bodyMedium, color: theme.text }}>{cat.name}</Text>
              <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                {cat.name === 'Other' ? 'DEFAULT' : `${itemCountByCategory[cat.name] || 0} ITEMS`}
              </Text>
            </View>
            {cat.name !== 'Other' && (
              <TouchableOpacity
                onPress={() => handleDelete(cat)}
                style={[st.deleteBtn, { backgroundColor: theme.error + '12' }]}
              >
                <Ionicons name="trash-outline" size={16} color={theme.error} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          <View style={{ marginTop: 20, gap: 16 }}>
            <TouchableOpacity
              style={[st.addBtn, { backgroundColor: theme.primary }]}
              onPress={() => { setEditingCategory(null); setShowForm(true); }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: font.bodyBold, fontSize: 16 }}>Add Category</Text>
            </TouchableOpacity>
            <View style={[st.proTip, { backgroundColor: theme.primary + '12' }]}>
              <Text style={{ fontFamily: font.bodyBold, color: theme.primary, fontSize: 14, marginBottom: 4 }}>Pro Tip</Text>
              <Text style={{ fontFamily: font.body, color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Group categories by your grocery store&apos;s layout to cut your shopping time in half.
              </Text>
            </View>
          </View>
        }
      />

      <CategoryModal
        visible={showForm}
        font={font}
        category={editingCategory}
        sessionToken={sessionToken}
        currentWorkspace={currentWorkspace}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); fetchCategories(); }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 24 },
  subtitle: { paddingHorizontal: 20, fontSize: 14, marginBottom: 16, lineHeight: 20 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  catCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14 },
  catIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  proTip: { borderRadius: 16, padding: 16 },
});
