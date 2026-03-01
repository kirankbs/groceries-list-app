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
  onItemAdded: (item: GroceryItem) => void;
  onListUpdated: () => void;
  onClose: () => void;
}

export function AddItemModal({ visible, theme, categories, onItemAdded, onListUpdated, onClose }: Props) {
  const { sessionToken, currentList } = useAuth();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('Other');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setQuantity('1');
      setCategory('Other');
    }
  }, [visible]);

  const handleAdd = async () => {
    if (!name.trim() || !currentList || !sessionToken) return;
    setAdding(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({
          list_id: currentList.list_id,
          name: name.trim(),
          quantity: parseInt(quantity) || 1,
          category,
        }),
      });
      if (res.ok) {
        const item = await res.json();
        onItemAdded(item);
        onListUpdated();
        onClose();
      }
    } catch (e) { console.error(e); }
    setAdding(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Add Item</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-add-item-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="e.g., Milk, Bread..."
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            data-testid="add-item-name-input"
          />

          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]}
              onPress={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
              data-testid="decrease-quantity-btn"
            >
              <Ionicons name="remove" size={24} color={theme.text} />
            </TouchableOpacity>
            <TextInput
              style={[styles.qtyInput, { backgroundColor: theme.inputBg, color: theme.text }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              textAlign="center"
              data-testid="quantity-input"
            />
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: theme.inputBg }]}
              onPress={() => setQuantity(String(parseInt(quantity || '0') + 1))}
              data-testid="increase-quantity-btn"
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
                data-testid={`category-chip-${cat.name}`}
              >
                <Ionicons name={cat.icon as any} size={16} color={category === cat.name ? '#fff' : cat.color} />
                <Text style={[styles.categoryChipText, { color: category === cat.name ? '#fff' : cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || adding) && modalStyles.primaryButtonDisabled]}
            onPress={handleAdd}
            disabled={!name.trim() || adding}
            data-testid="add-item-submit-btn"
          >
            {adding ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.primaryButtonText}>Add Item</Text>}
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
});
