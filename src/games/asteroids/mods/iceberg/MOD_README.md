# Asteroids visual theme — Borealis (Iceberg)

Presentation skin for Asteroids, keeping gameplay and rendering responsibilities separate.

## Enable

Via game options:

```ts
new AsteroidsGame({ gameOptions: { mod: "iceberg" } });
```

Via URL:

```text
/asteroids?theme=iceberg
```

The legacy `?mod=iceberg` alias and the `gameOptions.mod` option remain supported. Unknown theme IDs fall back to `classic`.

## Theme and gameplay modules

- `IcebergTheme.ts` owns the palette, Canvas/Skia drawers, ocean/aurora background effects and particle rendering.
- `IcebergGameplayMod.ts` owns deterministic iceberg vertex generation and dispatch to the fracture effect.
- `IcebergMod.ts` remains the compatibility facade, preserving the legacy flat API and stable ID.
- `src/games/asteroids/presentation/themeRegistry.ts` registers presentation modules independently from gameplay mods.

Change the active module without recreating the world:

```ts
game.setVisualMod("iceberg");
game.setVisualMod("classic");
```

## Visual parity

| | Classic | Iceberg (Borealis) |
|--|---------|---------------------|
| Ship | Neon triangle | Faceted icebreaker |
| Rocks | Jagged outline | 3-tone icebergs + hard shadow |
| Bullets | Glow laser | Thermal beam blocks |
| Background | Starfield / nebula | Polar ocean + geometric aurora |
| Destruction | Layered explosion | Ice shards + thermal ring |

The two themes retain the IDs `classic` and `iceberg`. The theme module never writes to ECS state; collision systems depend on the gameplay contract, not on a theme implementation.
