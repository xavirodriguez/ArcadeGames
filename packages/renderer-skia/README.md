Basado en `packages/renderer-skia/src` (`SkiaRenderer.ts`, `SkiaShapeDrawers.ts`, `SkiaSpriteDrawer.ts`) [12](#2-11)  y dependencia `@shopify/react-native-skia` en `package.json` [13](#2-12) :

```markdown
# @tiny-aster/renderer-skia

React Native Skia implementation of the `Renderer` contract defined in `@tiny-aster/core`. Used for native builds (iOS/Android via Expo) where GPU-accelerated 2D rendering is preferred over `<canvas>`.

## What lives here

- `SkiaRenderer` — implements the core `Renderer` interface using `@shopify/react-native-skia` primitives.
- `SkiaShapeDrawers` — shape-drawer registry mirroring `CanvasShapeDrawers` in `@tiny-aster/renderer-canvas`, so games can register the same shape types regardless of renderer.
- `SkiaSpriteDrawer` — sprite/image-based rendering support on Skia canvases.

## Parity with renderer-canvas

This package is expected to implement the same `Renderer` contract surface as `@tiny-aster/renderer-canvas` (`registerShape`, `registerBackgroundEffect`, `type` discriminator). When adding a feature to one renderer, add it to the other — divergence between the two has previously caused platform-specific rendering bugs (see `ROADMAP_FIXES.md`).

## Scripts

\`\`\`bash
pnpm --filter=@tiny-aster/renderer-skia build
pnpm --filter=@tiny-aster/renderer-skia typecheck
\`\`\`