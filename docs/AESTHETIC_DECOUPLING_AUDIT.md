# Aesthetic Decoupling Audit & Status Report

## Executive Summary
This document registers the decoupling of simulation logic from visual representation across all 14 arcade games in TinyAster (`asteroids`, `space-invaders`, `flappybird`, `pong`, `platformer`, `echorunner`, `hitandrun`, `geometrywars`, `arkanoid`, `frogger`, `racing`, `outrun`, `vertical-shmup`, `tower-defense`).

All visual drawers (Canvas2D and Skia) resolve entity, background, and HUD colors dynamically via `resolveThemeColor(world, ...)` and `resolveThemeColorWithFallback(world, ...)` against the transversal `Theme` resource registered on the ECS `World`.

## Audit Findings & Discrepancy Matrix

| Module | Report Claim | Grounded Reality / Post-Refactor Status | Action Taken |
| :--- | :--- | :--- | :--- |
| **outrun** | Used `"racing"` accent key | Key `"outrun"` did not exist in `GAME_ACCENTS`. | Added `"outrun"` to `GAME_ACCENTS` and updated constructor. |
| **hitandrun** | Extended `EchoRunnerGame` | Extended `PlatformerArcadeGame`, but imported types/config/blueprints directly from `echorunner` and `platformer`. | Disentangled cross-game imports; extracted shared platformer visuals/systems to `src/games/shared/`. |
| **tower-defense** | Hardcoded hex literals in drawers | Towers (`tower_*`), creeps (`creep_*`), projectiles, and map background used hardcoded hex strings. | Registered default tokens in `GAME_ACCENTS` and migrated drawers to `resolveThemeColorWithFallback`. |
| **frogger** | Hardcoded hex literals in drawers | Logs, turtles, home slots, and river background used hardcoded hex strings. | Registered default tokens in `GAME_ACCENTS` and migrated drawers to `resolveThemeColorWithFallback`. |
| **geometrywars** | Hardcoded hex in Skia drawers | Skia drawers in `GeometryWarsSkiaVisuals.ts` used static fallback colors. | Updated Skia drawers to resolve colors from `world` Theme resource. |
| **platformer** | Tilemap & Player hex literals | Platformer Canvas tilemap, player, and goal drawers used static hex colors. | Migrated to resolve colors from `world` Theme resource. |
| **racing** | Skin registry overrides | Skins (`SKIN_REGISTRY`) static colors overrode Theme when active. | Updated `getRacingPalette(world)` to prioritize explicit Theme overrides over skin defaults. |

## Module Boundaries Guardrail
- Automated linter `src/games/shared/__tests__/GameModuleBoundaries.test.ts` verifies that zero `src/games/<A>` files import directly from `src/games/<B>` (0 violations).
- All shared utilities reside in `src/games/shared/` or `@tiny-aster/gameplay-kit`.

## Verification & Parity
- Verified via `src/games/shared/__tests__/ThemeDecouplingParity.test.ts`:
  - 100% of game constructors inject default or custom `Theme` into `World`.
  - Default theme resolution matches original visual hex colors.
  - Custom theme overrides dynamically alter rendered colors.
