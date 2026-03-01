import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme, ShoppingList } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onListCreated: (list: ShoppingList) => void;
}

export function CreateListModal({ visible, theme, onClose, onListCreated }: Props) {
  const { createList, lists, templates } = useAuth();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'blank' | 'copy' | 'template'>('blank');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCopyListId, setSelectedCopyListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const list = await createList(
        name.trim(),
        mode === 'copy' ? selectedCopyListId || undefined : undefined,
        mode === 'template' ? selectedTemplateId || undefined : undefined,
      );
      setName('');
      setMode('blank');
      onListCreated(list as unknown as ShoppingList);
      onClose();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const modeOptions = [
    { mode: 'blank', label: 'Blank', icon: 'add-outline' },
    { mode: 'template', label: 'Template', icon: 'document-outline' },
    { mode: 'copy', label: 'Copy List', icon: 'copy-outline' },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>New Shopping List</Text>
            <TouchableOpacity onPress={onClose} testID="close-create-list-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>List Name</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="e.g., Weekly Groceries"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            testID="create-list-name-input"
          />

          <Text style={[modalStyles.inputLabel, { color: theme.textSecondary }]}>Create From</Text>
          <View style={styles.modeOptions}>
            {modeOptions.map(opt => (
              <TouchableOpacity
                key={opt.mode}
                style={[styles.modeOption, mode === opt.mode && styles.modeOptionActive]}
                onPress={() => setMode(opt.mode)}
                testID={`create-mode-${opt.mode}`}
              >
                <Ionicons name={opt.icon as any} size={24} color={mode === opt.mode ? '#fff' : '#4CAF50'} />
                <Text style={[styles.modeText, mode === opt.mode && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'template' && templates.length > 0 && (
            <ScrollView horizontal style={{ marginBottom: 16 }}>
              {templates.map(tpl => (
                <TouchableOpacity
                  key={tpl.list_id}
                  style={[styles.templateOption, selectedTemplateId === tpl.list_id && styles.templateOptionActive]}
                  onPress={() => setSelectedTemplateId(tpl.list_id)}
                >
                  <Text style={styles.templateOptionText}>{tpl.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {mode === 'copy' && lists.length > 0 && (
            <ScrollView horizontal style={{ marginBottom: 16 }}>
              {lists.map(lst => (
                <TouchableOpacity
                  key={lst.list_id}
                  style={[styles.templateOption, selectedCopyListId === lst.list_id && styles.templateOptionActive]}
                  onPress={() => setSelectedCopyListId(lst.list_id)}
                >
                  <Text style={styles.templateOptionText}>{lst.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || loading) && modalStyles.primaryButtonDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
            testID="create-list-submit-btn"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.primaryButtonText}>Create List</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  modeOptions: { flexDirection: 'row' as const, gap: 12, marginBottom: 16 },
  modeOption: { flex: 1, alignItems: 'center' as const, paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#4CAF50', gap: 4 },
  modeOptionActive: { backgroundColor: '#4CAF50' },
  modeText: { fontSize: 12, fontWeight: '600' as const, color: '#4CAF50' },
  templateOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#9C27B0', marginRight: 8 },
  templateOptionActive: { backgroundColor: '#9C27B0' },
  templateOptionText: { color: '#9C27B0' },
};
