import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme, Workspace } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onCreateClick: () => void;
  onJoinClick: () => void;
  onShowInvite: (ws: Workspace) => void;
  onShowSettings: (ws: Workspace) => void;
}

export function HouseholdSwitcherModal({ visible, theme, onClose, onCreateClick, onJoinClick, onShowInvite, onShowSettings }: Props) {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useAuth();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Households</Text>
            <TouchableOpacity onPress={onClose} testID="close-household-switcher">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={workspaces as Workspace[]}
            keyExtractor={w => w.workspace_id}
            renderItem={({ item: ws }) => (
              <View style={[styles.workspaceItem, { backgroundColor: currentWorkspace?.workspace_id === ws.workspace_id ? '#4CAF5020' : 'transparent' }]}>
                <TouchableOpacity
                  style={styles.workspaceItemMain}
                  onPress={() => { setCurrentWorkspace(ws as any); onClose(); }}
                  testID={`household-item-${ws.workspace_id}`}
                >
                  <Ionicons name={ws.type === 'personal' ? 'person' : 'people'} size={24} color={ws.type === 'personal' ? '#2196F3' : '#4CAF50'} />
                  <View style={styles.workspaceItemInfo}>
                    <Text style={[styles.workspaceItemName, { color: theme.text }]}>{ws.name}</Text>
                    <Text style={[styles.workspaceItemMeta, { color: theme.textSecondary }]}>
                      {ws.type === 'personal' ? 'Personal' : `${ws.members?.length || 1} members`}
                    </Text>
                  </View>
                  {currentWorkspace?.workspace_id === ws.workspace_id && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                </TouchableOpacity>
                {ws.type === 'shared' && (
                  <View style={styles.workspaceItemActions}>
                    <TouchableOpacity
                      style={styles.workspaceItemActionBtn}
                      onPress={() => onShowInvite(ws)}
                      testID={`household-invite-${ws.workspace_id}`}
                    >
                      <Ionicons name="share-outline" size={18} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.workspaceItemActionBtn}
                      onPress={() => { onShowSettings(ws); onClose(); }}
                      testID={`household-settings-${ws.workspace_id}`}
                    >
                      <Ionicons name="settings-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />

          <View style={styles.workspaceActions}>
            <TouchableOpacity
              style={styles.workspaceActionBtn}
              onPress={() => { onClose(); onCreateClick(); }}
              testID="create-household-btn"
            >
              <Ionicons name="add-circle-outline" size={22} color="#4CAF50" />
              <Text style={styles.workspaceActionText}>Create Household</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.workspaceActionBtn, { borderColor: '#2196F3' }]}
              onPress={() => { onClose(); onJoinClick(); }}
              testID="join-household-btn"
            >
              <Ionicons name="enter-outline" size={22} color="#2196F3" />
              <Text style={[styles.workspaceActionText, { color: '#2196F3' }]}>Join Household</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  workspaceItem: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, gap: 12 },
  workspaceItemMain: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  workspaceItemInfo: { flex: 1 },
  workspaceItemName: { fontSize: 16, fontWeight: '500' as const },
  workspaceItemMeta: { fontSize: 13 },
  workspaceItemActions: { flexDirection: 'row' as const, gap: 4 },
  workspaceItemActionBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(0,0,0,0.05)' },
  workspaceActions: { flexDirection: 'row' as const, gap: 12, marginTop: 16 },
  workspaceActionBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#4CAF50', gap: 6 },
  workspaceActionText: { color: '#4CAF50', fontWeight: '600' as const },
};
