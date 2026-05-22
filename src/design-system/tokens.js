// Glowy design system — single source of truth for all visual tokens.
// Tokens are theme-aware: pick light or dark via getTokens(theme).

const palette = {
  black: '#000000',
  white: '#FFFFFF',
  green: '#00F345',
};

const light = {
  appBg: '#fbfbfb',
  panelBg: '#ececec',
  sectionBg: '#f7f7f7',
  tabInactive: '#ececec',
  tabHover: '#e0e0e0',
  tabActive: '#ececec',
  tabActiveText: '#0A0A0B',
  textPrimary: '#0A0A0B',
  textMuted: '#5F5F66',
  textSubtle: '#8A8A93',
  border: '#D4D4D8',
  accent: palette.black,
  accentInverse: palette.white,
  sliderTrack: '#CECECE',
  modalBg: palette.white,
};

const dark = {
  appBg: '#141414',
  panelBg: '#181818',
  sectionBg: '#1e1e1e',
  tabInactive: '#1e1e1e',
  tabHover: '#252525',
  tabActive: '#2a2a2a',
  tabActiveText: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textMuted: '#999999',
  textSubtle: '#666666',
  border: '#3A3A3A',
  accent: palette.white,
  accentInverse: palette.black,
  sliderTrack: '#3A3A3A',
  modalBg: '#181818',
};

export const palettes = { light, dark };

export const getTokens = (theme) => (theme === 'light' ? light : dark);

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  family: "'Geist', sans-serif",
  weight: { regular: 500 },
  size: {
    xs: 10,
    sm: 11,
    base: 12,
    md: 13,
    lg: 15,
    xl: 20,
  },
};

export const motion = {
  duration: { fast: 150, base: 200, slow: 320 },
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export const breakpoints = {
  mobile: 640,
  tablet: 1024,
};
