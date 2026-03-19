import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants';
import { modalStyles } from '../sharedStyles';
import type { Theme, FontMap } from '../types';

interface Props {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  householdName: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteHouseholdModal({
  visible, theme, font, householdName, loading, onClose, onConfirm,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.centeredOverlay}>
        <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
          <View style={[modalStyles.centeredIcon, { backgroundColor: PALETTE.rust + '15' }]}>
            <Ionicons name="trash" size={36} color={PALETTE.rust} />
          </View>
          <Text style={[modalStyles.centeredTitle, { color: theme.text, fontFamily: font.serif }]}>
            Delete Household?
          </Text>
          <Text style={[modalStyles.centeredMsg, { color: theme.textSecondary, fontFamily: font.body }]}>
            This will permanently delete "{householdName}" and all its lists.
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
              style={[modalStyles.centeredBtn, { backgroundColor: PALETTE.rust }]}
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
