# ADR-002: Design System and UI Architecture Guidelines

## Status
Accepted

## Context
As the codebase grew to support multiple retro games (Asteroids, Space Invaders, Flappy Bird, Pong, Geometry Wars, Echo Runner), visual design tokens and screen styles became scattered across local components, custom color objects, and duplicate inline stylesheets.

To maintain visual cohesion across web and native platforms, simplify theme updates, and eliminate duplicate styling, we established a centralized Design System architecture.

## Decision
We enforce the following four architectural rules across all UI components and game screens:

1. **No direct hex colors in components:** Hardcoded color hex values (`"#..."`) must not be used directly in component files. All colors must be imported from `src/theme/colors.ts` (or `@/theme`).
2. **Centralized visual tokens in `/src/theme`:** Shared visual tokens (colors, spacing, typography, radii, glow effects, text glow helpers) live centrally in `src/theme/` and are re-exported via `src/theme/index.ts`.
3. **Shared game UI components in `/src/components/ui`:** Common UI elements shared across games—such as `GameScreen`, `GameTitle`, `GameInstructions`, `PlayerNameInput`, `HighScoreText`, `BackButton`, and `NeonButton`—must be imported from `src/components/ui`. Modifying these components updates the design system globally across all games.
4. **Local `StyleSheet` for screen-specific layout:** Local `StyleSheet.create` rules are permitted only for layout rules specific to that game screen (e.g. game canvas container, HUD placement, joystick touch controls). Static inline style objects must be migrated to `StyleSheet.create`.

## Structure

```text
              ┌──────────────┐
              │  src/theme   │
              │ colors       │
              │ spacing      │
              │ typography   │
              │ effects      │
              └──────┬───────┘
                     │
            ┌────────▼────────┐
            │ components/ui   │
            │ NeonButton      │
            │ GameTitle       │
            │ BackButton      │
            │ GameScreen      │
            └────────┬────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
     Pong         Flappy      Geometry Wars
       │             │             │
       ▼             ▼             ▼
 StyleSheet      StyleSheet     StyleSheet
 específico      específico     específico
 del juego       del juego      del juego
```

## Consequences
- Single point of control for theme and UI modifications across all games.
- Consistent accessibility (WCAG) and haptic feedback across interactive UI controls.
- Clean separation between overall application/UI design and game-specific layout/canvas rendering.
