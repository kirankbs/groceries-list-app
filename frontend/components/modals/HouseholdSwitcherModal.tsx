import React, { useCallback } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { PALETTE } from '../constants';
import type { FontMap, Workspace } from '../types';

interface Props {
  visible: boolean;
  font: FontMap;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onClose: () => void;
  onSelect: (ws: Workspace) => void;
  onCreateNew: () => void;
  onJoin: () => void;
}

export default function HouseholdSwitcherModal({
  visible, font, workspaces, currentWorkspace,
  onClose, onSelect, onCreateNew, onJoin,
}: Props) {
  const { theme } = useTheme();

  const isCurrent = (ws: Workspace) =>
    currentWorkspace?.workspace_id === ws.workspace_id;

  const renderItem = useCallback(({ item: ws }: { item: Workspace }) => {
    const active = isCurrent(ws);
    return (
      <TouchableOpacity
        style={[
          styles.wsRow,
          {
            backgroundColor: theme.background,
            borderColor: active ? theme.primary : theme.outlineVariant,
            borderWidth: active ? 2 : 1,
          },
        ]}
        onPress={() => onSelect(ws)}
        activeOpacity={0.75}
      >
        {/* Green square icon */}
        <View style={[styles.iconSquare, { backgroundColor: PALETTE.primary }]}>
          <Text style={[styles.iconInitial, { fontFamily: font.display }]}>
            {ws.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.wsInfo}>
          <Text style={[styles.wsName, { color: theme.text, fontFamily: font.display }]}>
            {ws.name}
          </Text>
          <Text style={[styles.wsType, { color: theme.textSecondary, fontFamily: font.body }]}>
            {ws.type === 'personal' ? 'Personal Household' : 'Shared Household'}
          </Text>
        </View>

        {/* Right indicator */}
        {active ? (
          <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={theme.outline} />
        )}
      </TouchableOpacity>
    );
  }, [currentWorkspace, onSelect, font, theme]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: theme.outline + '40' }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: font.display }]}>
              Switch Household
            </Text>
            <TouchableOpacity
              testID="household-switcher-close-btn"
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceContainer }]}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Household list */}
          <FlatList
            data={workspaces}
            keyExtractor={w => w.workspace_id}
            style={styles.list}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />

          {/* Bottom action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={onCreateNew}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={[styles.primaryBtnText, { fontFamily: font.bodySemiBold }]}>
                Create New Household
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: theme.primary }]}
              onPress={onJoin}
              activeOpacity={0.85}
            >
              <Ionicons name="enter-outline" size={20} color={theme.primary} />
              <Text style={[styles.outlineBtnText, { color: theme.primary, fontFamily: font.bodySemiBold }]}>
                Join with Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontSize: 22,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flexGrow: 0,
  },
  wsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  iconSquare: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInitial: {
    fontSize: 20,
    color: '#fff',
  },
  wsInfo: {
    flex: 1,
  },
  wsName: {
    fontSize: 16,
  },
  wsType: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    marginTop: 20,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    color: '#fff',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    gap: 8,
  },
  outlineBtnText: {
    fontSize: 15,
  },
});
