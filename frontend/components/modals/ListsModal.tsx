import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import type { Theme, FontMap, Workspace, ShoppingList } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  currentWorkspace: Workspace | null;
  currentList: ShoppingList | null;
  activeLists: ShoppingList[];
  completedLists: ShoppingList[];
  templates: ShoppingList[];
  onClose: () => void;
  onSelectList: (list: ShoppingList) => void;
  onCreateNew: () => void;
}

export default function ListsModal({
  visible, theme, font, currentWorkspace, currentList,
  activeLists, completedLists, templates,
  onClose, onSelectList, onCreateNew,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text, fontFamily: font.serif }]}>Shopping Lists</Text>
            <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {currentWorkspace ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[styles.createBtn, { borderColor: PALETTE.sage }]} onPress={onCreateNew}>
                <Ionicons name="add-circle-outline" size={22} color={PALETTE.sage} />
                <Text style={[styles.createBtnText, { color: PALETTE.sage, fontFamily: font.bodySemiBold }]}>
                  Create New List
                </Text>
              </TouchableOpacity>

              {activeLists.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
                    Active
                  </Text>
                  {activeLists.map(list => (
                    <TouchableOpacity
                      key={list.list_id}
                      style={[
                        styles.listItem,
                        {
                          borderColor: theme.border,
                          backgroundColor: currentList?.list_id === list.list_id ? PALETTE.sage + '10' : 'transparent',
                        },
                      ]}
                      onPress={() => onSelectList(list)}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: list.status === 'in_progress' ? PALETTE.amber : PALETTE.sage },
                        ]}
                      />
                      <View style={styles.listInfo}>
                        <Text style={[styles.listName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                          {list.name}
                        </Text>
                        <Text style={[styles.listMeta, { color: theme.textSecondary, fontFamily: font.body }]}>
                          {list.checked_items || 0}/{list.total_items || 0} items
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {completedLists.length > 0 && (
                <>
                  <Text
                    style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: font.bodySemiBold, marginTop: 16 }]}
                  >
                    Completed
                  </Text>
                  {completedLists.slice(0, 5).map(list => (
                    <TouchableOpacity
                      key={list.list_id}
                      style={[styles.listItem, { borderColor: theme.border, opacity: 0.65 }]}
                      onPress={() => onSelectList(list)}
                    >
                      <Ionicons name="checkmark-circle" size={18} color={PALETTE.sage} />
                      <View style={styles.listInfo}>
                        <Text style={[styles.listName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                          {list.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {templates.length > 0 && (
                <>
                  <Text
                    style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: font.bodySemiBold, marginTop: 16 }]}
                  >
                    Templates
                  </Text>
                  {templates.map(tpl => (
                    <View key={tpl.list_id} style={[styles.listItem, { borderColor: theme.border }]}>
                      <Ionicons name="document-outline" size={18} color={PALETTE.clay} />
                      <View style={styles.listInfo}>
                        <Text style={[styles.listName, { color: theme.text, fontFamily: font.bodyMedium }]}>
                          {tpl.name}
                        </Text>
                        <Text style={[styles.listMeta, { color: theme.textSecondary, fontFamily: font.body }]}>
                          {(tpl as any).item_count || 0} items
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="alert-circle-outline" size={44} color={PALETTE.sand} />
              <Text style={[styles.emptyText, { color: theme.text, fontFamily: font.serifMedium }]}>
                Select a household first
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
  },
  createBtnText: { fontSize: 15 },
  sectionTitle: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 10, borderWidth: 1 },
  listInfo: { flex: 1 },
  listName: { fontSize: 15 },
  listMeta: { fontSize: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, marginTop: 16 },
});
