import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVAILABLE_COLORS, AVAILABLE_ICONS, EXPO_PUBLIC_BACKEND_URL } from '../constants';
import { useTheme } from '../ThemeContext';
import type { FontMap, Category, Workspace } from '../types';

type Props = {
  visible: boolean;
  font: FontMap;
  category: Category | null;
  sessionToken: string | null;
  currentWorkspace: Workspace | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function CategoryModal({
  visible, font, category, sessionToken, currentWorkspace, onClose, onSaved,
}: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState(AVAILABLE_COLORS[0]);
  const [icon, setIcon] = useState(AVAILABLE_ICONS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(category?.name || '');
      setColor(category?.color || AVAILABLE_COLORS[0]);
      setIcon(category?.icon || AVAILABLE_ICONS[0]);
      setError('');
    }
  }, [visible, category]);

  const handleSave = async () => {
    if (!name.trim() || saving || !currentWorkspace) return;
    setSaving(true);
    setError('');
    try {
      const url = category
        ? `${EXPO_PUBLIC_BACKEND_URL}/api/categories/${category.id}`
        : `${EXPO_PUBLIC_BACKEND_URL}/api/categories`;
      const body = category
        ? { name: name.trim(), color, icon }
        : { name: name.trim(), color, icon, workspace_id: currentWorkspace.workspace_id };
      const resp = await fetch(url, {
        method: category ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setError(err.detail || 'Failed to save');
        return;
      }
      onSaved();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={[st.sheet, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={st.header}>
            <TouchableOpacity onPress={onClose} style={st.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={[st.title, { color: theme.text, fontFamily: font.display }]}>
              {category ? 'Edit Category' : 'Add Category'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Preview */}
            <View style={[st.preview, { borderColor: theme.outlineVariant }]}>
              <TouchableOpacity style={[st.previewPill, { backgroundColor: color }]}>
                <Ionicons name={icon as any} size={16} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: font.bodyBold, fontSize: 14 }}>{name || 'Fresh Produce'}</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.textSecondary, fontFamily: font.body, fontSize: 12, marginTop: 8 }}>
                How it will look in your pantry
              </Text>
            </View>

            {/* Name */}
            <Text style={[st.label, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>CATEGORY NAME</Text>
            <TextInput
              style={[st.input, { backgroundColor: theme.inputBg, color: theme.text, fontFamily: font.body }]}
              placeholder="e.g. Organic Greens"
              placeholderTextColor={theme.outline}
              value={name}
              onChangeText={t => { setName(t); setError(''); }}
              autoFocus={!category}
            />
            {!!error && <Text style={[st.error, { fontFamily: font.body }]}>{error}</Text>}

            {/* Color palette */}
            <View style={st.sectionHeader}>
              <Text style={[st.label, { color: theme.textSecondary, fontFamily: font.bodySemiBold, marginBottom: 0 }]}>VIBRANT PALETTE</Text>
              <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: theme.primary }}>{AVAILABLE_COLORS.length} colors</Text>
            </View>
            <View style={[st.paletteGrid, { backgroundColor: theme.surfaceContainer }]}>
              {AVAILABLE_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    st.colorCircle,
                    { backgroundColor: c },
                    color === c && st.colorSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            {/* Icon grid */}
            <Text style={[st.label, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>CURATED ICON</Text>
            <View style={[st.iconGrid, { backgroundColor: theme.surfaceContainer }]}>
              {AVAILABLE_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[
                    st.iconCell,
                    { backgroundColor: icon === ic ? color + '25' : 'transparent' },
                    icon === ic && { borderWidth: 2, borderColor: color },
                  ]}
                  onPress={() => setIcon(ic)}
                >
                  <Ionicons
                    name={ic as any}
                    size={20}
                    color={icon === ic ? color : theme.outline}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Save button */}
          <TouchableOpacity
            style={[st.saveBtn, { backgroundColor: theme.primary, opacity: (saving || !name.trim()) ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: font.bodyBold, fontSize: 16 }}>Save Category</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '95%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20 },
  preview: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  previewPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  label: { fontSize: 11, marginBottom: 10, marginTop: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  input: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 16, marginBottom: 4 },
  error: { color: '#ba1a1a', fontSize: 13, marginBottom: 8 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14, borderRadius: 16, marginBottom: 4 },
  colorCircle: { width: 44, height: 44, borderRadius: 22 },
  colorSelected: { borderWidth: 3, borderColor: '#fff', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, borderRadius: 16, marginBottom: 4 },
  iconCell: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
});
