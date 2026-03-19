import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EXPO_PUBLIC_BACKEND_URL, PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import { Theme, FontMap, GroceryItem } from '../types';

type Props = {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  sessionToken: string | null;
  item: GroceryItem | null;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteItemModal({
  visible, theme, font, sessionToken, item, onClose, onDeleted,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${item.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        onDeleted();
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={[modalStyles.centeredIcon, { backgroundColor: PALETTE.rust + '15' }]}>
            <Ionicons name="trash" size={36} color={PALETTE.rust} />
          </View>
          <Text style={[modalStyles.centeredTitle, { color: theme.text, fontFamily: font.serif }]}>Delete Item?</Text>
          <Text style={[modalStyles.centeredMsg, { color: theme.textSecondary, fontFamily: font.body }]}>
            "{item?.name}"
          </Text>
          <View style={modalStyles.centeredButtons}>
            <TouchableOpacity style={[modalStyles.centeredBtn, { backgroundColor: theme.inputBg }]} onPress={onClose}>
              <Text style={{ color: theme.text, fontFamily: font.bodySemiBold, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.centeredBtn, { backgroundColor: PALETTE.rust }]}
              onPress={handleDelete}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontFamily: font.bodySemiBold, fontSize: 15 }}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
