import { StyleSheet } from 'react-native';
import { PALETTE } from './constants';

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(29, 20, 14, 0.5)', justifyContent: 'flex-end' as const },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  formLabel: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  input: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: PALETTE.linen },
  primaryButton: { backgroundColor: PALETTE.terracotta, paddingVertical: 14, borderRadius: 14, alignItems: 'center' as const },
  buttonDisabled: { backgroundColor: PALETTE.sand, opacity: 0.6 },
  primaryButtonText: { color: PALETTE.cream, fontSize: 16 },
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(29, 20, 14, 0.6)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24 },
  centeredContent: { width: '100%' as any, maxWidth: 320, borderRadius: 20, padding: 28, alignItems: 'center' as const },
  centeredIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 16 },
  centeredTitle: { fontSize: 20, marginBottom: 8 },
  centeredMsg: { fontSize: 14, textAlign: 'center' as const, marginBottom: 20, lineHeight: 20 },
  centeredButtons: { flexDirection: 'row' as const, gap: 12, width: '100%' as any },
  centeredBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' as const },
});
