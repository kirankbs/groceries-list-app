import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme, Workspace } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onJoined: (ws: Workspace) => void;
}

export function JoinHouseholdModal({ visible, theme, onClose, onJoined }: Props) {
  const { joinWorkspace } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const ws = await joinWorkspace(inviteCode.trim());
      setInviteCode('');
      onJoined(ws as unknown as Workspace);
      onClose();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Join Household</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-join-household-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Invite Code</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Enter invite code"
            placeholderTextColor={theme.textSecondary}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="none"
            data-testid="join-household-code-input"
          />
          <TouchableOpacity
            style={[modalStyles.primaryButton, (!inviteCode.trim() || loading) && modalStyles.primaryButtonDisabled]}
            onPress={handleJoin}
            disabled={!inviteCode.trim() || loading}
            data-testid="join-household-submit-btn"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.primaryButtonText}>Join Household</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
