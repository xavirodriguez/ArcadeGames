# PixelFX-inspired procedural VFX pilots

## Decision

Use PixelFX as a reference for effect timing and composition, not as a runtime dependency. The first three pilots are implemented with ArcadeGames' existing `IDrawAdapter`, ECS `Render` + `TTL` lifecycle, and renderer registration.

## Pilots

| Shape | Composition | Current consumer |
| --- | --- | --- |
| `pixelfx_impact` | Expanding ring, inner ring, deterministic radial triangular shards | Platformer player damage |
| `pixelfx_slash` | Directional swept arcs with short trailing strokes | Hit & Run melee hits |
| `pixelfx_explosion` | Radial fragment trajectories with deterministic gravity and angular deformation | Asteroids destruction |

The shapes are intentionally geometric. They do not import PixelFX, allocate particle entities, or consume gameplay RNG.

## Runtime contract

- `JuiceOrchestrator.spawn` creates the effect entity and its `Transform`, `Render`, and `TTL` components.
- Progress is derived from `TTL.remaining / TTL.timeLeft`; no second animation clock is introduced.
- Direction is carried by `Transform.rotation` for slash orientation and fragment orientation.
- `registerPixelFxProceduralVFX` registers the same semantic shape names for Canvas and Skia through `IDrawAdapter`.
- `SharedVFX.registerSharedVFX` installs the shapes for games already using the shared VFX registry. Hit & Run registers them in its renderer bootstrap.

## Integration

- Asteroids adds the fragment composition to the existing destruction feedback path. Existing visual mods and layered explosion fallback remain intact.
- Platformer detects a decrease in player health after the existing contact-damage helper and emits one impact. The health snapshot is seeded before damage processing so first-frame damage is not lost.
- Hit & Run emits the slash only for melee combat hits, oriented from source to target. The Sumi-e theme uses ink black; other themes use the warm combat accent.

## Determinism and safety

- All fragment directions and shard counts are fixed; the renderer does not call gameplay or visual RNG.
- Hit & Run skips the new presentation effect during rollback resimulation.
- Existing TTL cleanup owns effect lifetime.
- No PixelFX package, atlas, image assets, runtime simulator, second particle pool, or second effect catalog is added.
- The renderer parity tests assert identical shape registration for Canvas and Skia and cover expired-effect no-op behavior.

## Follow-up validation

Run the focused Jest test, application typecheck, and the three game smoke tests on Canvas and Skia. Tune scale and color in-game after observing actual combat camera scale; do not infer visual quality from unit tests alone.
