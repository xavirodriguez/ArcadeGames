# Sumi-e semantic tokens

The shared semantic palette lives in `src/theme/sumi-e/SumiESemanticTokens.ts` and is re-exported from `src/theme/sumi-e`.

## Roles

| Group | Responsibility | Primary values |
| --- | --- | --- |
| `surface` | Washi backgrounds and clean paper panels | `paper`, `paperLight` |
| `text` | Main and secondary ink for text and outlines | `primary`, `secondary` |
| `threat` | Hostile bodies, ink ghosts and hostile highlights | `body`, `shadow`, `glow`, `inkCreature` |
| `player` | Player silhouette, trails, projectiles and shield | `silhouette`, `trail`, `projectile`, `projectileGlow`, `shield` |
| `reward` | Currency, ofuda, checkpoints and progress | `primary` |
| `landscape` | Ink washes, mist, mountains, water, sand and vegetation | `ink`, `mist`, `mountain`, `water`, `sand`, `safeGround`, `foliage` |
| `ui` | Frame, hanko, panels, boss bar and lives | `frame`, `seal`, `sealShadow`, `panel`, `bossBarBackground`, `bossBarFill`, `activeLife`, `emptyLife` |

## Color rules

- **Red signals threat.** Use `threat.body` for hostile pigment and `threat.glow` for hostile projectiles or highlights.
- **Blue signals player energy.** Player projectiles, trails and shields use the blue roles, not threat red.
- **Gold signals reward and progression.** Use `reward.primary` for coins, ofuda and checkpoints.
- **Paper and ink build the world.** Keep backgrounds low-contrast; reserve saturated accents for gameplay information.
- **Decorative red is explicit.** Hanko seals use `ui.seal`; do not route them through threat tokens.
- **Text is rendered by code.** These tokens specify colors, not generated kanji, labels or interface copy.

## Type and runtime guarantees

The groups and fields are deeply `readonly` in TypeScript. The exported token map and each nested group are also frozen at runtime. Tests pin the approved hex values, check semantic distinctions and verify the hex format.

## Migration boundary

This phase introduces the canonical contract without rewriting `SUMI_E_PALETTE`, `INK_WORLD_PALETTE`, or the Hit & Run palette. Those live palettes have existing consumers and differ from this guide. The next integration phase should adapt consumers to these semantic roles explicitly; do not add more local hex values or silently change legacy renders while migrating.
