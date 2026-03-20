export const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const PALETTE = {
  // Primary greens
  primary: '#006a28',
  primaryContainer: '#5cfd80',
  primaryDim: '#004d1c',
  // Light mode surfaces
  surface: '#f9f6f5',
  surfaceContainer: '#eae7e7',
  surfaceContainerHigh: '#dddada',
  surfaceTop: '#ffffff',
  // Text
  onSurface: '#1a1c1a',
  onSurfaceVariant: '#424940',
  outline: '#72796f',
  outlineVariant: '#c1c9bd',
  // Accents
  tertiary: '#ff9727',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  // Dark mode surfaces
  darkSurface: '#1a1f1a',
  darkSurfaceContainer: '#222822',
  darkSurfaceCard: '#2a332a',
  darkSurfaceHigh: '#313d31',
  darkOnSurface: '#e2e3dc',
  darkOnSurfaceVariant: '#c1c9bd',
  darkOutline: '#8b9389',
  darkOutlineVariant: '#3d4a3d',
  // Status colors
  statusActive: '#1b6ef3',
  statusInProgress: '#ff9727',
  statusCompleted: '#006a28',
};

export const AVAILABLE_ICONS = [
  'leaf-outline', 'nutrition-outline', 'water-outline', 'snow-outline', 'pizza-outline',
  'cafe-outline', 'restaurant-outline', 'fast-food-outline', 'ice-cream-outline', 'fish-outline',
  'beer-outline', 'wine-outline', 'flame-outline', 'flower-outline', 'basket-outline',
  'cart-outline', 'bag-outline', 'bag-handle-outline', 'pricetag-outline', 'grid-outline',
  'cube-outline', 'home-outline', 'construct-outline', 'shirt-outline', 'paw-outline',
  'medical-outline', 'bandage-outline', 'sparkles-outline', 'happy-outline', 'book-outline',
  'phone-portrait-outline', 'hardware-chip-outline', 'body-outline', 'sunny-outline',
  'aperture-outline', 'ellipse-outline', 'ellipsis-horizontal-outline',
];

export const AVAILABLE_COLORS = [
  '#006a28', '#f97316', '#3b82f6', '#dc2626', '#92400e',
  '#ec4899', '#9333ea', '#7c3aed', '#2563eb', '#0891b2',
  '#06b6d4', '#059669', '#16a34a', '#65a30d', '#ca8a04',
];

export const ITEM_UNITS = ['items', 'pcs', 'kg', 'g', 'lb', 'oz', 'L', 'ml', 'bags', 'boxes', 'cans', 'bottles', 'bunches'];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'Fr.', AUD: 'A$', CAD: 'C$',
  INR: '₹', JPY: '¥', CNY: '¥', KRW: '₩',
};
