import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";

// Skia drawing objects for mobile rendering.
export const drawSkiaEchoPlayer: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(_canvas, _world, _entity) {
    // Skia drawing placeholder
  }
};

export const drawSkiaEchoBackground: EffectDrawer<any, CoreComponentRegistry> = {
  draw(_canvas, _world) {
    // Skia drawing placeholder
  }
};
