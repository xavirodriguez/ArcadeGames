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
3. **Usage:** Select theme via `DEFAULT_HIT_AND_RUN_CONFIG.theme`, runtime `ThemeRegistry.setActiveTheme("my-theme")`, or URL parameter `?theme=my-theme`.

## Available Themes

- `fantasy`: Default Dark Fantasy dusk brawler theme.
- `sumi-e`: Modern Ukiyo-e Sumi-e theme with parchment paper, ink wash parallax, world-space ink decals, and red seal HUD.
