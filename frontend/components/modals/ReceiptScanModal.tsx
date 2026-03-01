import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../contexts/AuthContext';
import { modalStyles } from '../sharedStyles';
import { Theme } from '../types';
import { EXPO_PUBLIC_BACKEND_URL } from '../constants';

interface MatchedItem {
  item_id: string;
  item_name: string;
  matched_receipt_line: string;
  price: number;
  confidence: 'high' | 'medium' | 'low';
}

interface ReceiptResult {
  receipt_id: string;
  store_name?: string;
  currency: string;
  receipt_total?: number;
  matched_total?: number;
  matched_items: MatchedItem[];
  status?: string;
  error_message?: string;
}

interface Props {
  visible: boolean;
  theme: Theme;
  listId: string;
  onClose: () => void;
  onPricesSaved: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'Fr.', AUD: 'A$', CAD: 'C$',
};

type Step = 'picker' | 'uploading' | 'review' | 'confirming';

export function ReceiptScanModal({ visible, theme, listId, onClose, onPricesSaved }: Props) {
  const { sessionToken, currentWorkspace } = useAuth();
  const [step, setStep] = useState<Step>('picker');
  const [receiptResult, setReceiptResult] = useState<ReceiptResult | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const currency = currentWorkspace?.currency || 'EUR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const handleClose = () => {
    setStep('picker');
    setReceiptResult(null);
    setEditedPrices({});
    setError(null);
    onClose();
  };

  const pollForResult = async (receiptId: string): Promise<void> => {
    const maxPolls = 40; // Up to 120s (40 × 3s)
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const resp = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/receipts/${receiptId}`,
        { headers: { 'Authorization': `Bearer ${sessionToken}` } }
      );

      if (!resp.ok) throw new Error('Failed to check processing status');

      const data: ReceiptResult = await resp.json();

      if (data.status === 'completed') {
        if (!data.matched_items || data.matched_items.length === 0) {
          setError('No matching items found. Make sure items on the receipt are in your list.');
          setStep('picker');
          return;
        }
        const prices: Record<string, string> = {};
        data.matched_items.forEach(item => { prices[item.item_id] = item.price.toFixed(2); });
        setReceiptResult(data);
        setEditedPrices(prices);
        setStep('review');
        return;
      }

      if (data.status === 'failed') {
        throw new Error(data.error_message || 'Failed to process receipt. Please try again.');
      }
      // still 'processing' — loop continues
    }
    throw new Error('Receipt processing timed out. Please try again with a clearer photo.');
  };

  const pickAndUpload = async (source: 'camera' | 'library') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setError('Camera permission denied. Please enable it in settings.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setError('Photo library permission denied. Please enable it in settings.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setStep('uploading');
      setError(null);

      // Compress / resize to max 1500px on the longest side
      let imageUri = asset.uri;
      const maxDim = 1500;
      const w = asset.width || 0;
      const h = asset.height || 0;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: Math.round(w * ratio), height: Math.round(h * ratio) } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        imageUri = manipResult.uri;
      }

      // Build FormData
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(imageUri).then(r => r.blob());
        formData.append('image', blob, 'receipt.jpg');
      } else {
        formData.append('image', { uri: imageUri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
      }

      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/lists/${listId}/upload-receipt`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).detail || 'Failed to upload receipt');
      }

      const { receipt_id } = await response.json();

      // Poll until completed / failed (background processing avoids proxy timeout)
      await pollForResult(receipt_id);

    } catch (e: any) {
      setError(e.message || 'Could not read receipt. Please try a clearer photo.');
      setStep('picker');
    }
  };

  const handleConfirm = async () => {
    if (!receiptResult) return;
    setStep('confirming');
    try {
      const confirmedItems = receiptResult.matched_items
        .filter(item => {
          const v = parseFloat(editedPrices[item.item_id] || '');
          return !isNaN(v) && v >= 0;
        })
        .map(item => ({
          item_id: item.item_id,
          price: parseFloat(editedPrices[item.item_id]),
        }));

      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/receipts/${receiptResult.receipt_id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ confirmed_items: confirmedItems }),
        }
      );

      if (!response.ok) throw new Error('Failed to save prices');

      onPricesSaved();
      handleClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save prices. Please try again.');
      setStep('review');
    }
  };

  const matchedTotal = receiptResult?.matched_items
    ? receiptResult.matched_items.reduce((sum, item) => {
        const p = parseFloat(editedPrices[item.item_id] || '0');
        return sum + (isNaN(p) ? 0 : p);
      }, 0)
    : 0;

  // ─── Processing overlay ────────────────────────────────────────────────────
  if (step === 'uploading' || step === 'confirming') {
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={modalStyles.centeredOverlay}>
          <View style={[modalStyles.centeredContent, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginBottom: 16 }} />
            <Text style={[s.processingTitle, { color: theme.text }]}>
              {step === 'uploading' ? 'Reading your receipt...' : 'Saving prices...'}
            </Text>
            {step === 'uploading' && (
              <Text style={[s.processingSubtitle, { color: theme.textSecondary }]}>
                AI is extracting and matching items
              </Text>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Review modal ──────────────────────────────────────────────────────────
  if (step === 'review' && receiptResult) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.content, { backgroundColor: theme.surface, maxHeight: '88%' as any }]}>
            <View style={modalStyles.header}>
              <View>
                <Text style={[modalStyles.title, { color: theme.text }]}>Review Receipt</Text>
                {receiptResult.store_name ? (
                  <Text style={[s.storeName, { color: theme.textSecondary }]}>
                    {receiptResult.store_name}
                    {receiptResult.receipt_total
                      ? ` · Total: ${currencySymbol}${receiptResult.receipt_total.toFixed(2)}`
                      : ''}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={handleClose} testID="close-review-modal">
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="warning-outline" size={18} color="#E53935" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={[s.hint, { color: theme.textSecondary }]}>
              Edit prices if needed, then confirm to save.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {receiptResult.matched_items.map(item => (
                <View
                  key={item.item_id}
                  style={[s.reviewRow, { borderBottomColor: theme.inputBg }]}
                  testID={`review-row-${item.item_id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reviewName, { color: theme.text }]}>{item.item_name}</Text>
                    <Text style={[s.reviewLine, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.matched_receipt_line}
                    </Text>
                  </View>
                  <View style={s.priceWrapper}>
                    <Text style={[s.currencyLabel, { color: theme.textSecondary }]}>{currencySymbol}</Text>
                    <TextInput
                      style={[s.priceInput, { color: theme.text, borderColor: theme.inputBg }]}
                      value={editedPrices[item.item_id] || ''}
                      onChangeText={val => setEditedPrices(prev => ({ ...prev, [item.item_id]: val }))}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      testID={`price-input-${item.item_id}`}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[s.totalRow, { borderTopColor: theme.inputBg }]}>
              <Text style={[s.totalLabel, { color: theme.textSecondary }]}>Total matched:</Text>
              <Text style={[s.totalValue, { color: '#4CAF50' }]}>
                {currencySymbol}{matchedTotal.toFixed(2)}
              </Text>
            </View>

            <View style={s.actions}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: theme.inputBg }]}
                onPress={handleClose}
                testID="cancel-receipt-btn"
              >
                <Text style={[s.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={handleConfirm}
                testID="confirm-receipt-btn"
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={s.confirmText}>Confirm & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Picker step (default) ─────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: theme.surface }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Scan Receipt</Text>
            <TouchableOpacity onPress={handleClose} testID="close-receipt-modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="warning-outline" size={18} color="#E53935" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={[s.description, { color: theme.textSecondary }]}>
            Take a photo or upload a picture of your receipt. AI will match prices to your list automatically.
          </Text>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[s.option, { backgroundColor: theme.inputBg }]}
              onPress={() => pickAndUpload('camera')}
              testID="receipt-camera-btn"
            >
              <View style={[s.optionIcon, { backgroundColor: '#4CAF5020' }]}>
                <Ionicons name="camera-outline" size={26} color="#4CAF50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optionTitle, { color: theme.text }]}>Take Photo</Text>
                <Text style={[s.optionSubtitle, { color: theme.textSecondary }]}>Use your camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.option, { backgroundColor: theme.inputBg }]}
            onPress={() => pickAndUpload('library')}
            testID="receipt-library-btn"
          >
            <View style={[s.optionIcon, { backgroundColor: '#2196F320' }]}>
              <Ionicons name="images-outline" size={26} color="#2196F3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.optionTitle, { color: theme.text }]}>Choose from Library</Text>
              <Text style={[s.optionSubtitle, { color: theme.textSecondary }]}>Pick an existing photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = {
  description: { fontSize: 14, marginBottom: 20, lineHeight: 20 as number },
  option: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    padding: 14, borderRadius: 12, gap: 14, marginBottom: 12,
  },
  optionIcon: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  optionTitle: { fontSize: 16, fontWeight: '600' as const },
  optionSubtitle: { fontSize: 13, marginTop: 2 },
  processingTitle: { fontSize: 18, fontWeight: '600' as const, textAlign: 'center' as const },
  processingSubtitle: { fontSize: 14, textAlign: 'center' as const, marginTop: 6 },
  errorBox: {
    flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8,
    backgroundColor: '#FEECEC', padding: 12, borderRadius: 8, marginBottom: 14,
  },
  errorText: { flex: 1, color: '#E53935', fontSize: 14 },
  storeName: { fontSize: 13, marginTop: 2 },
  hint: { fontSize: 13, marginBottom: 10 },
  reviewRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 12, borderBottomWidth: 1, gap: 12,
  },
  reviewName: { fontSize: 15, fontWeight: '500' as const },
  reviewLine: { fontSize: 12, marginTop: 2 },
  priceWrapper: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  currencyLabel: { fontSize: 16, fontWeight: '500' as const },
  priceInput: {
    width: 76, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
    fontSize: 16, textAlign: 'right' as const,
  },
  totalRow: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, paddingVertical: 12, borderTopWidth: 1, marginBottom: 12,
  },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 18, fontWeight: '700' as const },
  actions: { flexDirection: 'row' as const, gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, alignItems: 'center' as const,
  },
  cancelText: { fontSize: 15, fontWeight: '600' as const },
  confirmBtn: {
    flex: 2, flexDirection: 'row' as const, backgroundColor: '#4CAF50',
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
};
