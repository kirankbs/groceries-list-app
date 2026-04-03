import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTE } from './constants';
import type { Theme } from './types';

type ColorMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  theme: Theme;
  isDark: boolean;
};

const THEME_STORAGE_KEY = 'user_color_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setColorModeState(stored);
      }
    });
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const isDark = colorMode === 'dark' || (colorMode === 'system' && systemScheme === 'dark');

  const theme: Theme = useMemo(() => isDark ? {
    background: PALETTE.darkSurface,
    surfaceContainer: PALETTE.darkSurfaceContainer,
    surface: PALETTE.darkSurfaceCard,
    text: PALETTE.darkOnSurface,
    textSecondary: PALETTE.darkOnSurfaceVariant,
    inputBg: PALETTE.darkSurfaceHigh,
    primary: PALETTE.primaryContainer,
    primaryContainer: PALETTE.primaryContainer + '30',
    tertiary: PALETTE.tertiary,
    outline: PALETTE.darkOutline,
    outlineVariant: PALETTE.darkOutlineVariant,
    error: '#ffb4ab',
    border: PALETTE.darkOutlineVariant,
    isDark: true,
  } : {
    background: PALETTE.surface,
    surfaceContainer: PALETTE.surfaceContainer,
    surface: PALETTE.surfaceTop,
    text: PALETTE.onSurface,
    textSecondary: PALETTE.onSurfaceVariant,
    inputBg: PALETTE.surfaceContainer,
    primary: PALETTE.primary,
    primaryContainer: PALETTE.primaryContainer,
    tertiary: PALETTE.tertiary,
    outline: PALETTE.outline,
    outlineVariant: PALETTE.outlineVariant,
    error: PALETTE.error,
    border: PALETTE.outlineVariant,
    isDark: false,
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ colorMode, setColorMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
