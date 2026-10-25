import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, WaypointList, GameStateComponent, TileGrid, TowerDefenseVisualEffects } from "../types/TowerDefenseTypes";
import { getTileTypeColor } from "../MapUtils";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { Skia, getPaint, SkCanvas, SkPaint } from "../../shared/rendering/SkiaContext";
import { drawGlowOrbSkia } from "../../shared/rendering/SkiaNeonUtils";
import { colors } from "../../../theme/colors";
import { createSpriteAnimator, drawSpriteSkia } from "../../shared/sprites";
import {
  createPathDirectionMarkers,
  resolveCreepAnimationState,
  resolveCreepVisualState,
  resolveTowerProjectileDrawSetup,
  resolveTowerWeaponDrawSetup,
  resolveTdLandmarkSetup,
  resolveTdMapBackgroundContext,
  forEachTileGridCell,
  isPaperDuskTheme,
} from "./TowerDefenseVisualHelpers";

const TOWER_BASIC_SPRITE = createSpriteAnimator("tower_basic_art");
const TOWER_SNIPER_SPRITE = createSpriteAnimator("tower_sniper_art");

type TDWorld = World<TowerDefenseComponentRegistry>;

function drawSkiaTower(
  world: TDWorld,
  canvas: SkCanvas,
  size: number,
  primaryKey: string,
  accentKey: string,
  fallbackPrimary: string,
  fallbackAccent: string,
  towerType: "basic" | "sniper" | "rapid" | "frost" = "basic"
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  const primary = resolveThemeColorWithFallback(world, fallbackPrimary, primaryKey, "primary");
  const accent = resolveThemeColorWithFallback(world, fallbackAccent, accentKey, "accent");
  const baseBg = resolveThemeColorWithFallback(world, colors.backgroundSlate, "tower_base_bg");
  const isPaperDusk = isPaperDuskTheme(world);

  const s = size;

  if (isPaperDusk) {
    const shadowColor = resolveThemeColorWithFallback(world, "rgba(0,0,0,0.35)", "pd_shadow");
    const inkColor = resolveThemeColorWithFallback(world, "#14161B", "pd_ink");
    const paperColor = resolveThemeColorWithFallback(world, "#F2E9D8", "pd_paper", "tower_base_bg");
    const shadowOffset = s * 0.08;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    paint.setColor(Skia.Color(shadowColor));
    canvas.drawCircle(shadowOffset, shadowOffset, s * 0.42, paint);

    paint.setColor(Skia.Color(paperColor));
    canvas.drawCircle(0, 0, s * 0.42, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(2, s * 0.06));
    paint.setColor(Skia.Color(inkColor));
    canvas.drawCircle(0, 0, s * 0.42, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(primary));
    if (towerType === "basic" || towerType === "rapid") {
      const path = Skia.Path.Make();
      if (towerType === "basic") {
        path.moveTo(0, -s * 0.28);
        path.lineTo(s * 0.24, s * 0.18);
        path.lineTo(-s * 0.24, s * 0.18);
        path.close();
      } else {
        path.addRect(Skia.XYWHRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4));
      }
      canvas.drawPath(path, paint);
    } else {
      const path = Skia.Path.Make();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const hx = Math.cos(angle) * (s * 0.25);
        const hy = Math.sin(angle) * (s * 0.25);
        if (i === 0) path.moveTo(hx, hy);
        else path.lineTo(hx, hy);
      }
      path.close();
      canvas.drawPath(path, paint);
    }

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(inkColor));
    canvas.drawCircle(0, 0, s * 0.25, paint);
    return;
  }

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(baseBg));
  canvas.drawRect(Skia.XYWHRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4), paint);

  paint.setColor(Skia.Color(primary));
  const path = Skia.Path.Make();
  if (towerType === "basic") {
    path.moveTo(-s * 0.25, -s * 0.1);
    path.lineTo(-s * 0.1, -s * 0.45);
    path.lineTo(s * 0.1, -s * 0.45);
    path.lineTo(s * 0.25, -s * 0.1);
  } else if (towerType === "rapid") {
    path.addRect(Skia.XYWHRect(-s * 0.23, -s * 0.34, s * 0.46, s * 0.38));
  } else if (towerType === "sniper") {
    path.moveTo(-s * 0.16, -s * 0.1);
    path.lineTo(-s * 0.1, -s * 0.47);
    path.lineTo(s * 0.1, -s * 0.47);
    path.lineTo(s * 0.16, -s * 0.1);
  } else {
    path.moveTo(0, -s * 0.42);
    path.lineTo(s * 0.23, -s * 0.12);
    path.lineTo(s * 0.14, s * 0.16);
    path.lineTo(0, s * 0.27);
    path.lineTo(-s * 0.14, s * 0.16);
    path.lineTo(-s * 0.23, -s * 0.12);
  }
  path.close();
  canvas.drawPath(path, paint);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(Math.max(1, s * 0.035));
  paint.setColor(Skia.Color(accent));
  canvas.drawPath(path, paint);

  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(accent));
  canvas.drawCircle(0, 0, s * (towerType === "frost" ? 0.1 : 0.085), paint);

  // Mirrors the Canvas-specific visual signatures for each tower type.
  if (towerType === "rapid") {
    canvas.drawRect(Skia.XYWHRect(-s * 0.16, -s * 0.04, s * 0.07, s * 0.16), paint);
    canvas.drawRect(Skia.XYWHRect(s * 0.09, -s * 0.04, s * 0.07, s * 0.16), paint);
  } else if (towerType === "sniper") {
    paint.setColor(Skia.Color("#dbeafe"));
    canvas.drawRect(Skia.XYWHRect(-s * 0.055, -s * 0.3, s * 0.11, s * 0.055), paint);
  } else if (towerType === "frost") {
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1, s * 0.035));
    paint.setColor(Skia.Color("#e0f7fa"));
    canvas.drawLine(-s * 0.12, -s * 0.1, s * 0.12, s * 0.1, paint);
    canvas.drawLine(s * 0.12, -s * 0.1, -s * 0.12, s * 0.1, paint);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(accent));
  }

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.5);
  paint.setColor(Skia.Color(accent));
  canvas.drawRect(Skia.XYWHRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4), paint);

  // Matching highlights, service panel and bolts provide a layered metal finish.
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color("#dbeafe"));
  canvas.drawRect(Skia.XYWHRect(-s * 0.32, -s * 0.12, s * 0.64, Math.max(0.8, s * 0.035)), paint);
  paint.setColor(Skia.Color(baseBg));
  canvas.drawRect(Skia.XYWHRect(-s * 0.07, s * 0.02, s * 0.14, s * 0.13), paint);
  paint.setColor(Skia.Color(accent));
  canvas.drawCircle(-s * 0.36, s * 0.03, Math.max(0.8, s * 0.035), paint);
  canvas.drawCircle(s * 0.36, s * 0.03, Math.max(0.8, s * 0.035), paint);
}

function drawSkiaTowerWeapon(
  canvas: SkCanvas,
  world: TDWorld,
  entity: number,
  size: number,
  type: "basic" | "sniper" | "rapid" | "frost"
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  const {
    angle,
    barrelColor,
    inkColor,
    barrelLength,
    barrelWidth,
    firing,
    pulse
  } = resolveTowerWeaponDrawSetup(world, entity, size, type);

  canvas.save();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1);
  paint.setColor(Skia.Color(barrelColor));
  paint.setAlphaf(0.18 + pulse * 0.16);
  canvas.drawCircle(0, 0, size * (0.23 + pulse * 0.025), paint);
  canvas.rotate((angle * 180) / Math.PI, 0, 0);
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(barrelWidth + 2);
  paint.setColor(Skia.Color(inkColor));
  canvas.drawLine(size * 0.08, 0, barrelLength, 0, paint);

  paint.setStrokeWidth(barrelWidth);
  paint.setColor(Skia.Color(barrelColor));
  canvas.drawLine(size * 0.08, 0, barrelLength, 0, paint);

  if (firing) {
    const flashSize = Math.max(4, size * 0.2);
    const flash = Skia.Path.Make();
    flash.moveTo(barrelLength - 2, 0);
    flash.lineTo(barrelLength + flashSize, -flashSize * 0.6);
    flash.lineTo(barrelLength + flashSize * 0.65, 0);
    flash.lineTo(barrelLength + flashSize, flashSize * 0.6);
    flash.close();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(barrelColor));
    canvas.drawPath(flash, paint);
    paint.setColor(Skia.Color("#fff4db"));
    canvas.drawCircle(barrelLength, 0, flashSize * 0.28, paint);
  }
  canvas.restore();
}
export const drawSkiaTowerBasic: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    const isPaperDusk = isPaperDuskTheme(world);
    const spriteDrawn = !isPaperDusk && drawSpriteSkia(canvas, TOWER_BASIC_SPRITE, 0, 0);
    if (!spriteDrawn) {
      drawSkiaTower(world, canvas, size, "tower_basic", "tower_basic_accent", colors.cyan, colors.blueLight, "basic");
    }
    drawSkiaTowerWeapon(canvas, world, entity, size, "basic");
  },
};

export const drawSkiaTowerSniper: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    const isPaperDusk = isPaperDuskTheme(world);
    const spriteDrawn = !isPaperDusk && drawSpriteSkia(canvas, TOWER_SNIPER_SPRITE, 0, 0);
    if (!spriteDrawn) {
      drawSkiaTower(world, canvas, size, "tower_sniper", "tower_sniper_accent", colors.purple, colors.violet, "sniper");
    }
    drawSkiaTowerWeapon(canvas, world, entity, size, "sniper");
  },
};

export const drawSkiaTowerRapid: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_rapid", "tower_rapid_accent", colors.green, colors.primary, "rapid");
    drawSkiaTowerWeapon(canvas, world, entity, size, "rapid");
  },
};

function drawSkiaCreepGeometry(
  canvas: SkCanvas,
  paint: SkPaint,
  radius: number,
  type: "grunt" | "fast" | "tank" | "boss"
): void {
  if (type === "fast") {
    const path = Skia.Path.Make();
    path.moveTo(-radius * 0.95, -radius * 0.42);
    path.lineTo(radius * 0.42, -radius * 0.58);
    path.lineTo(radius, 0);
    path.lineTo(radius * 0.42, radius * 0.58);
    path.lineTo(-radius * 0.95, radius * 0.42);
    path.lineTo(-radius * 0.62, 0);
    path.close();
    canvas.drawPath(path, paint);
  } else if (type === "tank") {
    const path = Skia.Path.Make();
    path.moveTo(-radius * 0.68, -radius * 0.62);
    path.lineTo(radius * 0.68, -radius * 0.62);
    path.lineTo(radius, -radius * 0.08);
    path.lineTo(radius * 0.68, radius * 0.62);
    path.lineTo(-radius * 0.68, radius * 0.62);
    path.lineTo(-radius, -radius * 0.08);
    path.close();
    canvas.drawPath(path, paint);
  } else if (type === "boss") {
    const path = Skia.Path.Make();
    const bumps = 10;
    for (let i = 0; i <= 100; i++) {
      const theta = (i / 100) * Math.PI * 2;
      const r = radius * (1 + 0.14 * Math.sin(theta * bumps));
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.close();
    canvas.drawPath(path, paint);
  } else {
    canvas.drawCircle(0, 0, radius, paint);
  }
}

function drawSkiaCreepDetails(
  canvas: SkCanvas,
  size: number,
  type: "grunt" | "fast" | "tank" | "boss",
  stroke: string
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  const eyeRadius = Math.max(1.2, size * 0.075);
  const eyeOffset = size * (type === "fast" ? 0.2 : 0.16);
  const eyeY = -size * 0.07;

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color("#fff4db"));
  canvas.drawCircle(-eyeOffset, eyeY, eyeRadius, paint);
  canvas.drawCircle(eyeOffset, eyeY, eyeRadius, paint);

  paint.setColor(Skia.Color("#18202b"));
  canvas.drawCircle(-eyeOffset + size * 0.018, eyeY, eyeRadius * 0.48, paint);
  canvas.drawCircle(eyeOffset + size * 0.018, eyeY, eyeRadius * 0.48, paint);

  // Brow ridges and mouth mirror the Canvas sprite at the same simulation state.
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(Math.max(1, size * 0.045));
  paint.setStrokeCap(Skia.StrokeCap.Round);
  paint.setColor(Skia.Color(stroke));
  canvas.drawLine(-eyeOffset - eyeRadius * 0.35, eyeY - eyeRadius * 0.8,
    -eyeOffset + eyeRadius * 0.55, eyeY - eyeRadius * 0.9, paint);
  canvas.drawLine(eyeOffset - eyeRadius * 0.55, eyeY - eyeRadius * 0.9,
    eyeOffset + eyeRadius * 0.35, eyeY - eyeRadius * 0.8, paint);
  canvas.drawLine(-size * 0.09, size * 0.12, size * 0.09, size * 0.12, paint);

  if (type === "fast") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(stroke));
    const fins = Skia.Path.Make();
    fins.moveTo(-size * 0.28, -size * 0.12);
    fins.lineTo(-size * 0.48, -size * 0.27);
    fins.lineTo(-size * 0.42, -size * 0.02);
    fins.close();
    fins.moveTo(-size * 0.28, size * 0.1);
    fins.lineTo(-size * 0.48, size * 0.25);
    fins.lineTo(-size * 0.42, size * 0.01);
    fins.close();
    canvas.drawPath(fins, paint);
  }

  if (type === "tank") {
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1.5, size * 0.06));
    paint.setColor(Skia.Color("#14161b"));
    canvas.drawLine(-size * 0.27, size * 0.22, size * 0.27, size * 0.22, paint);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#d1d5db"));
    canvas.drawCircle(-size * 0.29, size * 0.22, Math.max(0.8, size * 0.035), paint);
    canvas.drawCircle(size * 0.29, size * 0.22, Math.max(0.8, size * 0.035), paint);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1, size * 0.035));
    paint.setColor(Skia.Color("#f3f4f6"));
    canvas.drawLine(-size * 0.22, -size * 0.22, size * 0.22, -size * 0.22, paint);
  }

  if (type === "boss") {
    const crown = Skia.Path.Make();
    crown.moveTo(-size * 0.16, -size * 0.24);
    crown.lineTo(0, -size * 0.42);
    crown.lineTo(size * 0.16, -size * 0.24);
    crown.lineTo(0, -size * 0.1);
    crown.close();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#ffd54f"));
    canvas.drawPath(crown, paint);
  }
}

function drawSkiaCreep(
  canvas: SkCanvas,
  size: number,
  fill: string,
  stroke: string,
  _isPaperDusk = false,
  type: "grunt" | "fast" | "tank" | "boss" = "grunt",
  hitFlash = false
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  const radius = size / 2;
  const bodyFill = hitFlash ? "#fff4db" : fill;

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color("rgba(0,0,0,0.38)"));
  canvas.save();
  canvas.translate(size * 0.1, size * 0.1);
  drawSkiaCreepGeometry(canvas, paint, radius, type);
  canvas.restore();

  paint.setColor(Skia.Color(bodyFill));
  drawSkiaCreepGeometry(canvas, paint, radius, type);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(Math.max(2, size * 0.08));
  paint.setColor(Skia.Color(stroke));
  drawSkiaCreepGeometry(canvas, paint, radius, type);

  drawSkiaCreepDetails(canvas, size, type, stroke);
}

function drawSkiaCreepHealthBar(
  canvas: SkCanvas,
  world: TDWorld,
  entity: number,
  size: number
): void {
  if (!Skia) return;
  const health = world.getComponent(entity, "Health");
  if (!health || health.max <= 0) return;
  const paint = getPaint();
  if (!paint) return;

  const ratio = Math.max(0, Math.min(1, health.current / health.max));
  const width = Math.max(20, size * 1.25);
  const height = Math.max(3, size * 0.12);
  const x = -width / 2;
  const y = -size * 0.82 - height;

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color("rgba(8,12,20,0.9)"));
  canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint);

  paint.setColor(Skia.Color(ratio > 0.5 ? "#65e572" : ratio > 0.25 ? "#ffce4a" : "#ff5252"));
  canvas.drawRect(Skia.XYWHRect(x + 1, y + 1, Math.max(0, (width - 2) * ratio), Math.max(1, height - 2)), paint);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1);
  paint.setColor(Skia.Color("#14161b"));
  canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint);
}


function drawSkiaCreepStrokedOutline(canvas: SkCanvas, radius: number, strokeColor: string, strokeWidth = 3): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));
  canvas.drawCircle(0, 0, radius, paint);
}

export const drawSkiaTowerFrost: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_frost", "tower_frost_accent", colors.cyan, colors.tertiary);
    drawSkiaTowerWeapon(canvas, world, entity, size, "frost");
  },
};

export const drawSkiaCreepBoss: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 28, "boss");
    const isPaperDusk = isPaperDuskTheme(world);
    const animation = resolveCreepAnimationState(world, entity, "boss");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;

    canvas.save();
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "boss", hitFlash);
    if (!isPaperDusk) {
      drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
    }
    drawSkiaCreepHealthBar(canvas, world, entity, size);
    canvas.restore();
  },
};

export const drawSkiaCreepGrunt: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 12, "grunt");
    const animation = resolveCreepAnimationState(world, entity, "grunt");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;

    canvas.save();
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "grunt", hitFlash);
    drawSkiaCreepHealthBar(canvas, world, entity, size);
    canvas.restore();
  },
};

export const drawSkiaCreepFast: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 10, "fast");
    const animation = resolveCreepAnimationState(world, entity, "fast");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;

    canvas.save();
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "fast", hitFlash);
    drawSkiaCreepHealthBar(canvas, world, entity, size);
    canvas.restore();
  },
};

export const drawSkiaCreepTank: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 18, "tank");
    const isPaperDusk = isPaperDuskTheme(world);
    const animation = resolveCreepAnimationState(world, entity, "tank");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;

    canvas.save();
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "tank", hitFlash);
    if (!isPaperDusk) {
      drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
    }
    drawSkiaCreepHealthBar(canvas, world, entity, size);
    canvas.restore();
  },
};

export const drawSkiaTowerProjectile: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, color } = resolveTowerProjectileDrawSetup(world, entity);

    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;

    const velocity = world.getComponent(entity, "Velocity");
    if (velocity) {
      const speed = Math.hypot(velocity.vx, velocity.vy);
      if (speed > 1) {
        const dirX = velocity.vx / speed;
        const dirY = velocity.vy / speed;
        const trailLength = Math.min(18, Math.max(7, size * 2.5));
        paint.reset();
        paint.setAntiAlias(true);
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setStrokeWidth(Math.max(2, size * 0.75));
        paint.setColor(Skia.Color(color));
        canvas.drawLine(-dirX * trailLength, -dirY * trailLength, -dirX * size * 0.25, -dirY * size * 0.25, paint);
        paint.setStrokeWidth(Math.max(1, size * 0.25));
        paint.setColor(Skia.Color("rgba(255,244,219,0.9)"));
        canvas.drawLine(-dirX * trailLength * 0.72, -dirY * trailLength * 0.72, -dirX * size * 0.4, -dirY * size * 0.4, paint);
      }
    }

    drawGlowOrbSkia(canvas, paint, size, color, 0.5, 1.5);
  },
};

function drawTdAmbientStarSkia(
  canvas: SkCanvas,
  x: number,
  y: number,
  width: number,
  height: number,
  row: number,
  col: number,
  elapsedSeconds: number,
  isPaperDusk: boolean
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  const seed = (row * 73 + col * 37 + 19) >>> 0;
  if (seed % 3 !== 0) return;
  const starX = x + 5 + (seed % Math.max(1, Math.floor(width - 10)));
  const starY = y + 5 + ((seed * 13) % Math.max(1, Math.floor(height - 10)));
  const pulse = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(elapsedSeconds * 2.6 + seed * 0.17));
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(isPaperDusk ? "#fff0d0" : "#75deff"));
  paint.setAlphaf(pulse * (isPaperDusk ? 0.62 : 0.8));
  canvas.drawRect(Skia.XYWHRect(starX, starY, seed % 11 === 0 ? 2 : 1, 1), paint);
  if (seed % 13 === 0) {
    canvas.drawRect(Skia.XYWHRect(starX, starY - 2, 1, 5), paint);
    canvas.drawRect(Skia.XYWHRect(starX - 2, starY, 5, 1), paint);
  }
}

function drawTowerDefenseVfxSkia(
  canvas: SkCanvas,
  world: TDWorld,
  layout: GridLayout,
  tileGrid: TileGrid,
  isPaperDusk: boolean
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  const state = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects");
  const gameState = world.getSingleton("GameState") as GameStateComponent | undefined;
  const centerX = layout.offsetX + (tileGrid.cols * layout.stepX) / 2;
  const bannerY = Math.max(8, layout.offsetY - 10);

  if (state) {
    for (const effect of state.effects) {
      const progress = Math.max(0, Math.min(1, effect.ageSeconds / effect.durationSeconds));
      const fade = progress > 0.68 ? (1 - progress) / 0.32 : 1;
      canvas.save();
      paint.reset();
      paint.setAntiAlias(true);

      if (effect.kind === "enemy-death") {
        const count = effect.creepType === "boss" ? 16 : effect.creepType === "tank" ? 11 : 8;
        const radius = 4 + progress * (effect.creepType === "boss" ? 29 : 20);
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setStrokeWidth(Math.max(1, 2.5 * (1 - progress)));
        paint.setColor(Skia.Color(effect.color));
        paint.setAlphaf(fade);
        canvas.drawCircle(effect.x, effect.y, 4 + progress * 12, paint);
        paint.setStyle(Skia.PaintStyle.Fill);
        for (let index = 0; index < count; index++) {
          const angle = (index / count) * Math.PI * 2 + effect.id * 0.37;
          const distance = radius * (0.65 + (index % 3) * 0.18);
          const sparkX = effect.x + Math.cos(angle) * distance;
          const sparkY = effect.y + Math.sin(angle) * distance;
          canvas.save();
          canvas.translate(sparkX, sparkY);
          canvas.rotate((angle * 180) / Math.PI, 0, 0);
          paint.setColor(Skia.Color(effect.color));
          paint.setAlphaf(fade);
          canvas.drawRect(Skia.XYWHRect(-1.2, -2.1, 2.4, 4.2), paint);
          canvas.restore();
        }
        paint.setColor(Skia.Color("#fff4db"));
        paint.setAlphaf(fade);
        canvas.drawCircle(effect.x, effect.y, Math.max(1, 3 * (1 - progress)), paint);
      } else if (effect.kind === "gold-reward") {
        const rise = progress * 28;
        const coinX = effect.x;
        const coinY = effect.y - rise;
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color("#ffd54f"));
        paint.setAlphaf(fade);
        canvas.drawCircle(coinX, coinY, 4.2 * (1 - progress * 0.22), paint);
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setStrokeWidth(1.4);
        paint.setColor(Skia.Color("#815f18"));
        paint.setAlphaf(fade);
        canvas.drawCircle(coinX, coinY, 4.2 * (1 - progress * 0.22), paint);
        paint.setStrokeWidth(1);
        paint.setColor(Skia.Color("#fff1a8"));
        canvas.drawLine(coinX, coinY - 2, coinX, coinY + 2, paint);
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color("#ffe082"));
        paint.setAlphaf(fade);
        const font12 = Skia.Font ? Skia.Font(null, 12) : null;
        if (font12) {
          canvas.drawText(`+${effect.amount ?? 0}`, coinX + 7, coinY - 2, paint, font12);
        }
      } else if (effect.kind === "base-hit") {
        for (let ring = 0; ring < 2; ring++) {
          const ringProgress = Math.max(0, Math.min(1, progress - ring * 0.16));
          paint.setStyle(Skia.PaintStyle.Stroke);
          paint.setStrokeWidth(3 - ringProgress * 2);
          paint.setColor(Skia.Color(effect.color));
          paint.setAlphaf(Math.max(0, (1 - ringProgress) * 0.8));
          canvas.drawCircle(effect.x, effect.y, 6 + ringProgress * (34 + ring * 9), paint);
        }
      } else if (effect.kind === "phase-banner") {
        const width = Math.min(290, tileGrid.cols * layout.stepX - 20);
        const height = 28;
        const left = centerX - width / 2;
        const top = bannerY - height / 2;
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(isPaperDusk ? "#F2E9D8" : "#050c1a"));
        paint.setAlphaf(Math.max(0, Math.min(1, fade)) * (isPaperDusk ? 0.95 : 0.9));
        canvas.drawRect(Skia.XYWHRect(left, top, width, height), paint);
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setStrokeWidth(2);
        paint.setColor(Skia.Color(effect.color));
        paint.setAlphaf(fade);
        canvas.drawRect(Skia.XYWHRect(left + 1, top + 1, width - 2, height - 2), paint);
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(effect.color));
        paint.setAlphaf(fade);
        const font14 = Skia.Font ? Skia.Font(null, 14) : null;
        const text = effect.text ?? "WAVE";
        const textWidth = font14 ? (font14.measureText ? font14.measureText(text).width : text.length * 8.4) : text.length * 8.4;
        if (font14) {
          canvas.drawText(text, centerX - textWidth / 2, bannerY + 5, paint, font14);
        }
      }
      canvas.restore();
    }
  }

  if (gameState?.phase === "victory" || gameState?.phase === "game_over") {
    const color = gameState.phase === "victory" ? "#ffd54f" : "#ff5252";
    const label = gameState.phase === "victory" ? `VICTORY  ·  SCORE ${gameState.score}` : `GAME OVER  ·  SCORE ${gameState.score}`;
    const width = Math.min(310, tileGrid.cols * layout.stepX - 16);
    const left = centerX - width / 2;
    const top = bannerY - 16;
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(isPaperDusk ? "#F2E9D8" : "#050c1a"));
    paint.setAlphaf(isPaperDusk ? 0.97 : 0.94);
    canvas.drawRect(Skia.XYWHRect(left, top, width, 32), paint);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);
    paint.setColor(Skia.Color(color));
    canvas.drawRect(Skia.XYWHRect(left + 1, top + 1, width - 2, 30), paint);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));
    const font13 = Skia.Font ? Skia.Font(null, 13) : null;
    const textWidth = font13 ? (font13.measureText ? font13.measureText(label).width : label.length * 7.8) : label.length * 7.8;
    if (font13) {
      canvas.drawText(label, centerX - textWidth / 2, bannerY + 5, paint, font13);
    }
  }
}
function drawTdLandmarkSkia(
  canvas: SkCanvas,
  world: TDWorld,
  x: number,
  y: number,
  size: number,
  kind: "spawn" | "base",
  isPaperDusk: boolean
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  const { cx, cy, fill, outline, pulse } = resolveTdLandmarkSetup(world, x, y, size, kind, isPaperDusk);

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.5);
  paint.setColor(Skia.Color(kind === "base" ? "#62f6bd" : fill));
  paint.setAlphaf(isPaperDusk ? 0.2 + pulse * 0.18 : 0.25 + pulse * 0.3);
  canvas.drawCircle(cx, cy, size * ((kind === "base" ? 0.32 : 0.24) + pulse * 0.035), paint);

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(fill));
  canvas.drawCircle(cx, cy, size * (kind === "spawn" ? 0.2 : 0.28), paint);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(2);
  paint.setColor(Skia.Color(outline));
  canvas.drawCircle(cx, cy, size * (kind === "spawn" ? 0.2 : 0.28), paint);

  if (kind === "spawn") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#fff4db"));
    canvas.drawCircle(cx, cy, size * 0.075, paint);
  } else {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1.5, size * 0.055));
    paint.setColor(Skia.Color("#fff4db"));
    canvas.drawCircle(cx, cy, size * 0.16, paint);
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(
      Skia.XYWHRect(cx - size * 0.045, cy - size * 0.045, size * 0.09, size * 0.09),
      paint
    );
  }
}

function drawPathDirectionMarkersSkia(
  canvas: SkCanvas,
  world: TDWorld,
  isPaperDusk: boolean
): void {
  if (!Skia) return;
  const waypoints = world.getResource<WaypointList>("WaypointList");
  if (!waypoints) return;
  const paint = getPaint();
  if (!paint) return;

  const color = isPaperDusk
    ? resolveThemeColorWithFallback(world, "#14161B", "pd_pathEdge", "pd_ink")
    : "rgba(20,30,44,0.72)";

  for (const marker of createPathDirectionMarkers(waypoints.points)) {
    canvas.save();
    canvas.translate(marker.x, marker.y);
    canvas.rotate((marker.angle * 180) / Math.PI, 0, 0);
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2.5);
    paint.setColor(Skia.Color(color));
    canvas.drawLine(-5, -6, 2, 0, paint);
    canvas.drawLine(2, 0, -5, 6, paint);
    canvas.restore();
  }
}
export const drawSkiaTdMapBackground: EffectDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world: TDWorld) {
    if (!Skia) return;
    const bgCtx = resolveTdMapBackgroundContext(world);
    if (!bgCtx) return;
    const { layout } = bgCtx;

    const paint = getPaint();
    if (!paint) return;

    const isPaperDusk = isPaperDuskTheme(world);

    const vfxElapsed = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects")?.elapsedSeconds ?? 0;
    forEachTileGridCell(bgCtx, (tile, x, y, row, col) => {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      if (isPaperDusk) {
        const pdGround = resolveThemeColorWithFallback(world, "#2B2F36", "pd_ground");
        const pdBuildable = resolveThemeColorWithFallback(world, "#3A4049", "pd_buildable");
        const pdPath = resolveThemeColorWithFallback(world, "#D8C3A0", "pd_path");

        const fillColor =
          tile === "path" || tile === "spawn" || tile === "base"
            ? pdPath
            : tile === "buildable"
              ? pdBuildable
              : pdGround;

        paint.setColor(Skia.Color(fillColor));
      } else {
        paint.setColor(Skia.Color(getTileTypeColor(tile)));
      }
      canvas.drawRect(Skia.XYWHRect(x, y, layout.stepX - 1, layout.stepY - 1), paint);
      if (tile === "blocked") {
        drawTdAmbientStarSkia(canvas, x, y, layout.stepX, layout.stepY, row, col, vfxElapsed, isPaperDusk);
      }
      if (tile === "spawn" || tile === "base") {
        drawTdLandmarkSkia(canvas, world, x, y, layout.stepX, tile, isPaperDusk);
      }
    });

    drawPathDirectionMarkersSkia(canvas, world, isPaperDusk);

    const playerEntity = world.query("Player")[0];
    if (playerEntity !== undefined) {
      const player = world.getComponent(playerEntity, "Player");
      if (player?.selectedCell && player.selectedTowerType) {
        const catalog = world.getResource<Record<string, { range: number }>>("TowerCatalog");
        const def = catalog?.[player.selectedTowerType];
        if (def) {
          const cx =
            layout.offsetX + player.selectedCell.col * layout.stepX + layout.stepX / 2;
          const cy =
            layout.offsetY + player.selectedCell.row * layout.stepY + layout.stepY / 2;
          paint.reset();
          paint.setStyle(Skia.PaintStyle.Stroke);
          paint.setStrokeWidth(1.5);
          paint.setColor(Skia.Color(colors.border));
          canvas.drawCircle(cx, cy, def.range, paint);
        }
      }
    }

    drawTowerDefenseVfxSkia(canvas, world, layout, bgCtx.tileGrid, isPaperDusk);
  },
};
