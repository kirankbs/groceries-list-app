import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, Share, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from '../sharedStyles';
import type { FontMap, Workspace } from '../types';
import { useTheme } from '../ThemeContext';

interface Props {
  visible: boolean;
  font: FontMap;
  household: Workspace | null;
  userId: string | undefined;
  onClose: () => void;
  onInvite: () => void;
  onDelete: () => void;
  onLeave: () => void;
}

function formatInviteCode(raw: string): string {
  // Normalise to XXXX-XXXX if not already formatted
  const clean = raw.replace(/-/g, '');
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return raw;
}

function formatEstDate(isoString: string | undefined): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function HouseholdDetailsModal({
  visible, font, household, userId, onClose, onInvite, onDelete, onLeave,
}: Props) {
  const { theme } = useTheme();

  if (!household) return null;

  const isOwner = household.owner_id === userId;
  const estDate = formatEstDate(household.created_at);
  const memberCount = household.members?.length ?? household.member_ids?.length ?? 1;
  const displayCode = household.invite_code ? formatInviteCode(household.invite_code) : null;

  const handleCopyCode = async () => {
    if (!displayCode) return;
    try {
      await Share.share({ message: displayCode });
    } catch {
      // ignore user cancel
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <ScrollView
          style={{ maxHeight: '90%' }}
          contentContainerStyle={[styles.content, { backgroundColor: theme.surface }]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Close button */}
          <View style={styles.closeBtnRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceContainer }]}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Household header */}
          <View style={styles.householdHeader}>
            <View style={[styles.householdIconCircle, { backgroundColor: theme.primary }]}>
              <Ionicons name="home" size={32} color="#fff" />
            </View>
            <Text style={[styles.householdName, { color: theme.text, fontFamily: font.display }]} numberOfLines={2}>
              {household.name}
            </Text>
            {estDate && (
              <Text style={[styles.estDate, { color: theme.textSecondary, fontFamily: font.body }]}>
                Est. {estDate}
              </Text>
            )}
            <View style={[styles.memberBadge, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="people" size={13} color={theme.primary} />
              <Text style={[styles.memberBadgeText, { color: theme.primary, fontFamily: font.bodySemiBold }]}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>

          {/* Invite code card */}
          {displayCode && (
            <View style={[styles.inviteCard, { backgroundColor: theme.surfaceContainer }]}>
              <Text style={[styles.inviteCardTitle, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
                INVITE NEW PANTRY KEEPERS
              </Text>
              <Text style={[styles.inviteCode, { color: theme.text, fontFamily: font.bodyBold }]}>
                {displayCode}
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: theme.primary }]}
                onPress={handleCopyCode}
              >
                <Ionicons name="share-social-outline" size={16} color="#fff" />
                <Text style={[styles.copyBtnText, { fontFamily: font.bodySemiBold }]}>
                  Share Code
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Members list */}
          {household.members && household.members.length > 0 && (
            <View style={styles.membersSection}>
              <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
                HOUSEHOLD MEMBERS
              </Text>
              {household.members.map(m => {
                const initial = (m.name || m.email || '?')[0].toUpperCase();
                const memberIsOwner = m.user_id === household.owner_id;
                return (
                  <View key={m.user_id} style={[styles.memberRow, { borderBottomColor: theme.outlineVariant }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.memberAvatarText, { color: theme.primary, fontFamily: font.bodyBold }]}>
                        {initial}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                        {m.name || m.email}
                      </Text>
                      {m.email && m.name && (
                        <Text style={[styles.memberEmail, { color: theme.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
                          {m.email}
                        </Text>
                      )}
                    </View>
                    <View style={[
                      styles.roleBadge,
                      { backgroundColor: memberIsOwner ? theme.primary + '15' : theme.surfaceContainer },
                    ]}>
                      <Text style={[
                        styles.roleBadgeText,
                        { color: memberIsOwner ? theme.primary : theme.textSecondary, fontFamily: font.bodySemiBold },
                      ]}>
                        {memberIsOwner ? 'Owner' : 'Member'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsSection}>
            {/* Leave household (non-owners only) */}
            {!isOwner && (
              <TouchableOpacity
                style={[styles.leaveBtn, { borderColor: theme.error }]}
                onPress={onLeave}
              >
                <Ionicons name="exit-outline" size={18} color={theme.error} />
                <Text style={[styles.leaveBtnText, { color: theme.error, fontFamily: font.bodySemiBold }]}>
                  Leave Household
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete household (owner only) */}
            {isOwner && (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: theme.error }]}
                onPress={onDelete}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={[styles.deleteBtnText, { fontFamily: font.bodyBold }]}>
                  Delete Household
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  closeBtnRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Household header
  householdHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  householdIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  householdName: {
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 4,
  },
  estDate: {
    fontSize: 13,
    marginBottom: 10,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  memberBadgeText: {
    fontSize: 13,
  },

  // Invite card
  inviteCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  inviteCardTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inviteCode: {
    fontSize: 28,
    letterSpacing: 6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 14,
  },

  // Members
  membersSection: {
    marginBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
  },

  // Actions
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  leaveBtnText: {
    fontSize: 15,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 15,
  },
});
