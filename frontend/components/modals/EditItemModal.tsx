import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme, Category, GroceryItem } from '../types';
import { EXPO_PUBLIC_BACKEND_URL } from '../constants';

interface Props {
  visible: boolean;
  theme: Theme;
  categories: Category[];
  item: GroceryItem | null;
  onItemUpdated: (item: GroceryItem) => void;
  onRequestDelete: (item: GroceryItem) => void;
  onClose: () => void;
}

export function EditItemModal({ visible, theme, categories, item, onItemUpdated, onRequestDelete, onClose }: Props) {
  const { sessionToken } = useAuth();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('Other');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(String(item.quantity));
      setCategory(item.category);
    }
  }, [item]);

  const handleUpdate = async () => {
    if (!item || !name.trim() || !sessionToken) return;
    setUpdating(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ name: name.trim(), quantity: parseInt(quantity) || 1, category }),
      });
      if (res.ok) {
        const updated = await res.json();
        onItemUpdated(updated);
        onClose();
      }
    } catch (e) { console.error(e); }
    setUpdating(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Edit Item</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-edit-item-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            value={name}
            onChangeText={setName}
            data-testid="edit-item-name-input"
          />

          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]}
              onPress={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
            >
              <Ionicons name="remove" size={24} color={theme.text} />
            </TouchableOpacity>
            <TextInput
              style={[styles.qtyInput, { backgroundColor: theme.inputBg, color: theme.text }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]}
              onPress={() => setQuantity(String(parseInt(quantity || '0') + 1))}
            >
              <Ionicons name="add" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, { borderColor: cat.color }, category === cat.name && { backgroundColor: cat.color }]}
                onPress={() => setCategory(cat.name)}
              >
                <Ionicons name={cat.icon as any} size={16} color={category === cat.name ? '#fff' : cat.color} />
                <Text style={[styles.categoryChipText, { color: category === cat.name ? '#fff' : cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || updating) && modalStyles.primaryButtonDisabled]}
            onPress={handleUpdate}
            disabled={!name.trim() || updating}
            data-testid="edit-item-submit-btn"
          >
            {updating ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.primaryButtonText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteRow}
            onPress={() => { onClose(); if (item) onRequestDelete(item); }}
            data-testid="edit-item-delete-btn"
          >
            <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
            <Text style={styles.deleteRowText}>Delete Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { width: 60, height: 44, borderRadius: 10, fontSize: 18, fontWeight: '600' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 2, marginRight: 8, gap: 4 },
  categoryChipText: { fontSize: 14, fontWeight: '500' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  deleteRowText: { color: '#ff6b6b', fontWeight: '500' },
});
