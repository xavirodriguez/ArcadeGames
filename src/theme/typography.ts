import { Platform } from "react-native";

export const fonts = {
  display: Platform.select({
    ios: "AvenirNextCondensed-Bold",
    android: "sans-serif-condensed",
    web: "Arial Narrow, sans-serif",
    default: "System",
  }),
  data: Platform.select({
    ios: "Menlo-Bold",
    android: "monospace",
    web: "Courier New, monospace",
    default: "monospace",
  }),
  ui: Platform.select({
    ios: "System",
    android: "sans-serif",
    web: "system-ui, sans-serif",
    default: "System",
  }),
} as const;

export const typography = {
  game: fonts.data,
  fonts,

  weights: {
    regular: "400" as const,
    medium: "600" as const,
    bold: "700" as const,
    heavy: "900" as const,
  },

  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,

    // Unified hierarchy scale
    small: 12,
    label: 14,
    body: 18,
    heading: 32,
    title: 48,
    bigTitle: 64,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1.5,
    widest: 3.5,
  },

  lineHeights: {
    tight: 1.1,
    normal: 1.3,
    relaxed: 1.5,
  },
} as const;
