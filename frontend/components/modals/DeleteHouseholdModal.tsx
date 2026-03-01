import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme, Workspace } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  household: Workspace | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteHouseholdModal({ visible, theme, household, onClose, onDeleted }: Props) {
  const { deleteWorkspace } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!household) return;
    setLoading(true);
    try {
      await deleteWorkspace(household.workspace_id);
      onDeleted();
      onClose();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="trash" size={40} color="#ff6b6b" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Delete Household?</Text>
          <Text style={[styles.msg, { color: theme.textSecondary }]}>
            This will permanently delete "{household?.name}" and all its shopping lists.
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.inputBg }]}
              onPress={onClose}
              testID="cancel-delete-household-btn"
            >
              <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#ff6b6b' }]}
              onPress={handleDelete}
              disabled={loading}
              testID="confirm-delete-household-btn"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: '#fff' }]}>Delete</Text>}
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
