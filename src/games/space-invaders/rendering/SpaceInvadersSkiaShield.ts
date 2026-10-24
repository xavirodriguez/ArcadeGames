import { ShapeDrawer, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { colors } from "../../../theme/colors";
import { calculateShieldHpRatio, calculateShieldCrackCoords } from "../../shared/rendering/spaceInvadersMath";
import { safeGetRenderComponent, getRenderFlash } from "./RenderHelper";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";
import { SkiaDrawAdapter } from "../../shared/rendering/DrawAdapter";
import { drawFromGeometryProfileAdapter } from "../../shared/rendering/GenericEntityDrawer";

const cachedShieldCracks = new WeakMap<object, { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number }>();

export const drawSkiaSpaceInvadersShield: ShapeDrawer<SkCanvas, SpaceInvadersComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = safeGetRenderComponent(world, entity);
    if (!render) return;

    const flash = getRenderFlash(render, colors.green, 15);
    const size = flash.size;
    const colorStr = flash.color;
    const opacity = flash.opacity;

    const shield = world.getComponent(entity, "Shield");
    const hp = shield ? shield.hp : 3;
    const maxHp = shield ? shield.maxHp : 3;
    const ratio = calculateShieldHpRatio(hp, maxHp);

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom =
      theme?.visualTheme?.shapeTokens?.customGeometries?.["shield_block"] ||
      theme?.visualTheme?.shapeTokens?.customGeometries?.["shield"] ||
      theme?.visualTheme?.shapeTokens?.customGeometries?.["wall"] ||
      theme?.visualTheme?.shapeTokens?.customGeometries?.["pared"];

    canvas.save();

    if (customGeom) {
      const erodeScale = 0.55 + 0.45 * ratio;
      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size: size * 1.8 * erodeScale,
        baseColor: colorStr,
        globalAlpha: opacity * (0.3 + 0.7 * ratio),
        isHitFlashing: opacity < 1.0 || ratio < 0.85,
      });
      canvas.restore();
      return;
    }

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);

    paint.setStyle(Skia!.PaintStyle.Fill);
    paint.setColor(Skia!.Color(colorStr));
    paint.setAlphaf(opacity * (0.15 + 0.5 * ratio));
    canvas.drawRect(Skia!.XYWHRect(-size / 2, -size / 2, size, size), paint);

    paint.setStyle(Skia!.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setAlphaf(opacity * (0.3 + 0.7 * ratio));
    canvas.drawRect(Skia!.XYWHRect(-size / 2, -size / 2, size, size), paint);

    if (ratio < 1.0) {
      paint.setColor(Skia!.Color("rgba(0,0,0,0.85)"));
      paint.setStrokeWidth(1.5);
      paint.setAlphaf(opacity);

      let coords = cachedShieldCracks.get(render);
      if (!coords) {
        coords = calculateShieldCrackCoords(entity, size);
        cachedShieldCracks.set(render, coords);
      }

      canvas.drawLine(coords.x1, coords.y1, coords.x2, coords.y2, paint);

      if (ratio < 0.4) {
        canvas.drawLine(coords.x3, coords.y3, coords.x4, coords.y4, paint);
      }
    }

    canvas.restore();
  }
};
