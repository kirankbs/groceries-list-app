import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import { Theme, FontMap, Workspace } from '../types';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  onClose: () => void;
  onJoined: (workspace: Workspace) => void;
};

export default function JoinHouseholdModal({ visible, theme, font, onClose, onJoined }: Props) {
  const { joinWorkspace } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const workspace = await joinWorkspace(code.trim());
      setCode('');
      onJoined(workspace);
      onClose();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setCode('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>Join Household</Text>
            <TouchableOpacity onPress={handleClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>Invite Code</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, fontFamily: font.body }]}
            placeholder="Enter 8-character code"
            placeholderTextColor={PALETTE.sand}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[modalStyles.primaryButton, (!code.trim() || loading) && modalStyles.buttonDisabled]}
            onPress={handleJoin}
            disabled={!code.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color={PALETTE.cream} />
              : <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>Join Household</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
