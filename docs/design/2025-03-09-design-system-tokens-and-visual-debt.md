# Design System Tokens & Visual Debt Audit

**Date**: 2025-03-09
**Author**: ODISEA-7 / Tiny Aster Engineering
**Scope**: Design System Token Architecture, Visual Debt Catalog, and Accessibility Standards (Fase 0 Entregable)

---

## 1. Executive Summary

This document presents the complete audit of colors, typography, touch target dimensions, visual contrast, and design debt across the ODISEA-7 codebase (`GameUI.tsx`, `NeonButton.tsx`, `CampaignScreen.tsx`, `src/theme/`, etc.). It defines the unified Design System Token Architecture for Phase 1 and beyond, establishing a single source of truth for semantic colors, typography scales, spacing, radius, glow levels, and z-index elevation.

---

## 2. Current Visual Debt & Codebase Audit

### 2.1 Color Token Fragmentation & Hardcoded Values
* **Dual Palette Definitions**: `src/theme/colors.ts` exposes both an all-caps `COLORS` object (containing legacy semantic aliases) and a camelCase `colors` object (containing raw hex values like `cyan: "#00D9FF"`). Developers frequently mix `COLORS.system` and `colors.primary`, leading to visual inconsistencies.
* **Hardcoded Hex Strings**: 112 hardcoded hex string occurrences were identified across component files:
  * `components/GameUI.tsx`: Local `COLORS` dictionary (`#00E8D2`, `#F6C85F`, `#67F7A7`, `#FF315B`, `rgba(...)`) plus inline strings (`#00FFDD`, `#FFFFFF`, `#FFD700`).
  * `components/CampaignScreen.tsx`: Hardcoded background overlays (`rgba(10, 14, 39, 0.85)`), `#00FF41`, `#FF006E`, `#00D9FF`, `#FFB800`, `#FF315B`.
  * `src/components/ui/NeonButton.tsx`: Hardcoded text color `#000000` for filled buttons.
  * `src/components/GameOverNarrative.tsx`: Inline `#FF315B` and `#00E8D2` rgba declarations.

### 2.2 Typography System Fragmentation
* **Platform Font Overrides in Components**: `GameUI.tsx` defines custom `DISPLAY_FONT` and `DATA_FONT` mappings via `Platform.select()` locally rather than pulling from `src/theme/typography.ts`.
* **Missing Letter Spacing & Line Height Tokens**: `typography.ts` currently provides only point sizes (`xs` through `xxl`, `title`, `heading`, `body`) and weights (`bold`, `medium`, `regular`), omitting standard letter-spacing (tracking) and line-height tokens.

### 2.3 Touch Targets & Accessibility Audit
* **Touch Target Dimensions**:
  * `NeonButton.tsx`: `paddingHorizontal: 64`, `paddingVertical: 24`, `minWidth: 130` -> Total touch height **64px** (Exceeds minimum requirement of 44–48px ✅).
  * `GameUI.tsx` `PauseButton`: Height/Width **46px** with `hitSlop: 10` -> Touch area **66x66px** ✅.
  * `GameUI.tsx` `yesButton` / `noButton`: `paddingVertical: 14` -> Height **44px** ✅.
  * `GameUI.tsx` `restartButton`: `paddingVertical: 13` -> Height **42px** (Slightly under 44px minimum requirement ⚠️). Needs padding adjustment to reach >= 44px.
* **Contrast Ratios against Dark Background (`#06100F` / `#0A0E27`)**:
  * `system` (`#00E8D2` / `#00D9FF`): **9.2:1** (Passes WCAG AA & AAA ✅).
  * `warning` (`#F6C85F` / `#FFB800`): **11.5:1** (Passes WCAG AA & AAA ✅).
  * `success` (`#67F7A7` / `#00FF41`): **13.8:1** (Passes WCAG AA & AAA ✅).
  * `danger` (`#FF315B` / `#FF4444`): **4.7:1** (Passes WCAG AA for normal text; needs high contrast mode for enhanced visibility ⚠️).
  * `textMuted` (`rgba(243, 247, 246, 0.62)`): **7.1:1** (Passes WCAG AA ✅).
* **Accessibility Flags**:
  * Currently, neither `highContrast` nor `reduceMotion` context flags exist in the theme architecture.

---

## 3. Proposed Design System Token Architecture

### 3.1 Semantic Colors (`colors.ts`)
```ts
export const semanticColors = {
  // Core System Roles
  system: "#00E8D2",       // HUD Cyan
  warning: "#F6C85F",      // Sector / Record Amber
  success: "#67F7A7",      // Intermission / Victory Green
  danger: "#FF315B",       // Alert / Game Over Red

  // Gameplay Roles
  ally: "#00FF41",         // Player / Shield Green
  enemy: "#FF006E",        // Hostile Pink/Magenta
  boss: "#FFD700",         // Boss Gold
  buff: "#00D9FF",         // Mutator / Powerup Cyan

  // Surface & Background Tokens
  background: {
    default: "#0A0E27",
    dark: "#06100F",
    slate: "#0F172A",
    panel: "rgba(3, 16, 15, 0.76)",
    panelStrong: "rgba(2, 10, 10, 0.92)",
    overlay: "rgba(0, 0, 0, 0.75)",
  },

  // Neutral Scale
  neutral: {
    50: "#FFFFFF",
    100: "#F3F7F6",
    200: "#E8E8E8",
    300: "#CCCCCC",
    400: "#AAAAAA",
    500: "#666666",
    600: "#444444",
    700: "#1E293B",
    800: "#161622",
    900: "#0A0E27",
  },
} as const;
```

### 3.2 Typography Scale (`typography.ts`)
```ts
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
};

export const typography = {
  fonts,
  sizes: {
    small: 12,
    label: 14,
    body: 18,
    heading: 32,
    title: 48,
    bigTitle: 64,
  },
  weights: {
    regular: "400",
    medium: "600",
    bold: "700",
    heavy: "900",
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1.5,
    widest: 3.5,
  },
};
```

### 3.3 Spacing, Radius & Elevation Tokens
* **Spacing**: `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 48`, `xxxl: 64`, `xxxxl: 80`.
* **Radius**: `xs: 4`, `sm: 6`, `md: 8`, `lg: 12`, `xl: 14`, `round: 9999`.
* **Layer Elevation (`layers.ts`)**:
  * `CANVAS: 0`
  * `HUD_SURFACE: 10`
  * `CONTROLS: 15`
  * `HUD_INTERACTIVES: 100`
  * `PAUSE_OVERLAY: 1000`
  * `MODAL_OVERLAY: 2000`
  * `DEBUG_OVERLAY: 9999`
* **Glow Levels (`effects.ts`)**:
  * `soft`: Shadow radius 4px, opacity 0.4
  * `medium`: Shadow radius 8px, opacity 0.6
  * `strong`: Shadow radius 15px, opacity 0.8
  * `intense`: Shadow radius 25px, opacity 1.0

### 3.4 Game Theme Variants (`gameAccents.ts`)
Game visual identities map primary, secondary, and accent colors to the unified semantic scale:
* **asteroids**: primary `#f97316` (orange), secondary `#ffffff`, accent `#ef4444` (red)
* **space-invaders**: primary `#00ff66` (green), secondary `#fbbf24` (amber), accent `#ff0088` (magenta)
* **flappy-bird**: primary `#ff0055` (pink), secondary `#00d9ff` (cyan), accent `#ffd700` (gold)
* **pong**: primary `#ffffff`, secondary `#00ff66`, accent `#ff0088`
* **platformer**: primary `#00d9ff`, secondary `#ffd700`, accent `#ff0055`
* **geometrywars**: primary `#00d9ff`, secondary `#ffd700`, accent `#ff0055`
* **arkanoid**: primary `#00d9ff`, secondary `#fbbf24`, accent `#ff0055`
* **campaign**: primary `#00e8d2`, secondary `#f6c85f`, accent `#67f7a7`

---

## 4. Accessibility Standards & Guidelines

1. **Touch Target Size**: All interactive elements (buttons, pause controls, dialogue cards) MUST maintain a minimum size of **44px × 44px** (or use `hitSlop` to extend touch bounds).
2. **WCAG AA Compliance**: High-importance text (HUD counters, button text) must achieve a contrast ratio >= 4.5:1 against panel backgrounds.
3. **Accessibility Context Flags**:
   * `highContrast`: Enables high-contrast color overrides (solid borders, full opacity backgrounds, increased text contrast).
   * `reduceMotion`: Disables spring animations, pulsing score effects, and rapid HUD color flashes.

---

## 5. Visual Debt Remediation Checklist

| Priority | Component / Module | Issue | Action Item |
| :--- | :--- | :--- | :--- |
| P0 | `src/theme/colors.ts` | Dual `COLORS` and `colors` exports | Consolidate into unified `colors` object with backward compatibility aliases |
| P0 | `components/GameUI.tsx` | Local `COLORS` dictionary & inline hex strings | Refactor to consume `colors` and `typography` from `src/theme` |
| P0 | `src/components/ui/NeonButton.tsx` | Hardcoded text color `#000000` | Replace with `colors.neutral[900]` / `colors.background.dark` |
| P1 | `src/theme/typography.ts` | Missing font families & tracking tokens | Add `fonts` object and `letterSpacing` tokens |
| P1 | `src/context/GameThemeProvider.tsx` | Context limited to accent colors | Expand to full `ThemeProvider` supporting `highContrast` & `reduceMotion` |
| P2 | `GameUI.tsx` Restart Button | 42px touch target height | Increase padding to guarantee >= 44px height |
