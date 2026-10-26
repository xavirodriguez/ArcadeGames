import {
  ShapeDrawer,
  Renderer,
  RendererUtils
} from "@tiny-aster/core";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunVisualMod } from "../mods/types";
import { classicMod } from "../mods/classic/ClassicMod";

/**
 * Registers Outrun shape drawers and HUD for Canvas + Skia.
 * Delegates shape and background effect registration to the active visual mod,
 * falling back to classicMod.
 *
 * @public
 */
export const initializeOutrunRenderer = (
  renderer: Renderer<OutrunComponentRegistry, any>,
  visualMod?: OutrunVisualMod,
  customDrawers?: Record<string, ShapeDrawer<any, OutrunComponentRegistry>>
): void => {
  const mod = visualMod ?? classicMod;

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
