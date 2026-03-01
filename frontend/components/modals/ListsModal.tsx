import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onCreateClick: () => void;
}

export function ListsModal({ visible, theme, onClose, onCreateClick }: Props) {
  const { lists, templates, currentList, setCurrentList, currentWorkspace, deleteList } = useAuth();

  const activeLists = lists.filter(l => l.status !== 'completed');
  const completedLists = lists.filter(l => l.status === 'completed');

  const handleDeleteList = (listId: string, listName: string) => {
    const message = `"${listName}" and all its items will be permanently deleted.`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete List?\n${message}`)) {
        deleteList(listId).catch(console.error);
      }
    } else {
      Alert.alert('Delete List?', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteList(listId).catch(console.error) },
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface, maxHeight: '80%' as any }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Shopping Lists</Text>
            <TouchableOpacity onPress={onClose} testID="close-lists-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {currentWorkspace ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.createListButton}
                onPress={() => { onClose(); onCreateClick(); }}
                testID="create-new-list-btn"
              >
                <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
                <Text style={styles.createListButtonText}>Create New List</Text>
              </TouchableOpacity>

              {activeLists.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Lists</Text>
                  {activeLists.map(list => (
                    <View
                      key={list.list_id}
                      style={[styles.listItem, { backgroundColor: currentList?.list_id === list.list_id ? '#4CAF5020' : 'transparent' }]}
                    >
                      <TouchableOpacity
                        style={styles.listItemMain}
                        onPress={() => { setCurrentList(list as any); onClose(); }}
                        testID={`list-item-${list.list_id}`}
                      >
                        <View style={[styles.statusDot, { backgroundColor: list.status === 'in_progress' ? '#FF9800' : '#2196F3' }]} />
                        <View style={styles.listItemInfo}>
                          <Text style={[styles.listItemName, { color: theme.text }]}>{list.name}</Text>
                          <Text style={[styles.listItemMeta, { color: theme.textSecondary }]}>
                            {list.checked_items || 0}/{list.total_items || 0} items
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteListBtn}
                        onPress={() => handleDeleteList(list.list_id, list.name)}
                        testID={`delete-list-btn-${list.list_id}`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {completedLists.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>Completed</Text>
                  {completedLists.slice(0, 5).map(list => (
                    <View key={list.list_id} style={[styles.listItem, { opacity: 0.7 }]}>
                      <TouchableOpacity
                        style={styles.listItemMain}
                        onPress={() => { setCurrentList(list as any); onClose(); }}
                        testID={`completed-list-item-${list.list_id}`}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <View style={styles.listItemInfo}>
                          <Text style={[styles.listItemName, { color: theme.text }]}>{list.name}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteListBtn}
                        onPress={() => handleDeleteList(list.list_id, list.name)}
                        testID={`delete-completed-list-btn-${list.list_id}`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {templates.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>Templates</Text>
                  {templates.map(tpl => (
                    <View key={tpl.list_id} style={styles.listItem}>
                      <Ionicons name="document-outline" size={20} color="#9C27B0" />
                      <View style={styles.listItemInfo}>
                        <Text style={[styles.listItemName, { color: theme.text }]}>{tpl.name}</Text>
                        <Text style={[styles.listItemMeta, { color: theme.textSecondary }]}>{tpl.item_count || 0} items</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Please select a household first</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  createListButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 10, borderWidth: 2, borderColor: '#4CAF50', borderStyle: 'dashed' as const, marginBottom: 16, gap: 8 },
  createListButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' as const },
  sectionTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
  listItem: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, gap: 12 },
  listItemMain: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 16, fontWeight: '500' as const },
  listItemMeta: { fontSize: 13 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  deleteListBtn: { padding: 6 },
  emptyState: { alignItems: 'center' as const, paddingVertical: 32 },
  emptyStateText: { fontSize: 16, marginTop: 12, textAlign: 'center' as const },
};
