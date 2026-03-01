import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from '../sharedStyles';
import { Theme, GroceryItem } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  item: GroceryItem | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteItemModal({ visible, theme, item, deleting, onClose, onConfirm }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="trash" size={40} color="#ff6b6b" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Delete Item?</Text>
          <Text style={[styles.msg, { color: theme.textSecondary }]}>"{item?.name}"</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.inputBg }]}
              onPress={onClose}
              testID="cancel-delete-item-btn"
            >
              <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#ff6b6b' }]}
              onPress={onConfirm}
              disabled={deleting}
              testID="confirm-delete-item-btn"
            >
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: '#fff' }]}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ff6b6b20', justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold' as const, marginBottom: 8 },
  msg: { fontSize: 14, textAlign: 'center' as const, marginBottom: 20 },
  buttons: { flexDirection: 'row' as const, gap: 12, width: '100%' as any },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' as const },
  btnText: { fontWeight: '600' as const },
};
