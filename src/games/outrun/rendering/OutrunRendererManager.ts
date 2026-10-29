import {
  ShapeDrawer,
  Renderer,
  RendererUtils
} from "@tiny-aster/core";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunThemeModule } from "../mods/types";
import { classicTheme } from "../mods/classic/ClassicTheme";

/**
 * Registers Outrun shape drawers and HUD for Canvas + Skia.
 * Delegates shape and background effect registration to the active visual mod,
 * falling back to classicMod.
 *
 * @public
 */
export const initializeOutrunRenderer = (
  renderer: Renderer<OutrunComponentRegistry, any>,
  themeModule?: OutrunThemeModule,
  customDrawers?: Record<string, ShapeDrawer<any, OutrunComponentRegistry>>
): void => {
  const mod = themeModule ?? classicTheme;

  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      mod.registerDrawers((backend, shape, drawer) => {
        if (backend === "canvas") {
          r.registerShape(shape, drawer);
        }
      });

      mod.registerBackgroundEffects?.((backend, name, effect) => {
        if (backend === "canvas") {
          r.registerBackgroundEffect(name, effect as never);
        }
      });

      if (customDrawers) {
        for (const [key, drawer] of Object.entries(customDrawers)) {
          r.registerShape(key, drawer);
        }
      }
    },
    skia: (r) => {
      mod.registerDrawers((backend, shape, drawer) => {
        if (backend === "skia") {
          r.registerShape(shape, drawer);
        }
      });

      mod.registerBackgroundEffects?.((backend, name, effect) => {
        if (backend === "skia") {
          r.registerBackgroundEffect(name, effect as never);
        }
      });

      if (customDrawers) {
        for (const [key, drawer] of Object.entries(customDrawers)) {
          r.registerShape(key, drawer);
        }
      }
    }
  });
};
