export const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const PALETTE = {
  cream: '#FBF5EB',
  creamDark: '#F3E9D8',
  parchment: '#F0E4D0',
  linen: '#E8DBC8',
  terracotta: '#C2644B',
  terracottaLight: '#D4916B',
  terracottaDark: '#A04E38',
  sage: '#7B9E6B',
  sageLight: '#A3C293',
  sageMuted: '#8FA97F',
  olive: '#6B7F3B',
  forest: '#4A6741',
  warmBrown: '#3D2B1F',
  chestnut: '#5C4033',
  cocoa: '#8B7355',
  sand: '#C4B197',
  dustyRose: '#C9907A',
  clay: '#B87352',
  amber: '#D4915E',
  rust: '#B5452A',
  darkBg: '#1A1310',
  darkSurface: '#2A1F18',
  darkInput: '#342820',
  darkText: '#F5E6D3',
  darkTextSec: '#A08B72',
};

export const AVAILABLE_ICONS = [
  'cart-outline', 'basket-outline', 'bag-outline', 'bag-handle-outline', 'pricetag-outline',
  'restaurant-outline', 'pizza-outline', 'cafe-outline', 'fast-food-outline', 'ice-cream-outline',
  'fish-outline', 'beer-outline', 'wine-outline', 'nutrition-outline', 'flame-outline',
  'leaf-outline', 'flower-outline', 'sunny-outline', 'water-outline',
  'grid-outline', 'ellipse-outline', 'aperture-outline', 'snow-outline', 'cube-outline',
  'medical-outline', 'bandage-outline',
  'sparkles-outline', 'home-outline', 'construct-outline',
  'shirt-outline', 'body-outline',
  'happy-outline',
  'phone-portrait-outline', 'hardware-chip-outline', 'laptop-outline',
  'paw-outline', 'book-outline', 'ellipsis-horizontal-outline',
];

export const AVAILABLE_COLORS = [
  '#7B9E6B', '#5B8A72', '#6B7F3B', '#C2644B', '#B87352',
  '#D4915E', '#C9907A', '#8B7355', '#6B5B4F', '#9E8B7C',
  '#A04E38', '#D4A76A', '#7A8E5D', '#5C7A6B', '#B5814B',
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'Fr.', AUD: 'A$', CAD: 'C$',
  INR: '₹', JPY: '¥', CNY: '¥', KRW: '₩',
};
