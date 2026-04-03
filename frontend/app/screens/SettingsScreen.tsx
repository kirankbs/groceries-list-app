import React from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { FontMap } from '../../components/types';

type Props = { font: FontMap; onOpenHouseholdDetails: () => void };

export default function SettingsScreen({ font, onOpenHouseholdDetails }: Props) {
  const { theme, colorMode, setColorMode } = useTheme();
  const { user, logout, currentWorkspace } = useAuth();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top, insets.top);

  const memberCount = currentWorkspace?.member_ids?.length ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingTop: topPadding + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontFamily: font.display, color: theme.text }}>Settings</Text>
      </View>

      {/* User card */}
      {user && (
        <View style={[st.userCard, { backgroundColor: theme.surface, marginHorizontal: 16 }]}>
          <View style={[st.avatar, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="person" size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontFamily: font.display, color: theme.text }}>{user.name}</Text>
            <Text style={{ fontSize: 13, fontFamily: font.body, color: theme.textSecondary }}>{user.email}</Text>
          </View>
        </View>
      )}

      {/* Appearance */}
      <View style={st.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="color-palette-outline" size={18} color={theme.primary} />
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: font.display }]}>Appearance</Text>
        </View>
        <View style={[st.segmentedControl, { backgroundColor: theme.surfaceContainer }]}>
          {(['light', 'dark', 'system'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[st.segment, colorMode === mode && { backgroundColor: theme.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 }]}
              onPress={() => setColorMode(mode)}
            >
              <Ionicons
                name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                size={14}
                color={colorMode === mode ? theme.primary : theme.outline}
              />
              <Text style={{ fontSize: 13, fontFamily: colorMode === mode ? font.bodySemiBold : font.body, color: colorMode === mode ? theme.text : theme.outline, textTransform: 'capitalize' }}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Household */}
      <View style={st.sectionLabel}>
        <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>HOUSEHOLD</Text>
      </View>
      <View style={[st.menuGroup, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={st.menuRow} onPress={onOpenHouseholdDetails}>
          <View style={[st.menuIcon, { backgroundColor: theme.primary + '18' }]}><Ionicons name="home-outline" size={18} color={theme.primary} /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Household Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.outline} />
        </TouchableOpacity>
        <View style={{ height: 2 }} />
        <TouchableOpacity style={st.menuRow} onPress={onOpenHouseholdDetails}>
          <View style={[st.menuIcon, { backgroundColor: '#3b82f6' + '18' }]}><Ionicons name="people-outline" size={18} color="#3b82f6" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Manage Members</Text>
          {memberCount > 0 && (
            <View style={{ backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontFamily: font.bodySemiBold }}>{memberCount} Active</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={theme.outline} />
        </TouchableOpacity>
      </View>

      {/* Preferences */}
      <View style={st.sectionLabel}>
        <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>PREFERENCES</Text>
      </View>
      <View style={[st.menuGroup, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={st.menuRow} onPress={() => Alert.alert('Coming Soon', 'Notification settings are on the way.')}>
          <View style={[st.menuIcon, { backgroundColor: '#f97316' + '18' }]}><Ionicons name="notifications-outline" size={18} color="#f97316" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Notifications</Text>
        </TouchableOpacity>
        <View style={{ height: 2 }} />
        <TouchableOpacity style={st.menuRow} onPress={() => Alert.alert('Coming Soon', 'Privacy & Security settings are on the way.')}>
          <View style={[st.menuIcon, { backgroundColor: '#6b7280' + '18' }]}><Ionicons name="shield-outline" size={18} color="#6b7280" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Privacy & Security</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={st.sectionLabel}>
        <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>SUPPORT</Text>
      </View>
      <View style={[st.menuGroup, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={st.menuRow} onPress={() => Alert.alert('Coming Soon', 'Help & Support is on the way.')}>
          <View style={[st.menuIcon, { backgroundColor: '#8b5cf6' + '18' }]}><Ionicons name="help-circle-outline" size={18} color="#8b5cf6" /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyMedium, color: theme.text }}>Help & Support</Text>
        </TouchableOpacity>
        <View style={{ height: 2 }} />
        <TouchableOpacity style={st.menuRow} onPress={logout}>
          <View style={[st.menuIcon, { backgroundColor: theme.error + '18' }]}><Ionicons name="log-out-outline" size={18} color={theme.error} /></View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: font.bodyBold, color: theme.error }}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ textAlign: 'center', fontSize: 11, fontFamily: font.body, color: theme.outline, marginTop: 32 }}>
        THE LIVING PANTRY v2.4.0{'\n'}Made with locally sourced ingredients.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15 },
  segmentedControl: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  sectionLabel: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  menuGroup: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
