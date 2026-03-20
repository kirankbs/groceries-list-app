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
  onJoined: (workspace: Workspace) => void;
};

export default function JoinHouseholdModal({ visible, font, onClose, onJoined }: Props) {
  const { theme } = useTheme();
  const { joinWorkspace } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const workspace = await joinWorkspace(code.trim());
      setCode('');
      onJoined(workspace);
      onClose();
    } catch (e) {
      console.error(e);
      setError('Invalid invite code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
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
              <Ionicons name="person-add" size={34} color="#fff" />
            </View>
            <Text style={[styles.heroHeading, { color: theme.text, fontFamily: font.display }]}>
              Welcome Aboard.
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary, fontFamily: font.body }]}>
              Enter the invite code shared by your household.
            </Text>
          </View>

          {/* Invite code input */}
          <TextInput
            style={[
              styles.codeInput,
              { backgroundColor: theme.surfaceContainer, color: theme.text, fontFamily: font.bodyBold },
            ]}
            placeholder="XXXX-XXXX"
            placeholderTextColor={theme.outline}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="center"
            maxLength={9}
          />

          {error ? (
            <Text style={{ color: '#c0392b', fontFamily: font.body, fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}

          {/* Join CTA */}
          <TouchableOpacity
            style={[
              modalStyles.primaryButton,
              { marginTop: 4 },
              (!code.trim() || loading) && modalStyles.buttonDisabled,
            ]}
            onPress={handleJoin}
            disabled={!code.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <Text style={[modalStyles.primaryButtonText, { fontFamily: font.bodyBold }]}>
                  Join Household →
                </Text>
              )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.outlineVariant }]} />
            <Text style={[styles.dividerText, { color: theme.textSecondary, fontFamily: font.body }]}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.outlineVariant }]} />
          </View>

          {/* Create new outline button */}
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: PALETTE.primary }]}
            onPress={handleClose}
          >
            <Text style={[styles.outlineBtnText, { color: PALETTE.primary, fontFamily: font.bodySemiBold }]}>
              Create New Household
            </Text>
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
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
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
  codeInput: {
    fontSize: 26,
    letterSpacing: 4,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    letterSpacing: 1,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 4,
  },
  outlineBtnText: {
    fontSize: 15,
  },
});
