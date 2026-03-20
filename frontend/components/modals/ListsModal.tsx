import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { PALETTE, LIST_COLORS, getStatusBadge } from '../constants';
import type { FontMap, ShoppingList, Workspace } from '../types';

function listColor(list: ShoppingList, index: number): string {
  return LIST_COLORS[index % LIST_COLORS.length];
}

type Props = {
  visible: boolean;
  font: FontMap;
  currentWorkspace: Workspace | null;
  currentList: ShoppingList | null;
  activeLists: ShoppingList[];
  completedLists: ShoppingList[];
  templates: ShoppingList[];
  onClose: () => void;
  onSelectList: (list: ShoppingList) => void;
  onCreateNew: () => void;
};

export default function ListsModal({
  visible, font, currentList, activeLists, completedLists, onClose, onSelectList, onCreateNew,
}: Props) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={[st.sheet, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={st.header}>
            <Text style={[st.title, { color: theme.text, fontFamily: font.display }]}>Switch List</Text>
            <TouchableOpacity onPress={onClose} style={[st.closeBtn, { backgroundColor: theme.surfaceContainer }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Active lists */}
            {activeLists.length > 0 && (
              <>
                <Text style={[st.sectionLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>ACTIVE LISTS</Text>
                {activeLists.map((list, idx) => {
                  const isCurrent = currentList?.list_id === list.list_id;
                  const badge = getStatusBadge(list.status);
                  const color = listColor(list, idx);
                  return (
                    <TouchableOpacity
                      key={list.list_id}
                      style={[
                        st.listRow,
                        { backgroundColor: isCurrent ? theme.primary + '10' : theme.surface },
                        isCurrent && { borderWidth: 1, borderColor: theme.primary + '30' },
                      ]}
                      onPress={() => onSelectList(list)}
                    >
                      <View style={[st.listIcon, { backgroundColor: color + '20' }]}>
                        <Ionicons name="basket-outline" size={20} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>{list.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={[st.statusBadge, { backgroundColor: badge.color + '18' }]}>
                            <Text style={{ fontSize: 10, fontFamily: font.bodySemiBold, color: badge.color }}>{badge.label}</Text>
                          </View>
                        </View>
                      </View>
                      {isCurrent
                        ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                        : <Ionicons name="chevron-forward" size={18} color={theme.outline} />
                      }
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* History */}
            {completedLists.length > 0 && (
              <>
                <Text style={[st.sectionLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold, marginTop: 20 }]}>HISTORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {completedLists.slice(0, 6).map(list => (
                    <TouchableOpacity
                      key={list.list_id}
                      style={[st.historyChip, { backgroundColor: theme.surfaceContainer }]}
                      onPress={() => onSelectList(list)}
                    >
                      <Text style={{ fontSize: 13, fontFamily: font.bodyMedium, color: theme.text }}>{list.name}</Text>
                      <Text style={{ fontSize: 11, fontFamily: font.body, color: theme.textSecondary, marginTop: 2 }}>
                        {list.item_count ?? 0} items
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[st.createBtn, { backgroundColor: theme.primary, marginTop: 24 }]}
              onPress={onCreateNew}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: font.bodyBold, fontSize: 16 }}>Create New List</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 8, gap: 12 },
  listIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  historyChip: { padding: 14, borderRadius: 14, marginRight: 10, minWidth: 120 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
});
