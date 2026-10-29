# Sumi-e semantic tokens

The canonical palette lives in `src/theme/sumi-e/SumiESemanticTokens.ts` and is re-exported from `src/theme/sumi-e`.

## Semantic groups

| Group | Responsibility | Roles |
| --- | --- | --- |
| `surface` | Washi backgrounds and clean paper panels | `paper`, `paperLight` |
| `text` | Main and secondary ink for text and outlines | `primary`, `secondary` |
| `threat` | Hostile bodies, ink ghosts and hostile highlights | `body`, `shadow`, `glow`, `inkCreature` |
| `player` | Player silhouette, trails, projectiles and shield | `silhouette`, `trail`, `projectile`, `projectileGlow`, `shield` |
| `reward` | Currency, ofuda, checkpoints and progress | `primary` |
| `landscape` | Ink washes, mist, mountains, water, sand and vegetation | `ink`, `mist`, `mountain`, `water`, `sand`, `safeGround`, `foliage` |
| `ui` | Frame, hanko, panels, boss bar and lives | `frame`, `seal`, `sealShadow`, `panel`, `bossBarBackground`, `bossBarFill`, `activeLife`, `emptyLife` |

## Palette construction and validation

Use `createSumiESemanticTokens(input)` to construct a palette variant. It returns a deeply frozen `SumiESemanticTokens` value after validating the entire palette.

The factory enforces these invariants:

1. The root contains exactly the seven semantic groups, and each group contains exactly the declared token fields. Missing or unexpected fields throw a `TypeError`.
2. Every color is a six-digit `#RRGGBB` value. `createSumiESemanticColor(value, role)` validates an individual color and returns its compile-time role brand.
3. Primary and secondary text each maintain at least 4.5:1 contrast against both `surface.paper` and `surface.paperLight`.
4. Threat glow differs from the player's projectile; hostile body pigment, player projectiles and reward gold remain distinct; decorative hanko red differs from both hostile body pigment and hostile glow. Hex comparisons are case-insensitive.
5. The returned root object and all seven groups are frozen.

All output interfaces expose `readonly` fields. `HexColor` and `SemanticColor<Role>` are branded TypeScript types, so plain strings and colors from unrelated roles cannot be assigned as tokens without an explicit cast. The runtime factory exists to validate data at the trust boundary; the type brands alone are not runtime validation.

## Color rules

- **Red signals threat.** Use `threat.body` for hostile pigment and `threat.glow` for hostile projectiles or highlights.
- **Blue signals player energy.** Player projectiles, trails and shields use player blue roles, not threat red.
- **Gold signals reward and progression.** Use `reward.primary` for coins, ofuda and checkpoints.
- **Paper and ink build the world.** Keep backgrounds low-contrast; reserve saturated accents for gameplay information.
- **Decorative red is explicit.** Hanko seals use `ui.seal`; do not substitute it for threat pigment.
- **Text is rendered by code.** These tokens specify colors, not generated kanji, labels or interface copy.

## Value reference

| Role | Hex | Intended use |
| --- | --- | --- |
| `surface.paper` | `#E7DFCB` | Aged washi |
| `surface.paperLight` | `#F1EBDD` | Clean paper |
| `text.primary` | `#151515` | Primary ink |
| `text.secondary` | `#5F6466` | Secondary ink |
| `threat.body` | `#B3261E` | Hostile pigment |
| `threat.shadow` | `#A8281F` | Threat shadow |
| `threat.glow` | `#FF3B30` | Enemy projectile/highlight |
| `player.projectile` | `#4DA3FF` | Player shot |
| `player.projectileGlow` | `#9CD0FF` | Shot/trail core |
| `reward.primary` | `#E3A92F` | Rewards/progression |
| `landscape.mist` | `#C9D1D2` | Mist |
| `landscape.mountain` | `#8FA3B3` | Distant mountains |
| `landscape.water` | `#2E86B0` | Water |
| `landscape.sand` | `#E2D1A5` | Banks |
| `landscape.safeGround` | `#7FA38A` | Safe ground |
| `landscape.foliage` | `#4A5A52` | Pine foliage |
| `ui.frame` | `#B9A272` | Ornamental frame |
| `ui.seal` | `#D7473F` | Hanko seal |

## Contrast note

The secondary text value `#5F6466` is near the 4.5:1 threshold on aged paper. If a future paper variant becomes brighter or darker, the palette factory will reject the variant if its text contrast falls below the threshold. Do not bypass the check; choose a readable ink color or explicitly redesign the surface/text pairing.

## Migration boundary

This phase establishes the contract without rewriting `SUMI_E_PALETTE`, `INK_WORLD_PALETTE`, or the Hit & Run palette. Those live palettes have existing consumers and differ from this guide. Later adapters should map each legacy field to a semantic role explicitly; do not silently change existing renders or introduce more local hex values while migrating.

## Integration with AestheticTheme and React UI

`getAestheticTheme("sumi-e")` now carries `semanticTokens` alongside the existing `sumiPalette`, `backgroundColor`, `foregroundColor`, and `accentColor`. The legacy fields continue to resolve through `SumiEPalette` variants; the new `semanticTokens` field always exposes the canonical role-based contract.

Pass the selected configuration to `GameThemeProvider` when the UI should opt into an aesthetic:

```tsx
const aestheticTheme = getAestheticTheme("sumi-e", {
  landscape: "mountain",
  paletteVariant: "forest"
});

<GameThemeProvider gameKey="hitandrun" aestheticTheme={aestheticTheme}>
  <GameScreen />
</GameThemeProvider>
```

Inside the React tree, read the canonical semantic roles through the existing context hook:

```tsx
const { aestheticTheme } = useGameTheme();
const sumiTokens = aestheticTheme?.semanticTokens;

// Example: sumiTokens?.surface.paper, sumiTokens?.player.projectile
```

The provider still derives `accentColors` from `gameKey`. This is intentional: opting into an aesthetic does not silently rewrite accents consumed by existing UI components. Consumers migrate by selecting `aestheticTheme.semanticTokens` explicitly. When `aestheticTheme` is omitted, the context exposes `null` and preserves the previous game theme behavior. Cosmic and neon configurations keep their existing values and do not receive Sumi-e semantic tokens.


## Phase 3 — First renderer consumer

Vertical Shmup now builds `SHMUP_SUMI_E_THEME.palette` from the canonical roles in
`src/theme/sumi-e/SumiESemanticTokens.ts`. The existing theme contract remains unchanged;
only the palette's source of truth has moved. Canvas and Skia translucent strokes use
`withSumiEAlpha`, so alpha variants derive from a semantic color instead of duplicating
RGB literals. The conversion helper validates both the six-digit hex input and the
`0..1` alpha range.

This first adoption covers the Sumi-e backdrop, player and enemy details, and player/enemy
projectiles through their shared theme contract. It does not modify ECS components,
collision geometry, movement, scoring, random-number generation, or the aerial-fantasy
palette. Hit & Run is deliberately not migrated in this step: its game-specific approved
art brief has distinct palette values and takes precedence within that game.
