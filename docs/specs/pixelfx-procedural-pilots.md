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


## Second batch: five additional compositions

| Shape | Composition | Consumer |
| --- | --- | --- |
| `pixelfx_dust` | Low expanding puffs, short horizontal streaks and a ground-hugging arc | Platformer grounded-state transition (landing) |
| `pixelfx_pickup` | Compact halo, diamond facets and four-point glints | Platformer `CollectiblePickedUp` |
| `pixelfx_muzzle` | Forward-facing flare, hot core and recoil rays | Asteroids successful weapon shot |
| `pixelfx_shield_crack` | Segmented energy shell and deterministic radial fractures | Asteroids `combat:hit` when the target has `Ship` |
| `pixelfx_ink_burst` | Broken brush arcs, radial ink drops and short strokes | Hit & Run `combat:death`, with ink-black Sumi-e tint |

The five new compositions use the same TTL-derived animation progress and renderer registration as the first batch. They are registered in the existing shared VFX bootstrap, so Platformer and Asteroids receive Canvas/Skia drawers through `SharedVFX`; Hit & Run receives the same drawers through its renderer bootstrap.

### Event and rollback handling

- Platformer landing dust is emitted only on a committed `isGrounded: false → true` transition. The previous-grounded snapshot is not advanced during resimulation.
- Pickup sparkle uses the collector's Transform because the collectible entity is scheduled for removal by `CollectibleSystem`.
- Asteroids muzzle flash is emitted only after a successful shot and is suppressed during rollback resimulation.
- Asteroids shield crack listens to typed `combat:hit` and filters targets by the `Ship` component.
- Hit & Run death ink burst is emitted from the victim Transform when still available; it is skipped during resimulation and uses the existing Sumi-e theme resource to choose ink black.


## Third batch: five gameplay-specific compositions

| Shape | Composition | Consumer |
| --- | --- | --- |
| `pixelfx_paddle_impact` | Compressed contact crescents and directional rebound chevrons | Pong paddle collision |
| `pixelfx_brick_shatter` | Angular masonry fragments with short outward trajectories | Arkanoid `brick:shatter` |
| `pixelfx_flap_gust` | Layered air crescents and feather-like slipstream strokes | Flappy Bird successful flap |
| `pixelfx_hop` | Take-off crescent and separated ground-contact streaks | Frogger successful grid hop |
| `pixelfx_phase_dash` | Offset afterimages and directional speed lines | Platformer successful dash |

These compositions reuse the shared TTL-driven renderer path and are registered for both Canvas and Skia. Each effect is triggered at the gameplay transition that owns it; presentation spawning is skipped during rollback resimulation. Existing game-specific squash, audio, hit-stop and collision behavior is preserved.
