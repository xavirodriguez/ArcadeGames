# Arcade Sprite Polish — Wave 1

## Scope

This change improves the visual identity of four games without changing ECS simulation, hitboxes, collision handling, or gameplay rules.

### Hit&Run

- Add layered chest armour, crossed tactical harness straps, utility pouches, helmet markings, weapon receiver details, boots, and knee guards to the player.
- Give Popcorn tendrils, an inked silhouette, highlight, and high-contrast eyes.
- Add a visor, chest plates, and shield insignia to Wall Trooper.
- Add dorsal ridges and a luminous eye to Hopper; add armour seams and a horn highlight to Charger.
- Preserve the existing ground-shadow, elevation, facing, and landing-squash wrapper.

### Echo Runner

- Add a distinct indexed-colour fall pose instead of reusing the idle frame.
- Keep the 16 × 20 frame contract, shared Canvas/Skia rasterization, and simulation-tick animation model.

### Tower Defense

- Add readable brow/mouth details to creeps and type-specific fins/armour accents for fast and tank units.
- Add service-panel highlights and bolts to tower bases.
- Differentiate the regular-theme silhouettes for Basic, Rapid, Sniper, and Frost towers in both Canvas and Skia.
- Keep corresponding renderer details aligned and retain existing theme/palette resolution.

### Out Run

- Increase the player car grid from 16 × 9 to 20 × 13 and traffic from 12 × 8 to 18 × 12.
- Add finer body, glass, highlight, chassis, wheel, and rear-light shapes; preserve the deterministic two-frame brake-light pulse.
- Keep the road, background, projection, and traffic/gameplay systems unchanged.
- Clarify that compact vehicle pixel grids are a controlled rendering technique within the game's otherwise vector/low-poly art direction.

## Validation

Run the focused suites from the repository root:

```bash
pnpm exec jest src/games/echorunner/__tests__/EchoRunnerPixelArt.test.ts
pnpm exec jest src/games/outrun/__tests__/OutrunPixelSprites.test.ts
pnpm exec jest src/games/tower-defense
pnpm exec jest src/games/hitandrun
pnpm run typecheck:app
```

The Echo Runner and Out Run tests cover frame dimensions and deterministic animation selection. Canvas/Skia visual parity and in-game screenshots should also be reviewed before merge. This document does not claim those runtime screenshot checks have been performed.
