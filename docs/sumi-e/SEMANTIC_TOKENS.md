# Sumi-e semantic tokens

The shared semantic palette lives in `src/theme/sumi-e/SumiESemanticTokens.ts` and is re-exported from `src/theme/sumi-e`.

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

## Type-level guarantees

- `HexColor` is a branded type, so arbitrary strings cannot be passed as approved palette values without an explicit cast.
- Palette values pass through a runtime validator that accepts only six-digit `#RRGGBB` strings.
- `SemanticColor<Role>` adds a second type brand. A threat token cannot accidentally be assigned to a surface, player, reward or UI token field.
- Public interfaces use `readonly` properties, and the token map plus each group are frozen at runtime.
- Compile-time assertions in `SumiESemanticTokens.test.ts` ensure unrelated roles remain non-assignable.

## Color rules

- **Red signals threat.** Use `threat.body` for hostile pigment and `threat.glow` for hostile projectiles or highlights.
- **Blue signals player energy.** Player projectiles, trails and shields use player blue roles, not threat red.
- **Gold signals reward and progression.** Use `reward.primary` for coins, ofuda and checkpoints.
- **Paper and ink build the world.** Keep backgrounds low-contrast; reserve saturated accents for gameplay information.
- **Decorative red is explicit.** Hanko seals use `ui.seal`; do not substitute it for threat pigment.
- **Text is rendered by code.** These tokens specify colors, not generated kanji, labels or interface copy.

## Contrast policy

Primary and secondary text tokens must meet a WCAG AA contrast ratio of at least 4.5:1 against both paper surfaces. The palette tests calculate relative luminance rather than hard-coding a pass result. Gameplay cues such as blue projectiles, gold rewards and red seals are not text tokens and must not be used for small text without a separate contrast check.

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

## Migration boundary

This phase establishes the contract without rewriting `SUMI_E_PALETTE`, `INK_WORLD_PALETTE`, or the Hit & Run palette. Those live palettes have existing consumers and differ from this guide. Later adapters should map each legacy field to a semantic role explicitly; do not silently change existing renders or introduce more local hex values while migrating.
