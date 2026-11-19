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

`JuiceOrchestrator.spawn` preserves the central presentation no-op during resimulation (after replaying authoritative hit-stop). Use `spawnDeterministically` or `triggerEventDeterministically` only when an effect's ECS `Transform`/`Render`/`TTL` representation or ECS-backed shake state participates in World snapshots and deterministic hashes and must be reconstructed. Keep audio playback, Canvas-only pools and native/UI effects guarded at their external side-effect boundaries.

### Themes

Build-time palette via PixelFX `--opts '{"palette":[...]}'`.
`themeIdToVariant` selects which registered sheet id to use later.

## Non-goals (V1)

- Runtime PixelFX `createFx` / `composite` in RN/Skia.
- Parallel instance manager.
- Runtime tint as the only Sumi-e solution.
- Importing `pixelfx` npm package into `@tiny-aster/core`.
