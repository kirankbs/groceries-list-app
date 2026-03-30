# Design System

## Fonts
- **Display/headings:** Plus Jakarta Sans (400, 500, 600, 700) — `@expo-google-fonts/plus-jakarta-sans`
- **Body/UI:** Inter (400, 500, 600, 700) — `@expo-google-fonts/inter`

## FontMap Keys

| Key | Actual Font |
|---|---|
| `display` | PlusJakartaSans_700Bold |
| `displayMedium` | PlusJakartaSans_600SemiBold |
| `displayRegular` | PlusJakartaSans_400Regular |
| `body` | Inter_400Regular |
| `bodyMedium` | Inter_500Medium |
| `bodySemiBold` | Inter_600SemiBold |
| `bodyBold` | Inter_700Bold |
| `serif` | PlusJakartaSans_700Bold (alias) |
| `serifMedium` | PlusJakartaSans_500Medium (alias) |

## PALETTE Token Table (Light Mode)

| Token | Value | Role |
|---|---|---|
| `primary` | `#006a28` | Primary action, icons, borders |
| `primaryContainer` | `#5cfd80` | Highlighted containers |
| `primaryDim` | `#004d1c` | Deeper primary shade |
| `surface` | `#f9f6f5` | Light mode background |
| `surfaceContainer` | `#eae7e7` | Card surface |
| `surfaceContainerHigh` | `#dddada` | Elevated container |
| `surfaceTop` | `#ffffff` | White card surface |
| `onSurface` | `#1a1c1a` | Primary text |
| `onSurfaceVariant` | `#424940` | Secondary text |
| `outline` | `#72796f` | Borders, muted icons |
| `outlineVariant` | `#c1c9bd` | Subtle borders |
| `tertiary` | `#ff9727` | Accent/warning |
| `error` | `#ba1a1a` | Error states |
| `errorContainer` | `#ffdad6` | Error backgrounds |
| `statusActive` | `#1b6ef3` | Blue — active status badge |
| `statusInProgress` | `#ff9727` | Orange — in-progress badge |
| `statusCompleted` | `#006a28` | Green — completed badge |

## Dark Mode Color Tokens

| Token | Value | Role |
|---|---|---|
| `darkSurface` | `#1a1f1a` | Dark mode background |
| `darkSurfaceContainer` | `#222822` | Dark mode container |
| `darkSurfaceCard` | `#2a332a` | Dark mode card |
| `darkSurfaceHigh` | `#313d31` | Dark mode elevated |
| `darkOnSurface` | `#e2e3dc` | Primary text (dark) |
| `darkOnSurfaceVariant` | `#c1c9bd` | Secondary text (dark) |
| `darkOutline` | `#8b9389` | Borders (dark) |
| `darkOutlineVariant` | `#3d4a3d` | Subtle borders (dark) |

## Legacy Aliases (referenced by modals)

| Token | Value | Notes |
|---|---|---|
| `rust` | `#ba1a1a` | Same as `error` |
| `sage` | `#006a28` | Same as `primary` |
| `sageLight` | `#e6f4ea` | Light sage tint |
| `sand` | `#9ca3af` | Muted gray |
| `cream` | `#fffbf7` | Warm white |
| `clay` | `#92400e` | Dark amber |
| `terracotta` | `#f97316` | Orange accent |
| `terracottaLight` | `#fff7ed` | Light orange tint |

## Theme Object (light vs dark)

| Key | Light | Dark |
|---|---|---|
| `background` | `#f9f6f5` | `#1a1f1a` |
| `surfaceContainer` | `#eae7e7` | `#222822` |
| `surface` | `#ffffff` | `#2a332a` |
| `text` | `#1a1c1a` | `#e2e3dc` |
| `textSecondary` | `#424940` | `#c1c9bd` |
| `inputBg` | `#eae7e7` | `#313d31` |
| `primary` | `#006a28` | `#5cfd80` |
| `primaryContainer` | `#5cfd80` | `#5cfd80` + `'30'` alpha |
| `tertiary` | `#ff9727` | `#ff9727` |
| `outline` | `#72796f` | `#8b9389` |
| `outlineVariant` | `#c1c9bd` | `#3d4a3d` |
| `error` | `#ba1a1a` | `#ffb4ab` |
| `border` | `#c1c9bd` | `#3d4a3d` |
| `isDark` | `false` | `true` |

## AVAILABLE_COLORS (15 — category color picker)
`#006a28 #f97316 #3b82f6 #dc2626 #92400e #ec4899 #9333ea #7c3aed #2563eb #0891b2 #06b6d4 #059669 #16a34a #65a30d #ca8a04`

## AVAILABLE_ICONS (37 Ionicons names — category icon picker)
`leaf-outline nutrition-outline water-outline snow-outline pizza-outline cafe-outline restaurant-outline fast-food-outline ice-cream-outline fish-outline beer-outline wine-outline flame-outline flower-outline basket-outline cart-outline bag-outline bag-handle-outline pricetag-outline grid-outline cube-outline home-outline construct-outline shirt-outline paw-outline medical-outline bandage-outline sparkles-outline happy-outline book-outline phone-portrait-outline hardware-chip-outline body-outline sunny-outline aperture-outline ellipse-outline ellipsis-horizontal-outline`

## ITEM_UNITS
`items pcs kg g lb oz L ml bags boxes cans bottles bunches`

## LIST_COLORS (rotating colors for list icons)
`#006a28 #3b82f6 #f97316 #8b5cf6 #ec4899 #14b8a6`

## CURRENCY_SYMBOLS
`EUR→€ USD→$ GBP→£ CHF→Fr. AUD→A$ CAD→C$ INR→₹ JPY→¥ CNY→¥ KRW→₩`

**Known mismatch:** Backend `PUT /api/workspaces/{id}/currency` only accepts `EUR USD GBP CHF AUD CAD` (6 currencies). The frontend constant includes 4 additional symbols (INR, JPY, CNY, KRW) that the backend rejects.

## Global Interactive States
- Hover: background color change or slight opacity increase
- Active/pressed: `scale(0.95)` or `scale(0.98)` — 200ms transition
- Focus (inputs): 2px ring in primary color at 20% opacity
- Transitions: 200–300ms duration, ease-out

## Border Radius Scale
- 12px — buttons, cards
- 16px — larger containers, modals
- 24px — hero sections
- 32px — full-bleed modals
- full — icon circles, avatars
