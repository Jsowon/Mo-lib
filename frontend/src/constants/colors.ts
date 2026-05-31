export const Colors = {
  background: {
    void: '#0A0914',
    deepSpace: '#0F0E19',
    nebulaBase: '#13111F',
    dust: '#1C1A2E',
    comet: '#252338',
  },
  accent: {
    pulsar: '#7B6FD4',
    aurora: '#A98FE0',
    nebulaRose: '#C97BAF',
    orbit: '#3D3475',
  },
  text: {
    starlight: '#E8E6F8',
    moonmist: '#A8A4C8',
    dusk: '#6B6785',
  },
  semantic: {
    success: '#7ECFB0',
    warning: '#E0906A',
    danger: '#D47AAA',
  },
} as const;

export type ColorPath =
  | `background.${keyof typeof Colors.background}`
  | `accent.${keyof typeof Colors.accent}`
  | `text.${keyof typeof Colors.text}`
  | `semantic.${keyof typeof Colors.semantic}`;
