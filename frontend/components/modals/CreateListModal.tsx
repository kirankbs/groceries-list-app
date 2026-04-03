import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from '../sharedStyles';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import type { FontMap, ShoppingList } from '../types';

interface Props {
  visible: boolean;
  font: FontMap;
  templates: ShoppingList[];
  lists: ShoppingList[];
  onClose: () => void;
  onCreated: (list: ShoppingList) => void;
}

type CreateMode = 'blank' | 'template' | 'copy';

const MODE_OPTIONS: { mode: CreateMode; label: string; icon: string }[] = [
  { mode: 'blank', label: 'Blank', icon: 'add-outline' },
  { mode: 'template', label: 'Template', icon: 'document-outline' },
  { mode: 'copy', label: 'Copy', icon: 'copy-outline' },
];

export default function CreateListModal({
  visible, font, templates, lists, onClose, onCreated,
}: Props) {
  const { theme } = useTheme();
  const { createList } = useAuth();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<CreateMode>('blank');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCopyListId, setSelectedCopyListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setName('');
    setMode('blank');
    setSelectedTemplateId(null);
    setSelectedCopyListId(null);
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const copyId = mode === 'copy' ? selectedCopyListId || undefined : undefined;
      const templateId = mode === 'template' ? selectedTemplateId || undefined : undefined;
      const newList = await createList(name.trim(), copyId, templateId);
      setName('');
      setMode('blank');
      setSelectedTemplateId(null);
      setSelectedCopyListId(null);
      onCreated(newList);
    } catch {
      // handled upstream
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>New List</Text>
            <TouchableOpacity onPress={resetAndClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
            List Name
          </Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, fontFamily: font.body }]}
            placeholder="e.g., Weekly Groceries"
            placeholderTextColor={theme.outline}
            value={name}
            onChangeText={setName}
          />

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
            Create From
          </Text>
          <View style={styles.modeRow}>
            {MODE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  styles.modeOption,
                  { borderColor: mode === opt.mode ? theme.tertiary : theme.border },
                  mode === opt.mode && { backgroundColor: theme.tertiary },
                ]}
                onPress={() => setMode(opt.mode)}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={22}
                  color={mode === opt.mode ? '#fff' : theme.tertiary}
                />
                <Text
                  style={[
                    styles.modeText,
                    { fontFamily: font.bodySemiBold, color: theme.tertiary },
                    mode === opt.mode && { color: '#fff' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'template' && templates.length > 0 && (
            <ScrollView horizontal style={{ marginBottom: 16 }}>
              {templates.map(tpl => (
                <TouchableOpacity
                  key={tpl.list_id}
                  style={[
                    styles.selectorChip,
                    { borderColor: theme.tertiary },
                    selectedTemplateId === tpl.list_id && { backgroundColor: theme.tertiary },
                  ]}
                  onPress={() => setSelectedTemplateId(tpl.list_id)}
                >
                  <Text
                    style={{
                      fontFamily: font.bodyMedium,
                      color: selectedTemplateId === tpl.list_id ? '#fff' : theme.tertiary,
                    }}
                  >
                    {tpl.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {mode === 'copy' && lists.length > 0 && (
            <ScrollView horizontal style={{ marginBottom: 16 }}>
              {lists.map(lst => (
                <TouchableOpacity
                  key={lst.list_id}
                  style={[
                    styles.selectorChip,
                    { borderColor: theme.tertiary },
                    selectedCopyListId === lst.list_id && { backgroundColor: theme.tertiary },
                  ]}
                  onPress={() => setSelectedCopyListId(lst.list_id)}
                >
                  <Text
                    style={{
                      fontFamily: font.bodyMedium,
                      color: selectedCopyListId === lst.list_id ? '#fff' : theme.tertiary,
                    }}
                  >
                    {lst.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || loading) && modalStyles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>Create List</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  modeText: { fontSize: 12 },
  selectorChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
});
