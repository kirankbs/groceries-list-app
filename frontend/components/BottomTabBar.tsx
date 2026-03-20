import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import type { TabName } from './types';

type Tab = { name: TabName; label: string; icon: string; activeIcon: string };

const TABS: Tab[] = [
  { name: 'pantry',     label: 'Pantry',     icon: 'storefront-outline', activeIcon: 'storefront' },
  { name: 'lists',      label: 'Lists',      icon: 'list-outline',       activeIcon: 'list' },
  { name: 'categories', label: 'Categories', icon: 'apps-outline',       activeIcon: 'apps' },
  { name: 'settings',   label: 'Settings',   icon: 'settings-outline',   activeIcon: 'settings' },
];

type Props = {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
};

export default function BottomTabBar({ activeTab, onTabPress }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      st.container,
      {
        backgroundColor: theme.surface,
        paddingBottom: Math.max(insets.bottom, 8),
        borderTopColor: theme.outlineVariant,
      }
    ]}>
      {TABS.map(tab => {
        const active = tab.name === activeTab;
        return (
          <TouchableOpacity
            key={tab.name}
            style={st.tab}
            onPress={() => onTabPress(tab.name)}
          >
            {active && (
              <View style={[st.activePill, { backgroundColor: theme.primary + '18' }]} />
            )}
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as any}
              size={24}
              color={active ? theme.primary : theme.outline}
            />
            <Text style={[
              st.label,
              { color: active ? theme.primary : theme.outline }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    width: 56,
    height: 32,
    borderRadius: 16,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
