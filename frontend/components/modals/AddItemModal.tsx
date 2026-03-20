import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EXPO_PUBLIC_BACKEND_URL, ITEM_UNITS } from '../constants';
import { useTheme } from '../ThemeContext';
import type { FontMap, Category, GroceryItem, ShoppingList } from '../types';

type Props = {
  visible: boolean;
  font: FontMap;
  categories: Category[];
  sessionToken: string | null;
  currentList: ShoppingList | null;
  onClose: () => void;
  onItemAdded: (item: GroceryItem) => void;
};

export default function AddItemModal({
  visible, font, categories, sessionToken, currentList, onClose, onItemAdded,
}: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('items');
  const [category, setCategory] = useState('Other');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setQuantity(1); setUnit('items'); setCategory('Other'); setError(''); };

  const handleAdd = async () => {
    if (!name.trim() || !currentList) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ list_id: currentList.list_id, name: name.trim(), quantity, unit, category }),
      });
      if (res.ok) {
        onItemAdded(await res.json());
        reset();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to add item');
      }
    } catch (e) {
      console.error(e);
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={[st.sheet, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={st.header}>
            <Text style={[st.title, { color: theme.text, fontFamily: font.display }]}>Add New Item</Text>
            <TouchableOpacity onPress={handleClose} style={[st.closeBtn, { backgroundColor: theme.surfaceContainer }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Item name */}
          <Text style={[st.label, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>ITEM NAME</Text>
          <TextInput
            style={[st.input, { backgroundColor: theme.inputBg, color: theme.text, fontFamily: font.body }]}
            placeholder="e.g. Organic Honey Crisp Apples"
            placeholderTextColor={theme.outline}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          {/* Category chips */}
          <Text style={[st.label, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {categories.map(cat => {
              const selected = category === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[st.chip, { backgroundColor: selected ? theme.primary : theme.surfaceContainer }]}
                  onPress={() => setCategory(cat.name)}
                >
                  <Ionicons name={cat.icon as any} size={14} color={selected ? '#fff' : theme.textSecondary} />
                  <Text style={[st.chipText, { color: selected ? '#fff' : theme.textSecondary, fontFamily: font.bodyMedium }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quantity stepper */}
          <Text style={[st.label, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>QUANTITY</Text>
          <View style={st.quantityRow}>
            <TouchableOpacity
              style={[st.qtyBtn, { backgroundColor: theme.inputBg }]}
              onPress={() => setQuantity(q => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={[st.qtyDisplay, { backgroundColor: theme.inputBg }]}>
              <Text style={[st.qtyText, { color: theme.text, fontFamily: font.bodyBold }]}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={[st.qtyBtn, { backgroundColor: theme.primary }]}
              onPress={() => setQuantity(q => q + 1)}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Unit chips */}
          <Text style={[st.label, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>UNIT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {ITEM_UNITS.slice(0, 8).map(u => (
              <TouchableOpacity
                key={u}
                style={[st.unitChip, {
                  backgroundColor: unit === u ? theme.primary + '18' : theme.surfaceContainer,
                  borderColor: unit === u ? theme.primary : 'transparent',
                  borderWidth: 1,
                }]}
                onPress={() => setUnit(u)}
              >
                <Text style={[st.unitText, { color: unit === u ? theme.primary : theme.textSecondary, fontFamily: font.bodyMedium }]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Buttons */}
          {!!error && <Text style={{ color: theme.error, fontSize: 13, fontFamily: font.body, marginBottom: 8 }}>{error}</Text>}
          <View style={st.buttonRow}>
            <TouchableOpacity
              style={[st.cancelBtn, { backgroundColor: theme.surfaceContainer }]}
              onPress={handleClose}
            >
              <Text style={[st.cancelText, { color: theme.text, fontFamily: font.bodyBold }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.saveBtn, { backgroundColor: theme.primary, opacity: (!name.trim() || loading) ? 0.5 : 1 }]}
              onPress={handleAdd}
              disabled={!name.trim() || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={[st.saveBtnText, { fontFamily: font.bodyBold }]}>Save Item</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 16, marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, gap: 6 },
  chipText: { fontSize: 13 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  qtyBtn: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qtyDisplay: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 20 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  unitText: { fontSize: 13 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  cancelText: { fontSize: 16 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 16 },
});
