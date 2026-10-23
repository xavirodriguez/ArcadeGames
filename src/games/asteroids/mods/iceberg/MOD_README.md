# Asteroids visual mod — Borealis (Iceberg)

Presentation-only skin for Asteroids. **No ECS / netcode / scoring changes.**

## Enable

```ts
new AsteroidsGame({ gameOptions: { mod: "iceberg" } });
```

Or in `config/asteroids.json`:

```json
"VISUAL_MOD": "iceberg"
```

Priority: `gameOptions.mod` → `config.VISUAL_MOD` → `"classic"`.

## Classic vs Iceberg

| | Classic | Iceberg (Borealis) |
|--|---------|---------------------|
| Ship | Neon triangle | Faceted icebreaker |
| Rocks | Jagged outline | 3-tone icebergs + hard shadow |
| Bullets | Glow laser | Thermal beam blocks |
| Background | Starfield / nebula | Polar ocean + geometric aurora |
| Destruction | Neon explosion | Ice shards + thermal ring |

## Phases implemented

0. Mod contract + registry + `VISUAL_MOD`
1. Palette, verts, facet math
2. Canvas / Skia entity drawers
3. Ocean, aurora, fracture VFX
4. Shard particle drawer + fracture ring polish

## Not in scope

New mechanics (currents, hull integrity, blizzards) would be a **game mode**, not this visual mod.
