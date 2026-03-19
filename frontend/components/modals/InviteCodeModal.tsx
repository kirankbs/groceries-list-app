import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import { Theme, FontMap } from '../types';

type Props = {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  inviteCode: string;
  onClose: () => void;
};

export default function InviteCodeModal({ visible, theme, font, inviteCode, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={[modalStyles.centeredIcon, { backgroundColor: PALETTE.sage + '18' }]}>
            <Ionicons name="share-social" size={36} color={PALETTE.sage} />
          </View>
          <Text style={[modalStyles.centeredTitle, { color: theme.text, fontFamily: font.serif }]}>Invite Code</Text>
          <Text style={[styles.codeDisplay, { color: theme.text, backgroundColor: theme.inputBg, fontFamily: font.serifMedium }]}>
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
