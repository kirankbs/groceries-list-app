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
  onCreated: (ws: Workspace) => void;
}

export function CreateHouseholdModal({ visible, theme, onClose, onCreated }: Props) {
  const { createWorkspace } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const ws = await createWorkspace(name.trim());
      setName('');
      onCreated(ws as unknown as Workspace);
      onClose();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>New Household</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-create-household-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Household Name</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="e.g., My Family, Roommates..."
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            data-testid="create-household-name-input"
          />
          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || loading) && modalStyles.primaryButtonDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
            data-testid="create-household-submit-btn"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.primaryButtonText}>Create Household</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
