# @tiny-aster/renderer-canvas

HTML5 `<canvas>` implementation of the `Renderer` contract defined in `@tiny-aster/core`. Used primarily for web builds (`pnpm web`).

## What lives here

- `CanvasRenderer` — implements the core `Renderer` interface (`type = "canvas"`), drives the render loop against a 2D canvas context, and supports registrable background effects (`registerBackgroundEffect`).
- `CanvasShapeDrawers` — default and per-game shape drawers keyed by collider/render shape type (e.g. `"Circle"`, `"Box"`, `"player_ship"`, `"invader"`), registered via `registerShape`.
- `CanvasSpriteDrawer` — sprite/image-based rendering support.

## ⚠️ Known integration risk

Historically, an empty default shape-drawer map and a missing `registerShape`/`registerBackgroundEffect` bridge caused every game to render as a black screen or crash outright on web.

## Scripts

\`\`\`bash
pnpm --filter=@tiny-aster/renderer-canvas build
pnpm --filter=@tiny-aster/renderer-canvas typecheck
\`\`\`

```

```
