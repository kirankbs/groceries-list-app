import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onInvite: () => void;
}

export function ProfileModal({ visible, theme, onClose, onInvite }: Props) {
  const { user, currentWorkspace, logout, leaveWorkspace } = useAuth();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Profile</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-profile-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            {user?.picture
              ? <Image source={{ uri: user.picture }} style={styles.profileLargeImage} />
              : <Ionicons name="person-circle" size={80} color={theme.textSecondary} />
            }
            <Text style={[styles.profileName, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          </View>

          {currentWorkspace?.type === 'shared' && (
            <View style={[styles.workspaceCard, { backgroundColor: theme.inputBg }]}>
              <View style={styles.workspaceCardHeader}>
                <Ionicons name="people" size={24} color="#4CAF50" />
                <Text style={[styles.workspaceCardTitle, { color: theme.text }]}>{currentWorkspace.name}</Text>
              </View>
              {currentWorkspace.members?.map(m => (
                <View key={m.user_id} style={modalStyles.memberRow}>
                  {m.picture
                    ? <Image source={{ uri: m.picture }} style={modalStyles.memberAvatar} />
                    : <Ionicons name="person-circle" size={32} color={theme.textSecondary} />
                  }
                  <Text style={[modalStyles.memberName, { color: theme.text }]}>{m.name}</Text>
                  {m.user_id === currentWorkspace.owner_id && (
                    <View style={modalStyles.ownerBadge}>
                      <Text style={modalStyles.ownerBadgeText}>Owner</Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={styles.workspaceCardActions}>
                <TouchableOpacity
                  style={styles.workspaceCardBtn}
                  onPress={onInvite}
                  data-testid="profile-invite-btn"
                >
                  <Ionicons name="share-outline" size={20} color="#4CAF50" />
                  <Text style={styles.workspaceCardBtnText}>Invite</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.workspaceCardBtn, { borderColor: '#ff6b6b' }]}
                  onPress={() => currentWorkspace && leaveWorkspace(currentWorkspace.workspace_id)}
                  data-testid="profile-leave-btn"
                >
                  <Ionicons name="exit-outline" size={20} color="#ff6b6b" />
                  <Text style={[styles.workspaceCardBtnText, { color: '#ff6b6b' }]}>Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            data-testid="logout-btn"
          >
            <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  profileInfo: { alignItems: 'center' as const, marginBottom: 20 },
  profileLargeImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: 'bold' as const },
  profileEmail: { fontSize: 14 },
  workspaceCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  workspaceCardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 12 },
  workspaceCardTitle: { fontSize: 16, fontWeight: '600' as const },
  workspaceCardActions: { flexDirection: 'row' as const, gap: 12, marginTop: 12 },
  workspaceCardBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#4CAF50', gap: 6 },
  workspaceCardBtnText: { color: '#4CAF50', fontWeight: '500' as const },
  logoutBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, gap: 8 },
  logoutBtnText: { color: '#ff6b6b', fontWeight: '500' as const },
};
