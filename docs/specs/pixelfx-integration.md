# PixelFX Integration Spec (V1)

## Goals

1. Optional spritesheet-backed juice without a parallel presentation stack.
2. Reuse SpriteRegistry / SpriteAnimator / TTL / JuiceOrchestrator.
3. Keep procedural pilots from PR #1035 as the default visual until sheets are validated.

## Contracts

### JuiceProfile

```ts
interface JuiceProfile {
  effect: SharedVFXPrimitiveName; // required fallback / current visual
  pixelFxId?: string;             // optional manifest id
  // … tint, scale, ttl, hitStopMs, shake…
}
```

### Manifest entry

Maps `pfx-*` → `sheetId`, `animation`, normalized `anchor`, `duration` (clip length), `scale`, `fallback`.

### Export

`node tools/render.mjs <id> --sheet` → PNG + JSON.
Adapter: `adaptPixelFXExport` (pivot array → anchor 0–1, duration = frames/fps).

### Rollback

`JuiceOrchestrator.spawn` rebuilds its ECS `Transform`/`Render`/`TTL` representation during resimulation because those entities participate in World snapshots and deterministic hashes. Replay must also reproduce ECS-backed shake state and authoritative hit-stop. Suppress only non-ECS outputs (for example, audio playback and Canvas-only effects) at their respective producer or consumer boundaries; do not suppress the ECS reconstruction here.

### Themes

Build-time palette via PixelFX `--opts '{"palette":[...]}'`.
`themeIdToVariant` selects which registered sheet id to use later.

## Non-goals (V1)

- Runtime PixelFX `createFx` / `composite` in RN/Skia.
- Parallel instance manager.
- Runtime tint as the only Sumi-e solution.
- Importing `pixelfx` npm package into `@tiny-aster/core`.
