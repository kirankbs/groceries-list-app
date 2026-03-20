import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList,
  Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { EXPO_PUBLIC_BACKEND_URL } from '../../components/constants';
import type { FontMap, Category, GroceryItem } from '../../components/types';

import AddItemModal from '../../components/modals/AddItemModal';
import EditItemModal from '../../components/modals/EditItemModal';
import DeleteItemModal from '../../components/modals/DeleteItemModal';
import HouseholdSwitcherModal from '../../components/modals/HouseholdSwitcherModal';
import CreateHouseholdModal from '../../components/modals/CreateHouseholdModal';
import JoinHouseholdModal from '../../components/modals/JoinHouseholdModal';
import HouseholdDetailsModal from '../../components/modals/HouseholdDetailsModal';
import DeleteHouseholdModal from '../../components/modals/DeleteHouseholdModal';
import ListsModal from '../../components/modals/ListsModal';
import CreateListModal from '../../components/modals/CreateListModal';
import InviteCodeModal from '../../components/modals/InviteCodeModal';
import ReceiptScanModal from '../../components/modals/ReceiptScanModal';
import ProfileModal from '../../components/modals/ProfileModal';

type Props = {
  font: FontMap;
  items: GroceryItem[];
  setItems: React.Dispatch<React.SetStateAction<GroceryItem[]>>;
  categories: Category[];
  fetchCategories: () => void;
  fetchItems: () => void;
  loading: boolean;
};

export default function PantryScreen({
  font, items, setItems, categories, fetchCategories, fetchItems, loading,
}: Props) {
  const { theme } = useTheme();
  const {
    user, workspaces, currentWorkspace, currentList, lists, templates,
    sessionToken, setCurrentWorkspace, setCurrentList,
    createWorkspace, getInviteCode, regenerateInviteCode,
    leaveWorkspace, deleteWorkspace, logout,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');

  // Modal visibility
  const [showHouseholdSwitcher, setShowHouseholdSwitcher] = useState(false);
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const [showJoinHousehold, setShowJoinHousehold] = useState(false);
  const [showHouseholdDetails, setShowHouseholdDetails] = useState(false);
  const [showDeleteHousehold, setShowDeleteHousehold] = useState(false);
  const [showLists, setShowLists] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [showDeleteItem, setShowDeleteItem] = useState(false);
  const [showReceiptScan, setShowReceiptScan] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Item editing state
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);

  // Household details state
  const [detailsHousehold, setDetailsHousehold] = useState(currentWorkspace);
  const [inviteCode, setInviteCode] = useState('');
  const [deleteHouseholdLoading, setDeleteHouseholdLoading] = useState(false);

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

  const uncheckedCount = useMemo(
    () => items.filter(i => !i.checked).length,
    [items]
  );

  const groupedSections = useMemo(() => {
    const filtered = searchQuery.trim()
      ? items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : items;

    const catMap = new Map<string, Category>();
    categories.forEach(c => catMap.set(c.name, c));

    const buckets = new Map<string, GroceryItem[]>();
    filtered.forEach(item => {
      const key = item.category || 'Other';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(item);
    });

    return Array.from(buckets.entries()).map(([catName, catItems]) => {
      const catInfo = catMap.get(catName);
      return {
        title: catName,
        data: catItems,
        color: catInfo?.color ?? '#72796f',
        icon: catInfo?.icon ?? 'grid-outline',
      };
    });
  }, [items, categories, searchQuery]);

  const toggleItem = useCallback(async (item: GroceryItem) => {
    if (!sessionToken) return;
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ checked: !item.checked }),
      });
      if (!res.ok) {
        // Revert on failure
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i));
      }
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i));
    }
  }, [sessionToken, setItems]);

  const handleShowInvite = async (ws = currentWorkspace) => {
    if (!ws) return;
    try {
      const code = await getInviteCode(ws.workspace_id);
      setInviteCode(code);
      setShowInviteCode(true);
    } catch {
      // ignore
    }
  };

  const handleDeleteHousehold = async () => {
    if (!detailsHousehold) return;
    setDeleteHouseholdLoading(true);
    try {
      await deleteWorkspace(detailsHousehold.workspace_id);
      setShowDeleteHousehold(false);
      setShowHouseholdDetails(false);
    } catch {
      // ignore
    }
    setDeleteHouseholdLoading(false);
  };

  const activeLists = useMemo(
    () => lists.filter(l => l.status !== 'completed' && !l.is_template),
    [lists]
  );
  const completedLists = useMemo(
    () => lists.filter(l => l.status === 'completed' && !l.is_template),
    [lists]
  );

  const renderItem = ({ item }: { item: GroceryItem }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginHorizontal: 16,
      marginBottom: 4,
      borderRadius: 16,
      backgroundColor: item.checked ? theme.surfaceContainer : theme.surface,
      gap: 12,
    }}>
      <TouchableOpacity
        style={{
          width: 24, height: 24, borderRadius: 7, borderWidth: 2,
          borderColor: item.checked ? theme.primary : theme.outline,
          backgroundColor: item.checked ? theme.primary : 'transparent',
          justifyContent: 'center', alignItems: 'center',
        }}
        onPress={() => toggleItem(item)}
      >
        {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </TouchableOpacity>

      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => { setEditingItem(item); setShowEditItem(true); }}
      >
        <Text style={{
          fontSize: 15,
          fontFamily: font.bodyMedium,
          color: item.checked ? theme.textSecondary : theme.text,
          ...(item.checked ? { textDecorationLine: 'line-through' as const, opacity: 0.6 } : {}),
        }}>
          {item.name}
        </Text>
      </TouchableOpacity>

      {item.quantity > 0 && (
        <View style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 20,
          backgroundColor: item.checked ? theme.outline + '20' : '#ff9727' + '20',
        }}>
          <Text style={{
            fontSize: 13,
            fontFamily: font.bodySemiBold,
            color: item.checked ? theme.outline : '#ff9727',
          }}>
            {item.quantity} {item.unit || 'pcs'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={{ padding: 4 }}
        onPress={() => { setItemToDelete(item); setShowDeleteItem(true); }}
      >
        <Ionicons name="trash-outline" size={18} color={theme.outline} />
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: typeof groupedSections[0] }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 10,
      gap: 10,
    }}>
      <View style={{
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: section.color + '25',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={section.icon as any} size={18} color={section.color} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: font.display, color: theme.text, flex: 1 }}>
        {section.title}
      </Text>
      <View style={{
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
        backgroundColor: section.color + '15',
      }}>
        <Text style={{
          fontSize: 11, fontFamily: font.bodySemiBold,
          color: section.color, letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          {section.data.length} {section.data.length === 1 ? 'ITEM' : 'ITEMS'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Status bar spacer */}
      <View style={{ height: statusBarHeight }} />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10,
      }}>
        <TouchableOpacity
          style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowHouseholdSwitcher(true)}
        >
          <Ionicons name="menu" size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowHouseholdSwitcher(true)}>
          <Text
            style={{ fontSize: 22, fontFamily: font.display, color: theme.primary, lineHeight: 26 }}
            numberOfLines={1}
          >
            {currentWorkspace?.name || 'Select Household'}
          </Text>
          <Text style={{
            fontSize: 11, fontFamily: font.body,
            color: theme.textSecondary, letterSpacing: 0.5,
          }}>
            {currentWorkspace?.type === 'personal' ? 'PERSONAL HOME' : 'SHARED HOME'}
          </Text>
        </TouchableOpacity>

        {currentList && (
          <TouchableOpacity
            style={{
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 20, backgroundColor: theme.surfaceContainer,
            }}
            onPress={() => setShowLists(true)}
          >
            <Text style={{ fontSize: 13, fontFamily: font.bodySemiBold, color: theme.primary }}>
              {uncheckedCount} items left
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{
            width: 40, height: 40, borderRadius: 20,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: theme.primary + '18',
          }}
          onPress={() => setShowProfile(true)}
        >
          <Ionicons name="person" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Title block */}
      {currentList ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{
            fontSize: 36, fontFamily: font.display,
            color: theme.text, lineHeight: 42,
          }} numberOfLines={2}>
            {currentList.name}
          </Text>
          <Text style={{
            fontSize: 14, fontFamily: font.body,
            color: theme.textSecondary, marginTop: 4,
          }}>
            Curated essentials for the upcoming week.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{
            fontSize: 28, fontFamily: font.display,
            color: theme.text, lineHeight: 36,
          }}>
            No list selected
          </Text>
          <Text style={{
            fontSize: 14, fontFamily: font.body,
            color: theme.textSecondary, marginTop: 4,
          }}>
            Pick a list to start shopping.
          </Text>
        </View>
      )}

      {/* Search bar + Quick Add */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 10,
      }}>
        <View style={{
          flex: 1,
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: theme.surface,
          borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
          gap: 8,
        }}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={{
              flex: 1, fontSize: 15, fontFamily: font.body,
              color: theme.text, padding: 0,
            }}
            placeholder="Search items…"
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: theme.primary,
            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 6,
          }}
          onPress={() => setShowReceiptScan(true)}
          disabled={!currentList}
        >
          <Ionicons name="receipt-outline" size={18} color="#fff" />
          <Text style={{ fontSize: 14, fontFamily: font.bodySemiBold, color: '#fff' }}>
            Quick Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items list */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : !currentList ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="basket-outline" size={64} color={theme.outline} />
          <Text style={{
            fontSize: 18, fontFamily: font.display,
            color: theme.text, marginTop: 16, textAlign: 'center',
          }}>
            No list active
          </Text>
          <Text style={{
            fontSize: 14, fontFamily: font.body,
            color: theme.textSecondary, marginTop: 8, textAlign: 'center',
          }}>
            Create or select a list to start adding items.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 20, paddingHorizontal: 24, paddingVertical: 12,
              backgroundColor: theme.primary, borderRadius: 14,
            }}
            onPress={() => setShowLists(true)}
          >
            <Text style={{ fontSize: 15, fontFamily: font.bodySemiBold, color: '#fff' }}>
              View Lists
            </Text>
          </TouchableOpacity>
        </View>
      ) : groupedSections.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="leaf-outline" size={64} color={theme.outline} />
          <Text style={{
            fontSize: 18, fontFamily: font.display,
            color: theme.text, marginTop: 16, textAlign: 'center',
          }}>
            {searchQuery ? 'No matching items' : 'List is empty'}
          </Text>
          <Text style={{
            fontSize: 14, fontFamily: font.body,
            color: theme.textSecondary, marginTop: 8, textAlign: 'center',
          }}>
            {searchQuery ? 'Try a different search term.' : 'Tap + to add your first item.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedSections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB */}
      {currentList && (
        <TouchableOpacity
          style={{
            position: 'absolute', right: 20, bottom: 16,
            width: 60, height: 60, borderRadius: 18,
            backgroundColor: theme.primary,
            justifyContent: 'center', alignItems: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
          }}
          onPress={() => setShowAddItem(true)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modals */}
      <AddItemModal
        visible={showAddItem}
        font={font as any}
        categories={categories}
        sessionToken={sessionToken}
        currentList={currentList}
        onClose={() => setShowAddItem(false)}
        onItemAdded={item => {
          setItems(prev => [...prev, item]);
          fetchItems();
        }}
      />

      <EditItemModal
        visible={showEditItem}
        font={font as any}
        categories={categories}
        sessionToken={sessionToken}
        item={editingItem}
        onClose={() => { setShowEditItem(false); setEditingItem(null); }}
        onItemUpdated={updated => {
          setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
          setShowEditItem(false);
          setEditingItem(null);
        }}
        onDeleteRequest={item => {
          setItemToDelete(item);
          setShowEditItem(false);
          setShowDeleteItem(true);
        }}
      />

      <DeleteItemModal
        visible={showDeleteItem}
        font={font as any}
        sessionToken={sessionToken}
        item={itemToDelete}
        onClose={() => { setShowDeleteItem(false); setItemToDelete(null); }}
        onDeleted={() => {
          setItems(prev => prev.filter(i => i.id !== itemToDelete?.id));
          setShowDeleteItem(false);
          setItemToDelete(null);
        }}
      />

      <HouseholdSwitcherModal
        visible={showHouseholdSwitcher}
        font={font as any}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onClose={() => setShowHouseholdSwitcher(false)}
        onSelect={ws => { setCurrentWorkspace(ws); setShowHouseholdSwitcher(false); }}
        onCreateNew={() => { setShowHouseholdSwitcher(false); setShowCreateHousehold(true); }}
        onJoin={() => { setShowHouseholdSwitcher(false); setShowJoinHousehold(true); }}
      />

      <CreateHouseholdModal
        visible={showCreateHousehold}
        font={font as any}
        onClose={() => setShowCreateHousehold(false)}
        onCreated={ws => { setCurrentWorkspace(ws); setShowCreateHousehold(false); }}
      />

      <JoinHouseholdModal
        visible={showJoinHousehold}
        font={font as any}
        onClose={() => setShowJoinHousehold(false)}
        onJoined={ws => { setCurrentWorkspace(ws); setShowJoinHousehold(false); }}
        onCreateNew={() => { setShowJoinHousehold(false); setShowCreateHousehold(true); }}
      />

      <HouseholdDetailsModal
        visible={showHouseholdDetails}
        font={font as any}
        household={detailsHousehold ?? null}
        userId={user?.user_id}
        onClose={() => setShowHouseholdDetails(false)}
        onInvite={() => { setShowHouseholdDetails(false); handleShowInvite(detailsHousehold ?? undefined); }}
        onDelete={() => { setShowHouseholdDetails(false); setShowDeleteHousehold(true); }}
        onLeave={async () => {
          if (!detailsHousehold) return;
          try { await leaveWorkspace(detailsHousehold.workspace_id); } catch { /* ignore */ }
          setShowHouseholdDetails(false);
        }}
      />

      <DeleteHouseholdModal
        visible={showDeleteHousehold}
        font={font as any}
        householdName={detailsHousehold?.name ?? ''}
        loading={deleteHouseholdLoading}
        onClose={() => setShowDeleteHousehold(false)}
        onConfirm={handleDeleteHousehold}
      />

      <ListsModal
        visible={showLists}
        font={font as any}
        currentWorkspace={currentWorkspace}
        currentList={currentList}
        activeLists={activeLists}
        completedLists={completedLists}
        templates={templates}
        onClose={() => setShowLists(false)}
        onSelectList={list => { setCurrentList(list); setShowLists(false); }}
        onCreateNew={() => { setShowLists(false); setShowCreateList(true); }}
      />

      <CreateListModal
        visible={showCreateList}
        font={font as any}
        templates={templates}
        lists={lists}
        onClose={() => setShowCreateList(false)}
        onCreated={list => { setCurrentList(list); setShowCreateList(false); }}
      />

      <InviteCodeModal
        visible={showInviteCode}
        font={font as any}
        inviteCode={inviteCode}
        onClose={() => setShowInviteCode(false)}
      />

      {currentList && (
        <ReceiptScanModal
          visible={showReceiptScan}
          font={font as any}
          listId={currentList.list_id}
          onClose={() => setShowReceiptScan(false)}
          onPricesSaved={() => { fetchItems(); setShowReceiptScan(false); }}
        />
      )}

      <ProfileModal
        visible={showProfile}
        font={font as any}
        user={user}
        currentWorkspace={currentWorkspace}
        onClose={() => setShowProfile(false)}
        onInvite={() => { setShowProfile(false); handleShowInvite(); }}
        onLeave={async () => {
          if (!currentWorkspace || currentWorkspace.type === 'personal') return;
          try { await leaveWorkspace(currentWorkspace.workspace_id); } catch { /* ignore */ }
          setShowProfile(false);
        }}
        onLogout={() => { logout(); setShowProfile(false); }}
      />
    </View>
  );
}
