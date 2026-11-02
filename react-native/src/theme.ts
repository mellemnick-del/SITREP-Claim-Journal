import { useColorScheme } from 'react-native';

export type Palette = {
  bg: string;
  surface: string;
  sunken: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  flare: string;
  flareSoft: string;
  warn: string;
  warnSoft: string;
  ok: string;
  okSoft: string;
};

const light: Palette = {
  bg: '#ECEEE5',
  surface: '#F8F9F3',
  sunken: '#E2E5D9',
  fg: '#1D2219',
  muted: '#5C6455',
  line: '#CBD0C0',
  accent: '#3E5A28',
  accentInk: '#F4F7EE',
  accentSoft: '#DCE5CF',
  flare: '#B0472C',
  flareSoft: '#F2DDD5',
  warn: '#9A6A12',
  warnSoft: '#F1E5C8',
  ok: '#2F6B3F',
  okSoft: '#D6E8D9',
};

const dark: Palette = {
  bg: '#12160F',
  surface: '#1A1F17',
  sunken: '#232A1F',
  fg: '#E2E7D8',
  muted: '#9AA38F',
  line: '#2F3829',
  accent: '#A3C27A',
  accentInk: '#13180F',
  accentSoft: '#2A3820',
  flare: '#E77F5F',
  flareSoft: '#3A2219',
  warn: '#DDB45A',
  warnSoft: '#362C16',
  ok: '#7CC48C',
  okSoft: '#1D3423',
};

export const fonts = {
  display: 'SairaCondensed_600SemiBold',
  displayBold: 'SairaCondensed_700Bold',
  body: 'PublicSans_400Regular',
  bodyMedium: 'PublicSans_500Medium',
  bodySemi: 'PublicSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
