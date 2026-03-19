import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EXPO_PUBLIC_BACKEND_URL, PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import { Theme, FontMap, Category, GroceryItem } from '../types';

type Props = {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  categories: Category[];
  sessionToken: string | null;
  item: GroceryItem | null;
  onClose: () => void;
  onItemUpdated: (item: GroceryItem) => void;
  onDeleteRequest: (item: GroceryItem) => void;
};

export default function EditItemModal({
  visible, theme, font, categories, sessionToken, item, onClose, onItemUpdated, onDeleteRequest,
}: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('Other');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(item.quantity);
      setCategory(item.category);
    }
  }, [item]);

  const handleSave = async () => {
    if (!item || !name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          quantity,
          category,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onItemUpdated(updated);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>Edit Item</Text>
            <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>Item Name</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, fontFamily: font.body }]}
            value={name}
            onChangeText={setName}
          />

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
              <Ionicons name="remove" size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={[styles.qtyDisplay, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.qtyText, { color: theme.text, fontFamily: font.bodyBold }]}>{quantity}</Text>
            </View>
            <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]} onPress={() => setQuantity(q => q + 1)}>
              <Ionicons name="add" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {categories.map(cat => {
              const selected = category === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, { borderColor: cat.color }, selected && { backgroundColor: cat.color }]}
                  onPress={() => setCategory(cat.name)}
                >
                  <Ionicons name={cat.icon as any} size={14} color={selected ? '#fff' : cat.color} />
                  <Text style={[styles.chipText, { color: selected ? '#fff' : cat.color, fontFamily: font.bodyMedium }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || loading) && modalStyles.buttonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color={PALETTE.cream} />
              : <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteRow}
            onPress={() => { if (item) { onClose(); onDeleteRequest(item); } }}
          >
            <Ionicons name="trash-outline" size={18} color={PALETTE.rust} />
            <Text style={[styles.deleteRowText, { fontFamily: font.bodyMedium }]}>Delete Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  qtyBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  qtyDisplay: { width: 56, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, marginRight: 8, gap: 5 },
  chipText: { fontSize: 13 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  deleteRowText: { color: PALETTE.rust },
});
