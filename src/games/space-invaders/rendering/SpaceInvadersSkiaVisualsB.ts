import { ShapeDrawer, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { colors } from "../../../theme/colors";
import { resolveParticleState } from "./SpaceInvadersVisualUtils";
import { safeGetRenderComponent } from "./RenderHelper";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";

/**
 * Visuals for particles using React Native Skia.
 */
export const drawSkiaSpaceInvadersParticle: ShapeDrawer<SkCanvas, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;

    const particleState = resolveParticleState(world, entity, render);
    const { progress, particleColor, currentSize } = particleState;

    canvas.save();

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(particleColor));
    paint.setAlphaf(1.0 - progress);

    canvas.drawCircle(0, 0, currentSize / 2, paint);

    canvas.restore();
  }
};
