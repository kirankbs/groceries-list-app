import React from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import type { Theme, FontMap, Workspace } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onClose: () => void;
  onSelect: (ws: Workspace) => void;
  onCreateNew: () => void;
  onJoin: () => void;
  onInvite: (ws: Workspace) => void;
  onSettings: (ws: Workspace) => void;
}

export default function HouseholdSwitcherModal({
  visible, theme, font, workspaces, currentWorkspace,
  onClose, onSelect, onCreateNew, onJoin, onInvite, onSettings,
}: Props) {
  const isCurrent = (ws: Workspace) =>
    currentWorkspace?.workspace_id === ws.workspace_id;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>Households</Text>
            <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={workspaces}
            keyExtractor={w => w.workspace_id}
            renderItem={({ item: ws }) => (
              <View
                style={[
                  styles.wsItem,
                  {
                    backgroundColor: isCurrent(ws) ? PALETTE.sage + '12' : 'transparent',
                    borderColor: isCurrent(ws) ? PALETTE.sage + '30' : theme.border,
                  },
                ]}
              >
                <TouchableOpacity style={styles.wsMain} onPress={() => onSelect(ws)}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor:
                          ws.type === 'personal' ? PALETTE.sage + '20' : PALETTE.terracotta + '20',
                      },
                    ]}
                  >
                    <Ionicons
                      name={ws.type === 'personal' ? 'person' : 'people'}
                      size={18}
                      color={ws.type === 'personal' ? PALETTE.sage : PALETTE.terracotta}
                    />
                  </View>
                  <View style={styles.wsInfo}>
                    <Text style={[styles.wsName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                      {ws.name}
                    </Text>
                    <Text style={[styles.wsMeta, { color: theme.textSecondary, fontFamily: font.body }]}>
                      {ws.type === 'personal' ? 'Personal' : `${ws.members?.length || 1} members`}
                    </Text>
                  </View>
                  {isCurrent(ws) && <Ionicons name="checkmark-circle" size={22} color={PALETTE.sage} />}
                </TouchableOpacity>

                {ws.type === 'shared' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: PALETTE.sage + '12' }]}
                      onPress={() => onInvite(ws)}
                    >
                      <Ionicons name="share-outline" size={16} color={PALETTE.sage} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.inputBg }]}
                      onPress={() => onSettings(ws)}
                    >
                      <Ionicons name="settings-outline" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />

          <View style={styles.bottomRow}>
            <TouchableOpacity style={[styles.bottomBtn, { borderColor: PALETTE.sage }]} onPress={onCreateNew}>
              <Ionicons name="add-circle-outline" size={20} color={PALETTE.sage} />
              <Text style={[styles.bottomBtnText, { color: PALETTE.sage, fontFamily: font.bodySemiBold }]}>
                Create
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bottomBtn, { borderColor: PALETTE.terracotta }]} onPress={onJoin}>
              <Ionicons name="enter-outline" size={20} color={PALETTE.terracotta} />
              <Text style={[styles.bottomBtnText, { color: PALETTE.terracotta, fontFamily: font.bodySemiBold }]}>
                Join
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  wsMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  wsInfo: { flex: 1 },
  wsName: { fontSize: 15 },
  wsMeta: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  bottomBtnText: { fontSize: 14 },
});
