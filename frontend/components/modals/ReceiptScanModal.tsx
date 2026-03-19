import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { EXPO_PUBLIC_BACKEND_URL, PALETTE, CURRENCY_SYMBOLS } from '../constants';
import { modalStyles } from '../sharedStyles';
import { Theme, FontMap } from '../types';

type Step = 'picker' | 'uploading' | 'review' | 'confirming';

interface MatchedItem {
  item_id: string;
  name: string;
  receipt_name: string;
  price: number;
  matched: boolean;
}

interface ReceiptData {
  receipt_id: string;
  store_name?: string;
  receipt_total?: number;
  matched_items: MatchedItem[];
  status: string;
}

interface Props {
  visible: boolean;
  theme: Theme;
  font: FontMap;
  listId: string;
  onClose: () => void;
  onPricesSaved: () => void;
}

const MAX_POLLS = 40;
const POLL_INTERVAL = 3000;

export default function ReceiptScanModal({
  visible,
  theme,
  font,
  listId,
  onClose,
  onPricesSaved,
}: Props) {
  const { sessionToken, currentWorkspace } = useAuth();
  const [step, setStep] = useState<Step>('picker');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currencySymbol =
    CURRENCY_SYMBOLS[currentWorkspace?.currency || 'USD'] || '$';

  const resetState = useCallback(() => {
    setStep('picker');
    setReceiptData(null);
    setEditedPrices({});
    setError(null);
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const pollReceipt = useCallback(
    (receiptId: string, attempt = 0) => {
      if (attempt >= MAX_POLLS) {
        setError('Receipt processing timed out. Please try again.');
        setStep('picker');
        return;
      }

      pollRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `${EXPO_PUBLIC_BACKEND_URL}/api/receipts/${receiptId}`,
            { headers: { Authorization: `Bearer ${sessionToken}` } }
          );
          if (!res.ok) throw new Error('Failed to check receipt status');

          const data = await res.json();

          if (data.status === 'completed') {
            setReceiptData(data);
            const prices: Record<string, string> = {};
            (data.matched_items || []).forEach((item: MatchedItem) => {
              prices[item.item_id] = item.price?.toString() || '';
            });
            setEditedPrices(prices);
            setStep('review');
          } else if (data.status === 'failed') {
            setError(data.error || 'Receipt processing failed.');
            setStep('picker');
          } else {
            pollReceipt(receiptId, attempt + 1);
          }
        } catch {
          setError('Error checking receipt status.');
          setStep('picker');
        }
      }, POLL_INTERVAL);
    },
    [sessionToken]
  );

  const pickImage = useCallback(
    async (source: 'camera' | 'library') => {
      setError(null);

      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Camera permission is required to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError('Photo library permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setStep('uploading');

      try {
        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1] : 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        if (Platform.OS === 'web') {
          const blob = await fetch(asset.uri).then(r => r.blob());
          formData.append('image', blob, filename);
        } else {
          formData.append('image', {
            uri: asset.uri,
            name: filename,
            type: mimeType,
          } as any);
        }

        const res = await fetch(
          `${EXPO_PUBLIC_BACKEND_URL}/api/lists/${listId}/upload-receipt`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${sessionToken}` },
            body: formData,
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail || 'Upload failed');
        }

        const data = await res.json();
        pollReceipt(data.receipt_id);
      } catch (e: any) {
        setError(e.message || 'Failed to upload receipt.');
        setStep('picker');
      }
    },
    [sessionToken, listId, pollReceipt]
  );

  const confirmPrices = useCallback(async () => {
    if (!receiptData) return;
    setStep('confirming');

    const confirmed = receiptData.matched_items
      .filter((item) => editedPrices[item.item_id] !== undefined)
      .map((item) => ({
        item_id: item.item_id,
        price: parseFloat(editedPrices[item.item_id]) || 0,
      }));

    try {
      const res = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/receipts/${receiptData.receipt_id}/confirm`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirmed_items: confirmed }),
        }
      );

      if (!res.ok) throw new Error('Failed to save prices');

      resetState();
      onPricesSaved();
      onClose();
    } catch {
      setError('Failed to save prices. Please try again.');
      setStep('review');
    }
  }, [receiptData, editedPrices, sessionToken, resetState, onPricesSaved, onClose]);

  const editedTotal = Object.values(editedPrices).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const renderPicker = () => (
    <View style={modalStyles.overlay}>
      <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
        <View style={modalStyles.header}>
          <Text
            style={[
              modalStyles.title,
              { color: theme.text, fontFamily: font.serif },
            ]}
          >
            Scan Receipt
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}
          >
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.description,
            { color: theme.textSecondary, fontFamily: font.body },
          ]}
        >
          Take a photo of your receipt and we'll match items to your list with
          prices filled in automatically.
        </Text>

        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.inputBg }]}
          onPress={() => pickImage('camera')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.optionIcon,
              { backgroundColor: PALETTE.sageLight + '30' },
            ]}
          >
            <Ionicons name="camera-outline" size={28} color={PALETTE.sage} />
          </View>
          <View style={styles.optionText}>
            <Text
              style={[
                styles.optionTitle,
                { color: theme.text, fontFamily: font.bodySemiBold },
              ]}
            >
              Take Photo
            </Text>
            <Text
              style={[
                styles.optionSubtitle,
                { color: theme.textSecondary, fontFamily: font.body },
              ]}
            >
              Use your camera to capture the receipt
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.inputBg }]}
          onPress={() => pickImage('library')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.optionIcon,
              { backgroundColor: PALETTE.terracottaLight + '30' },
            ]}
          >
            <Ionicons
              name="images-outline"
              size={28}
              color={PALETTE.terracotta}
            />
          </View>
          <View style={styles.optionText}>
            <Text
              style={[
                styles.optionTitle,
                { color: theme.text, fontFamily: font.bodySemiBold },
              ]}
            >
              Choose from Library
            </Text>
            <Text
              style={[
                styles.optionSubtitle,
                { color: theme.textSecondary, fontFamily: font.body },
              ]}
            >
              Select an existing photo of your receipt
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: PALETTE.rust + '15' }]}>
            <Ionicons name="alert-circle" size={18} color={PALETTE.rust} />
            <Text
              style={[
                styles.errorText,
                { color: PALETTE.rust, fontFamily: font.body },
              ]}
            >
              {error}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderUploading = () => (
    <View style={modalStyles.centeredOverlay}>
      <View
        style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}
      >
        <ActivityIndicator
          size="large"
          color={PALETTE.terracotta}
          style={{ marginBottom: 20 }}
        />
        <Text
          style={[
            modalStyles.centeredTitle,
            { color: theme.text, fontFamily: font.serif },
          ]}
        >
          Reading your receipt...
        </Text>
        <Text
          style={[
            modalStyles.centeredMsg,
            { color: theme.textSecondary, fontFamily: font.body },
          ]}
        >
          This may take a moment while we match items to your list.
        </Text>
      </View>
    </View>
  );

  const renderConfirming = () => (
    <View style={modalStyles.centeredOverlay}>
      <View
        style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}
      >
        <ActivityIndicator
          size="large"
          color={PALETTE.terracotta}
          style={{ marginBottom: 20 }}
        />
        <Text
          style={[
            modalStyles.centeredTitle,
            { color: theme.text, fontFamily: font.serif },
          ]}
        >
          Saving prices...
        </Text>
      </View>
    </View>
  );

  const renderReview = () => {
    if (!receiptData) return null;

    return (
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text
              style={[
                modalStyles.title,
                { color: theme.text, fontFamily: font.serif },
              ]}
            >
              Review Prices
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={[modalStyles.closeBtn, { backgroundColor: theme.inputBg }]}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {receiptData.store_name && (
            <View style={styles.storeRow}>
              <Ionicons
                name="storefront-outline"
                size={18}
                color={PALETTE.terracotta}
              />
              <Text
                style={[
                  styles.storeName,
                  { color: theme.text, fontFamily: font.bodySemiBold },
                ]}
              >
                {receiptData.store_name}
              </Text>
              {receiptData.receipt_total != null && (
                <Text
                  style={[
                    styles.receiptTotal,
                    { color: theme.textSecondary, fontFamily: font.body },
                  ]}
                >
                  Receipt total: {currencySymbol}
                  {receiptData.receipt_total.toFixed(2)}
                </Text>
              )}
            </View>
          )}

          <ScrollView
            style={styles.itemList}
            showsVerticalScrollIndicator={false}
          >
            {receiptData.matched_items.map((item) => (
              <View
                key={item.item_id}
                style={[styles.itemRow, { borderBottomColor: theme.border }]}
              >
                <View style={styles.itemInfo}>
                  <Text
                    style={[
                      styles.itemName,
                      { color: theme.text, fontFamily: font.bodySemiBold },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.receipt_name && item.receipt_name !== item.name && (
                    <Text
                      style={[
                        styles.receiptName,
                        { color: theme.textSecondary, fontFamily: font.body },
                      ]}
                    >
                      Receipt: {item.receipt_name}
                    </Text>
                  )}
                </View>
                <View style={styles.priceInput}>
                  <Text
                    style={[
                      styles.currencyLabel,
                      { color: theme.textSecondary, fontFamily: font.body },
                    ]}
                  >
                    {currencySymbol}
                  </Text>
                  <TextInput
                    style={[
                      styles.priceField,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontFamily: font.body,
                        borderColor: theme.border,
                      },
                    ]}
                    value={editedPrices[item.item_id] || ''}
                    onChangeText={(val) =>
                      setEditedPrices((prev) => ({
                        ...prev,
                        [item.item_id]: val,
                      }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text
              style={[
                styles.totalLabel,
                { color: theme.text, fontFamily: font.bodySemiBold },
              ]}
            >
              Total
            </Text>
            <Text
              style={[
                styles.totalValue,
                { color: PALETTE.terracotta, fontFamily: font.bodySemiBold },
              ]}
            >
              {currencySymbol}
              {editedTotal.toFixed(2)}
            </Text>
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: PALETTE.rust + '15' }]}>
              <Ionicons name="alert-circle" size={18} color={PALETTE.rust} />
              <Text
                style={[
                  styles.errorText,
                  { color: PALETTE.rust, fontFamily: font.body },
                ]}
              >
                {error}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.outlineButton,
                { borderColor: theme.border },
              ]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.outlineButtonText,
                  { color: theme.text, fontFamily: font.bodySemiBold },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: PALETTE.sage }]}
              onPress={confirmPrices}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={PALETTE.cream}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.confirmButtonText,
                  { fontFamily: font.bodySemiBold },
                ]}
              >
                Confirm & Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'picker':
        return renderPicker();
      case 'uploading':
        return renderUploading();
      case 'review':
        return renderReview();
      case 'confirming':
        return renderConfirming();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={step === 'uploading' || step === 'confirming' ? 'fade' : 'slide'}
      onRequestClose={handleClose}
    >
      {renderStep()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  storeName: {
    fontSize: 15,
  },
  receiptTotal: {
    fontSize: 13,
    marginLeft: 'auto',
  },
  itemList: {
    maxHeight: 340,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
  },
  receiptName: {
    fontSize: 12,
    marginTop: 2,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyLabel: {
    fontSize: 15,
    marginRight: 4,
  },
  priceField: {
    width: 80,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  outlineButtonText: {
    fontSize: 15,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    color: PALETTE.cream,
  },
});
