import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import { useTheme } from '../ThemeContext';
import type { FontMap, Workspace } from '../types';

interface User {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

interface Props {
  visible: boolean;
  font: FontMap;
  user: User | null;
  currentWorkspace: Workspace | null;
  onClose: () => void;
  onInvite: () => void;
  onLeave: () => void;
  onLogout: () => void;
}

export default function ProfileModal({
  visible, font, user, currentWorkspace,
  onClose, onInvite, onLeave, onLogout,
}: Props) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>Profile</Text>
            <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: PALETTE.terracotta + '15', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={36} color={PALETTE.terracotta} />
              </View>
            )}
            <Text style={[styles.name, { color: theme.text, fontFamily: font.serif }]}>{user?.name}</Text>
            <Text style={{ color: theme.textSecondary, fontFamily: font.body, fontSize: 14 }}>{user?.email}</Text>
          </View>

          {currentWorkspace?.type === 'shared' && (
            <View style={[styles.wsCard, { backgroundColor: theme.inputBg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Ionicons name="people" size={20} color={PALETTE.terracotta} />
                <Text style={{ color: theme.text, fontFamily: font.serifMedium, fontSize: 16 }}>
                  {currentWorkspace.name}
                </Text>
              </View>
              {currentWorkspace.members?.map(m => (
                <View key={m.user_id} style={styles.memberRow}>
                  {m.picture ? (
                    <Image source={{ uri: m.picture }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatarPlaceholder, { backgroundColor: PALETTE.terracotta + '15' }]}>
                      <Ionicons name="person" size={14} color={PALETTE.terracotta} />
                    </View>
                  )}
                  <Text style={[styles.memberName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                    {m.name}
                  </Text>
                  {m.user_id === currentWorkspace.owner_id && (
                    <View style={styles.ownerBadge}>
                      <Text style={[styles.ownerBadgeText, { fontFamily: font.bodySemiBold }]}>Owner</Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[styles.cardBtn, { borderColor: PALETTE.sage }]} onPress={onInvite}>
                  <Ionicons name="share-outline" size={18} color={PALETTE.sage} />
                  <Text style={{ color: PALETTE.sage, fontFamily: font.bodySemiBold }}>Invite</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cardBtn, { borderColor: PALETTE.rust }]} onPress={onLeave}>
                  <Ionicons name="exit-outline" size={18} color={PALETTE.rust} />
                  <Text style={{ color: PALETTE.rust, fontFamily: font.bodySemiBold }}>Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color={PALETTE.rust} />
            <Text style={{ color: PALETTE.rust, fontFamily: font.bodySemiBold }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  profileInfo: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  name: { fontSize: 20, marginBottom: 2 },
  wsCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  memberName: { flex: 1, fontSize: 14 },
  ownerBadge: { backgroundColor: PALETTE.sage + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ownerBadgeText: { fontSize: 11, color: PALETTE.sage },
  cardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
});
