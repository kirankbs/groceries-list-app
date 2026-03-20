import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import type { FontMap, Workspace } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '../ThemeContext';

type Props = {
  visible: boolean;
  font: FontMap;
  onClose: () => void;
  onCreated: (workspace: Workspace) => void;
};

export default function CreateHouseholdModal({ visible, font, onClose, onCreated }: Props) {
  const { theme } = useTheme();
  const { createWorkspace } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const workspace = await createWorkspace(name.trim());
      setName('');
      onCreated(workspace);
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to create household. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>

          {/* Close button */}
          <View style={styles.closeBtnRow}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceContainer }]}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="leaf" size={36} color="#fff" />
            </View>
            <Text style={[styles.heroHeading, { color: theme.text, fontFamily: font.display }]}>
              Plant Your Roots.
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary, fontFamily: font.body }]}>
              Create a shared space for your household&apos;s grocery needs.
            </Text>
          </View>

          {/* Input */}
          <Text style={[modalStyles.formLabel, { color: theme.textSecondary, fontFamily: font.bodySemiBold }]}>
            HOUSEHOLD NAME
          </Text>
          <TextInput
            style={[
              modalStyles.input,
              { backgroundColor: theme.surfaceContainer, color: theme.text, fontFamily: font.body },
            ]}
            placeholder="e.g., The Smiths"
            placeholderTextColor={theme.outline}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          {error ? (
            <Text style={{ color: '#c0392b', fontFamily: font.body, fontSize: 13, marginTop: 6 }}>
              {error}
            </Text>
          ) : null}

          {/* CTA */}
          <TouchableOpacity
            style={[modalStyles.primaryButton, (!name.trim() || loading) && modalStyles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color='#fffbf7' />
              : (
                <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>
                  Create Household →
                </Text>
              )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeBtnRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PALETTE.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroHeading: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
