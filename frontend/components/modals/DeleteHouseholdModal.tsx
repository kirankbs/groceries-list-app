import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from '../sharedStyles';
import { useTheme } from '../ThemeContext';
import type { FontMap } from '../types';

interface Props {
  visible: boolean;
  font: FontMap;
  householdName: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteHouseholdModal({
  visible, font, householdName, loading, onClose, onConfirm,
}: Props) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={[modalStyles.centeredIcon, { backgroundColor: theme.error + '15' }]}>
            <Ionicons name="trash" size={36} color={theme.error} />
          </View>
          <Text style={[modalStyles.centeredTitle, { color: theme.text, fontFamily: font.serif }]}>
            Delete Household?
          </Text>
          <Text style={[modalStyles.centeredMsg, { color: theme.textSecondary, fontFamily: font.body }]}>
            This will permanently delete {'"'}{householdName}{'"'} and all its lists.
          </Text>
          <View style={modalStyles.centeredButtons}>
            <TouchableOpacity
              style={[modalStyles.centeredBtn, { backgroundColor: theme.inputBg }]}
              onPress={onClose}
            >
              <Text style={{ color: theme.text, fontFamily: font.bodySemiBold, fontSize: 15, textAlign: 'center' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.centeredBtn, { backgroundColor: theme.error }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: font.bodySemiBold, fontSize: 15, textAlign: 'center' }}>
                  Delete
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
