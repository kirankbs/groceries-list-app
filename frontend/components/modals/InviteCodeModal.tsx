import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from '../sharedStyles';
import { useTheme } from '../ThemeContext';
import { FontMap } from '../types';

type Props = {
  visible: boolean;
  font: FontMap;
  inviteCode: string;
  onClose: () => void;
};

export default function InviteCodeModal({ visible, font, inviteCode, onClose }: Props) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={[modalStyles.centeredIcon, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="share-social" size={36} color={theme.primary} />
          </View>
          <Text style={[modalStyles.centeredTitle, { color: theme.text, fontFamily: font.serif }]}>Invite Code</Text>
          <Text testID="invite-code-display" style={[styles.codeDisplay, { color: theme.text, backgroundColor: theme.inputBg, fontFamily: font.serifMedium }]}>
            {inviteCode}
          </Text>
          <Text style={[modalStyles.centeredMsg, { color: theme.textSecondary, fontFamily: font.body }]}>
            Share this code to invite members
          </Text>
          <TouchableOpacity style={modalStyles.primaryButton} onPress={onClose}>
            <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  codeDisplay: {
    fontSize: 22,
    letterSpacing: 3,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
});
