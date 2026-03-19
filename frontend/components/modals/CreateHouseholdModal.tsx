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
  onCreated: (workspace: Workspace) => void;
};

export default function CreateHouseholdModal({ visible, theme, font, onClose, onCreated }: Props) {
  const { createWorkspace } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const workspace = await createWorkspace(name.trim());
      setName('');
      onCreated(workspace);
      onClose();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>New Household</Text>
            <TouchableOpacity onPress={handleClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>Household Name</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, fontFamily: font.body }]}
            placeholder="e.g., The Smiths"
            placeholderTextColor={PALETTE.sand}
            value={name}
            onChangeText={setName}
          />

          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || loading) && modalStyles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color={PALETTE.cream} />
              : <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>Create Household</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
