# Hit & Run — Visual Theming Architecture

This directory defines the decoupled visual theme system for **Hit & Run**.

## Architecture Overview

The visual theme system completely isolates presentation details (rendering, colors, particle decals, HUD styling) from simulation logic (`belt/`, `ai/`, `combat/`, `melee/`, `hurt/`, `waves/`, `weapons/`).

- **Simulation Direction:** `rendering -> theme -> read-only simulation snapshot data`.
- **Simulation never imports from themes or rendering.**

## Adding a New Theme

To create a new visual theme:

1. **Create Theme Class:** Create a new file under `src/games/hitandrun/rendering/theme/<my-theme>/MyTheme.ts` implementing `HitRunTheme`.
   - You can copy `TemplateTheme.ts` as a starting point.
2. **Register Theme:** Register your theme factory in `ThemeRegistry.ts`:
   ```ts
   ThemeRegistry.register("my-theme", () => new MyTheme());
   ```
3. **Usage:** Select an available theme via `DEFAULT_HIT_AND_RUN_CONFIG.theme`, `activateHitAndRunTheme("sumi-e")` from `mods/registry.ts`, or the URL parameter `?theme=sumi-e`. To add another theme, register its factory in `ThemeRegistry.ts` and expose its ID/module in `mods/types.ts` and `mods/registry.ts` before activating it.

## Available Themes

- `fantasy`: Default Dark Fantasy dusk brawler theme.
- `sumi-e`: Modern Ukiyo-e Sumi-e theme with parchment paper, ink wash parallax, world-space ink decals, and red seal HUD.

## Presentation-neutral asset ids (Lote D)

Simulation modules (`belt/`, `waves/`, `ai/`, `weapons/`) must import theme **flags and atlas ids** only from:

- `src/games/hitandrun/presentation/ThemeAssetIds.ts`
- `src/games/hitandrun/presentation/CharacterAtlasContract.ts`

Debug spawn counters live in `src/games/hitandrun/debug/HitRunDebugMetrics.ts` (re-exported from `rendering/` for compatibility).

Monorepo facade: `resolveHitAndRunTheme()` in `mods/registry.ts` wraps the existing `ThemeRegistry` without replacing `HitRunTheme` drawers.
