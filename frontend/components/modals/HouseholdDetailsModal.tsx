import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme, Workspace } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  selectedHousehold: Workspace | null;
  onClose: () => void;
  onInvite: (ws: Workspace) => void;
  onDeleteRequest: () => void;
}

export function HouseholdDetailsModal({ visible, theme, selectedHousehold, onClose, onInvite, onDeleteRequest }: Props) {
  const { user, leaveWorkspace } = useAuth();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Household Settings</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-household-details">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {selectedHousehold && (
            <>
              <View style={[styles.infoCard, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="people" size={32} color="#4CAF50" />
                <Text style={[styles.infoName, { color: theme.text }]}>{selectedHousehold.name}</Text>
                <Text style={[styles.infoMeta, { color: theme.textSecondary }]}>{selectedHousehold.members?.length || 1} members</Text>
              </View>

              <Text style={[modalStyles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>Members</Text>
              {selectedHousehold.members?.map(m => (
                <View key={m.user_id} style={modalStyles.memberRow}>
                  {m.picture
                    ? <Image source={{ uri: m.picture }} style={modalStyles.memberAvatar} />
                    : <Ionicons name="person-circle" size={32} color={theme.textSecondary} />
                  }
                  <Text style={[modalStyles.memberName, { color: theme.text }]}>{m.name}</Text>
                  {m.user_id === selectedHousehold.owner_id && (
                    <View style={modalStyles.ownerBadge}>
                      <Text style={modalStyles.ownerBadgeText}>Owner</Text>
                    </View>
                  )}
                </View>
              ))}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#4CAF5015' }]}
                  onPress={() => { onClose(); onInvite(selectedHousehold); }}
                  data-testid="household-details-invite-btn"
                >
                  <Ionicons name="share-outline" size={20} color="#4CAF50" />
                  <Text style={[styles.actionBtnText, { color: '#4CAF50' }]}>Invite People</Text>
                </TouchableOpacity>

                {selectedHousehold.owner_id === user?.user_id ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ff6b6b15' }]}
                    onPress={onDeleteRequest}
                    data-testid="household-details-delete-btn"
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                    <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>Delete Household</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ff6b6b15' }]}
                    onPress={() => { leaveWorkspace(selectedHousehold.workspace_id); onClose(); }}
                    data-testid="household-details-leave-btn"
                  >
                    <Ionicons name="exit-outline" size={20} color="#ff6b6b" />
                    <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>Leave Household</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  infoCard: { alignItems: 'center' as const, padding: 20, borderRadius: 12, marginBottom: 8 },
  infoName: { fontSize: 18, fontWeight: 'bold' as const, marginTop: 8 },
  infoMeta: { fontSize: 14, marginTop: 4 },
  actions: { marginTop: 20, gap: 12 },
  actionBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { fontSize: 16, fontWeight: '600' as const },
};
