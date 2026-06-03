export const Colors = {
  background: {
    void: '#0A0914',
    deepSpace: '#0F0E19',
    nebulaBase: '#13111F',
    dust: '#1C1A2E',
    comet: '#252338',
    card: '#1A1830',
    elevated: '#151D30',
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.45)',
    overlayDark: 'rgba(0, 0, 0, 0.7)',
    overlayHeavy: 'rgba(0, 0, 0, 0.8)',
    input: '#1E293B',
    modal: '#141B2D',
    header: '#0D0B1E',
    search: 'rgba(0, 0, 0, 0.4)',
    dimmed: 'rgba(28, 26, 46, 0.85)',
  },
  accent: {
    pulsar: '#7B6FD4',
    aurora: '#A98FE0',
    nebulaRose: '#C97BAF',
    orbit: '#3D3475',
    primary: '#C084A0',
    primaryLight: '#D97BA0',
    primaryButton: '#E8547A',
    subtle: 'rgba(232, 230, 248, 0.15)',
  },
  text: {
    starlight: '#E8E6F8',
    moonmist: '#A8A4C8',
    dusk: '#6B6785',
    primary: '#FFFFFF',
    secondary: '#8899BB',
    tertiary: '#6B7A99',
    muted: '#555577',
    placeholder: '#4A5568',
    disabled: '#4A5A7A',
    link: '#9B8FFF',
  },
  semantic: {
    success: '#7ECFB0',
    warning: '#E0906A',
    danger: '#D47AAA',
    error: '#E05555',
    errorBorder: '#E05C6E',
    star: '#F4C430',
  },
  domain: {
    movie: '#E05C6E',
    book: '#5CA8E0',
    music: '#7C5CE0',
  },
  border: {
    default: '#1E1C35',
    input: '#2A2845',
    card: '#1E293B',
    subtle: 'rgba(232, 230, 248, 0.1)',
  },
  ui: {
    transparent: 'transparent',
    shadow: '#000',
    divider: '#3A4458',
    inactive: '#333355',
    hover: '#2A2845',
    pressed: '#252540',
    badge: '#2A3B4D',
  },
} as const;

export type ColorPath =
  | `background.${keyof typeof Colors.background}`
  | `accent.${keyof typeof Colors.accent}`
  | `text.${keyof typeof Colors.text}`
  | `semantic.${keyof typeof Colors.semantic}`
  | `domain.${keyof typeof Colors.domain}`
  | `border.${keyof typeof Colors.border}`
  | `ui.${keyof typeof Colors.ui}`;
