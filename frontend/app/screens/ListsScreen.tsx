import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import type { FontMap, ShoppingList } from '../../components/types';

const LIST_COLORS = ['#006a28', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];

type Props = {
  font: FontMap;
  lists: ShoppingList[];
  currentList: ShoppingList | null;
  onSelectList: (list: ShoppingList) => void;
  onNavigateToPantry: () => void;
  onCreateNew: () => void;
};

export default function ListsScreen({
  font,
  lists,
  currentList,
  onSelectList,
  onNavigateToPantry,
  onCreateNew,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const activeLists = lists.filter(l => l.status !== 'completed');
  const completedLists = lists.filter(l => l.status === 'completed');

  const handleSelectList = (list: ShoppingList) => {
    onSelectList(list);
    onNavigateToPantry();
  };

  const statusBadge = (status: ShoppingList['status']) => {
    if (status === 'in_progress') {
      return { label: 'IN PROGRESS', color: '#ff9727', bg: '#fff3e0' };
    }
    if (status === 'completed') {
      return { label: 'DONE', color: '#006a28', bg: '#e6f4ea' };
    }
    return { label: 'ACTIVE', color: '#1b6ef3', bg: '#e8f0fe' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.title, { fontFamily: font.display, color: theme.text }]}>
          My Lists
        </Text>

        {/* Active lists */}
        <Text style={[styles.sectionLabel, { fontFamily: font.bodySemiBold, color: theme.textSecondary }]}>
          ACTIVE LISTS
        </Text>

        {activeLists.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <Ionicons name="list-outline" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { fontFamily: font.body, color: theme.textSecondary }]}>
              No active lists yet. Create one below.
            </Text>
          </View>
        ) : (
          activeLists.map((list, index) => {
            const isSelected = currentList?.list_id === list.list_id;
            const iconBg = LIST_COLORS[index % LIST_COLORS.length];
            const badge = statusBadge(list.status);
            const initial = list.name.charAt(0).toUpperCase();

            return (
              <TouchableOpacity
                key={list.list_id}
                style={[
                  styles.listCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? theme.primary : theme.outline,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
                onPress={() => handleSelectList(list)}
                activeOpacity={0.75}
              >
                {/* Color icon */}
                <View style={[styles.listIcon, { backgroundColor: iconBg }]}>
                  <Text style={[styles.listIconText, { fontFamily: font.display }]}>
                    {initial}
                  </Text>
                </View>

                {/* Name + badge */}
                <View style={styles.listInfo}>
                  <Text
                    style={[styles.listName, { fontFamily: font.display, color: theme.text }]}
                    numberOfLines={1}
                  >
                    {list.name}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { fontFamily: font.bodySemiBold, color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Right indicator */}
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            );
          })
        )}

        {/* Completed / history */}
        {completedLists.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { fontFamily: font.bodySemiBold, color: theme.textSecondary, marginTop: 28 }]}>
              HISTORY
            </Text>
            <ScrollView
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyRow}
            >
              {completedLists.map(list => (
                <View
                  key={list.list_id}
                  style={[styles.historyChip, { backgroundColor: theme.surfaceContainer, borderColor: theme.outline }]}
                >
                  <Text style={[styles.historyChipName, { fontFamily: font.bodyMedium, color: theme.textSecondary }]}>
                    {list.name}
                  </Text>
                  {list.item_count !== undefined && (
                    <Text style={[styles.historyChipCount, { fontFamily: font.body, color: theme.textSecondary }]}>
                      {list.item_count} item{list.item_count !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {/* Create new list button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 80, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.primary }]}
          onPress={onCreateNew}
          activeOpacity={0.85}
        >
          <Text style={[styles.createButtonText, { fontFamily: font.bodyBold }]}>
            Create New List →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIconText: {
    fontSize: 18,
    color: '#ffffff',
  },
  listInfo: {
    flex: 1,
    gap: 5,
  },
  listName: {
    fontSize: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  historyRow: {
    gap: 10,
    paddingRight: 20,
  },
  historyChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 100,
    gap: 2,
  },
  historyChipName: {
    fontSize: 13,
  },
  historyChipCount: {
    fontSize: 11,
    opacity: 0.7,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  createButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
