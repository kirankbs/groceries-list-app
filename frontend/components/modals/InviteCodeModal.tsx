import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from '../sharedStyles';
import { Theme } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  code: string;
  onClose: () => void;
}

export function InviteCodeModal({ visible, theme, code, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#4CAF5020' }]}>
            <Ionicons name="share-social" size={40} color="#4CAF50" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Invite Code</Text>
          <Text style={[styles.code, { color: theme.text, backgroundColor: theme.inputBg }]}>{code}</Text>
          <Text style={[styles.msg, { color: theme.textSecondary }]}>Share this code to invite members</Text>
          <TouchableOpacity
            style={modalStyles.primaryButton}
            onPress={onClose}
            data-testid="invite-code-done-btn"
          >
            <Text style={modalStyles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  iconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold' as const, marginBottom: 12 },
  code: { fontSize: 24, fontWeight: 'bold' as const, letterSpacing: 2, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 12 },
  msg: { fontSize: 14, textAlign: 'center' as const, marginBottom: 20 },
};
