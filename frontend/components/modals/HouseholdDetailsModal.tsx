import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import type { Theme, FontMap, Workspace } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  household: Workspace | null;
  userId: string | undefined;
  onClose: () => void;
  onInvite: () => void;
  onDelete: () => void;
  onLeave: () => void;
}

export default function HouseholdDetailsModal({
  visible, theme, font, household, userId, onClose, onInvite, onDelete, onLeave,
}: Props) {
  if (!household) return null;

  const isOwner = household.owner_id === userId;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.inputBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: PALETTE.terracotta + '18' }]}>
              <Ionicons name="people" size={24} color={PALETTE.terracotta} />
            </View>
            <Text style={[styles.infoName, { color: theme.text, fontFamily: font.serifMedium }]}>
              {household.name}
            </Text>
            <Text style={{ color: theme.textSecondary, fontFamily: font.body, fontSize: 14, marginTop: 2 }}>
              {household.members?.length || 1} members
            </Text>
          </View>

          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold, marginTop: 16 }]}>
            Members
          </Text>
          {household.members?.map(m => (
            <View key={m.user_id} style={styles.memberRow}>
              {m.picture ? (
                <Image source={{ uri: m.picture }} style={styles.memberAvatar} />
              ) : (
                <View style={[styles.memberAvatarPlaceholder, { backgroundColor: PALETTE.terracotta + '15' }]}>
                  <Ionicons name="person" size={16} color={PALETTE.terracotta} />
                </View>
              )}
              <Text style={[styles.memberName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                {m.name}
              </Text>
              {m.user_id === household.owner_id && (
                <View style={styles.ownerBadge}>
                  <Text style={[styles.ownerBadgeText, { fontFamily: font.bodySemiBold }]}>Owner</Text>
                </View>
              )}
            </View>
          ))}

          <View style={{ marginTop: 20, gap: 10 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: PALETTE.sage + '12' }]}
              onPress={onInvite}
            >
              <Ionicons name="share-outline" size={18} color={PALETTE.sage} />
              <Text style={{ color: PALETTE.sage, fontFamily: font.bodySemiBold, fontSize: 15 }}>
                Invite People
              </Text>
            </TouchableOpacity>

            {isOwner ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: PALETTE.rust + '10' }]}
                onPress={onDelete}
              >
                <Ionicons name="trash-outline" size={18} color={PALETTE.rust} />
                <Text style={{ color: PALETTE.rust, fontFamily: font.bodySemiBold, fontSize: 15 }}>
                  Delete Household
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: PALETTE.rust + '10' }]}
                onPress={onLeave}
              >
                <Ionicons name="exit-outline" size={18} color={PALETTE.rust} />
                <Text style={{ color: PALETTE.rust, fontFamily: font.bodySemiBold, fontSize: 15 }}>
                  Leave Household
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  infoCard: { alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 8 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  infoName: { fontSize: 18, marginTop: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  memberName: { flex: 1, fontSize: 14 },
  ownerBadge: { backgroundColor: PALETTE.sage + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ownerBadgeText: { fontSize: 11, color: PALETTE.sage },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
});
