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
}
```

### Rollback

`JuiceOrchestrator.spawn` no-ops when `world.isReSimulating === true`.

### Themes

Build-time palette via PixelFX `--opts`. Runtime tint is out of V1 scope.

## Non-goals (V1)

- Runtime PixelFX `createFx` in RN/Skia
- Parallel instance manager
- Importing `pixelfx` into `@tiny-aster/core`
