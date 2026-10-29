import type { CoreComponentRegistry, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { resolveElapsed, resolveMainCameraX } from "./HitRunBackdropCanvas";
import {
  getHitRunTheme,
  resizeHitRunPresentationSession
} from "./theme/HitRunPresentationSession";

/**
 * Native Skia effect for Hit & Run. It never passes a Skia canvas into Canvas2D code.
 * Theme-specific implementations keep the procedural backdrop as the fallback.
 */
export const drawHitRunProceduralBackdropSkia: EffectDrawer<RenderContext, CoreComponentRegistry> = {
  draw(context, world) {
    const canvas = context as unknown as SkCanvas;
    if (!canvas || typeof canvas.drawRect !== "function" || !Skia) return;

    const gameConfig = world.getResource<{ viewportWidth?: number; viewportHeight?: number }>("GameConfig");
    const width = gameConfig?.viewportWidth ?? 800;
    const height = gameConfig?.viewportHeight ?? 600;
    const cameraX = resolveMainCameraX(world);
    const elapsed = resolveElapsed(world);
    resizeHitRunPresentationSession(world, width, height);
    const theme = getHitRunTheme(world);

    if (theme.renderBackdropSkia) {
      theme.renderBackdropSkia(canvas, width, height, cameraX, 0, elapsed);
      return;
    }

    const paint = getPaint();
    if (!paint) return;
    paint.setColor(Skia.Color(theme.palette.background));
    paint.setAlphaf(1);
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
  }
};
