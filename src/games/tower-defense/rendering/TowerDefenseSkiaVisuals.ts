import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, WaypointList, GameStateComponent, TileGrid, TowerDefenseVisualEffects } from "../types/TowerDefenseTypes";
import { getTileTypeColor } from "../MapUtils";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { Skia, getPaint, SkCanvas, SkPaint } from "../../shared/rendering/SkiaContext";
import { drawGlowOrbSkia } from "../../shared/rendering/SkiaNeonUtils";
import { colors } from "../../../theme/colors";
import { createSpriteAnimator, drawSpriteSkia } from "../../shared/sprites";
import { TOWER_DEFENSE_VISUAL_TOKENS } from "../presentation/TowerDefenseVisualTokens";
import {
  createPathDirectionMarkers,
  resolveCreepAnimationState,
  resolveCreepVisualState,
  resolveTowerProjectileDrawSetup,
  resolveTowerWeaponDrawSetup,
  resolveTdLandmarkSetup,
  resolveTdMapBackgroundContext,
  resolveTdScreenPosition,
  resolveTdProjectedBounds,
  resolveTowerPlacementPreviewSetup,
  forEachTileGridCell,
  isPaperDuskTheme,
  resolveEntityIsometricOffset,
  getEntityVisualHeight,
} from "./TowerDefenseVisualHelpers";
import { projectCircleRadii, projectVector } from "./IsoProjection";

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

function drawGroundShadowSkia(
  canvas: SkCanvas,
  size: number,
  heightOffset: number,
  isoEnabled: boolean
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color("rgba(0,0,0,0.35)"));

  canvas.save();
  if (isoEnabled) {
    canvas.translate(0, heightOffset);
    canvas.drawOval(Skia.XYWHRect(-size * 0.6, -size * 0.3, size * 1.2, size * 0.6), paint);
  } else {
    canvas.drawCircle(size * 0.1, size * 0.1, size * 0.5, paint);
  }
  canvas.restore();
}

function drawSkiaTowerWithOffset(
  canvas: SkCanvas,
  world: TDWorld,
  entity: number,
  drawer: () => void
): void {
  const { isoCfg, worldX, worldY, screenX, screenY } = resolveEntityIsometricOffset(world, entity, "tower");

  canvas.save();
  if (isoCfg.enabled) {
    const heightPx = getEntityVisualHeight("tower");
    canvas.translate(screenX - worldX, screenY - worldY);
    drawGroundShadowSkia(canvas, 28, heightPx, true);
    canvas.translate(0, -heightPx);
  }
  drawer();
  canvas.restore();
}

export const drawSkiaTowerBasic: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaTowerWithOffset(canvas, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      const isPaperDusk = isPaperDuskTheme(world);
      TOWER_BASIC_SPRITE.scale = size / 34;
      const spriteDrawn = !isPaperDusk && drawSpriteSkia(canvas, TOWER_BASIC_SPRITE, 0, 0);
      if (!spriteDrawn) {
        drawSkiaTower(world, canvas, size, "tower_basic", "tower_basic_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.basic.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.basic.accent, "basic");
      }
      drawSkiaTowerWeapon(canvas, world, entity, size, "basic");
    });
  },
};

export const drawSkiaTowerSniper: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaTowerWithOffset(canvas, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      const isPaperDusk = isPaperDuskTheme(world);
      TOWER_SNIPER_SPRITE.scale = size / 34;
      const spriteDrawn = !isPaperDusk && drawSpriteSkia(canvas, TOWER_SNIPER_SPRITE, 0, 0);
      if (!spriteDrawn) {
        drawSkiaTower(world, canvas, size, "tower_sniper", "tower_sniper_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.sniper.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.sniper.accent, "sniper");
      }
      drawSkiaTowerWeapon(canvas, world, entity, size, "sniper");
    });
  },
};

export const drawSkiaTowerRapid: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaTowerWithOffset(canvas, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      drawSkiaTower(world, canvas, size, "tower_rapid", "tower_rapid_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.rapid.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.rapid.accent, "rapid");
      drawSkiaTowerWeapon(canvas, world, entity, size, "rapid");
    });
  },
};

export const drawSkiaTowerFrost: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaTowerWithOffset(canvas, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      drawSkiaTower(world, canvas, size, "tower_frost", "tower_frost_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.frost.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.skia.frost.accent, "frost");
      drawSkiaTowerWeapon(canvas, world, entity, size, "frost");
    });
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
  isPaperDusk = false,
  type: "grunt" | "fast" | "tank" | "boss" = "grunt",
  hitFlash = false,
  isoEnabled = false
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
  if (isoEnabled) {
    canvas.translate(0, size * 0.2);
    canvas.drawOval(Skia.XYWHRect(-radius, -radius * 0.5, radius * 2, radius), paint);
  } else {
    canvas.translate(size * 0.1, size * 0.1);
    drawSkiaCreepGeometry(canvas, paint, radius, type);
  }
  canvas.restore();

  if (isoEnabled) {
    canvas.translate(0, -getEntityVisualHeight("creep"));
  }

  paint.setColor(Skia.Color(bodyFill));
  drawSkiaCreepGeometry(canvas, paint, radius, type);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(Math.max(2, size * (isPaperDusk ? 0.1 : 0.08)));
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

export const drawSkiaCreepBoss: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 28, "boss");
    const isPaperDusk = isPaperDuskTheme(world);
    const animation = resolveCreepAnimationState(world, entity, "boss");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    const { isoCfg, worldX, worldY, screenX, screenY } = resolveEntityIsometricOffset(world, entity, "creep");

    canvas.save();
    if (isoCfg.enabled) canvas.translate(screenX - worldX, screenY - worldY);
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "boss", hitFlash, isoCfg.enabled);
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
    const { isoCfg, worldX, worldY, screenX, screenY } = resolveEntityIsometricOffset(world, entity, "creep");

    canvas.save();
    if (isoCfg.enabled) canvas.translate(screenX - worldX, screenY - worldY);
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "grunt", hitFlash, isoCfg.enabled);
    drawSkiaCreepHealthBar(canvas, world, entity, size);
    canvas.restore();
  },
};

export const drawSkiaCreepFast: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 10, "fast");
    const animation = resolveCreepAnimationState(world, entity, "fast");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    const { isoCfg, worldX, worldY, screenX, screenY } = resolveEntityIsometricOffset(world, entity, "creep");

    canvas.save();
    if (isoCfg.enabled) canvas.translate(screenX - worldX, screenY - worldY);
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "fast", hitFlash, isoCfg.enabled);
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
    const { isoCfg, worldX, worldY, screenX, screenY } = resolveEntityIsometricOffset(world, entity, "creep");

    canvas.save();
    if (isoCfg.enabled) canvas.translate(screenX - worldX, screenY - worldY);
    canvas.translate(animation.offsetX, animation.offsetY);
    canvas.rotate((animation.rotation * 180) / Math.PI, 0, 0);
    canvas.scale(animation.scaleX, animation.scaleY);
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "tank", hitFlash, isoCfg.enabled);
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
    const projection = resolveEntityIsometricOffset(world, entity, "projectile");
    if (projection.isoCfg.enabled) {
      canvas.translate(projection.screenX - projection.worldX, projection.screenY - projection.worldY);
    }

    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;

    const velocity = world.getComponent(entity, "Velocity");
    const projectedVelocity = velocity && projection.isoCfg.enabled
      ? projectVector(projection.isoCfg, velocity.vx, velocity.vy)
      : velocity ? { x: velocity.vx, y: velocity.vy } : null;
    if (projectedVelocity) {
      const speed = Math.hypot(projectedVelocity.x, projectedVelocity.y);
      if (speed > 1) {
        const dirX = projectedVelocity.x / speed;
        const dirY = projectedVelocity.y / speed;
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
  isPaperDusk: boolean,
  isoEnabled = false
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  const seed = (row * 73 + col * 37 + 19) >>> 0;
  if (seed % 3 !== 0) return;
  const normalizedX = ((seed % 97) / 96) - 0.5;
  const normalizedY = (((seed * 13) % 89) / 88) - 0.5;
  const starX = isoEnabled
    ? x + normalizedX * width * 0.5
    : x + 5 + (seed % Math.max(1, Math.floor(width - 10)));
  const starY = isoEnabled
    ? y + normalizedY * height * 0.5
    : y + 5 + ((seed * 13) % Math.max(1, Math.floor(height - 10)));
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
  isPaperDusk: boolean,
  isoCfg: import("./IsoProjection").IsoConfig
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  const state = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects");
  const gameState = world.getSingleton("GameState") as GameStateComponent | undefined;
  const projectedBounds = resolveTdProjectedBounds(layout, tileGrid, isoCfg);
  const centerX = projectedBounds.centerX;
  const bannerY = Math.max(8, projectedBounds.minY - (isoCfg.enabled ? 12 : 10));

  if (state) {
    for (const effect of state.effects) {
      const progress = Math.max(0, Math.min(1, effect.ageSeconds / effect.durationSeconds));
      const fade = progress > 0.68 ? (1 - progress) / 0.32 : 1;
      const effectPosition = resolveTdScreenPosition(isoCfg, effect.x, effect.y);
      const effectX = effectPosition.x;
      const effectY = effectPosition.y;
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
        canvas.drawCircle(effectX, effectY, 4 + progress * 12, paint);
        paint.setStyle(Skia.PaintStyle.Fill);
        for (let index = 0; index < count; index++) {
          const angle = (index / count) * Math.PI * 2 + effect.id * 0.37;
          const distance = radius * (0.65 + (index % 3) * 0.18);
          const sparkX = effectX + Math.cos(angle) * distance;
          const sparkY = effectY + Math.sin(angle) * distance;
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
        canvas.drawCircle(effectX, effectY, Math.max(1, 3 * (1 - progress)), paint);
      } else if (effect.kind === "gold-reward") {
        const rise = progress * 28;
        const coinX = effectX;
        const coinY = effectY - rise;
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
          canvas.drawCircle(effectX, effectY, 6 + ringProgress * (34 + ring * 9), paint);
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

export const drawSkiaTdVfx: EffectDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world: TDWorld) {
    const bgCtx = resolveTdMapBackgroundContext(world);
    if (!bgCtx) return;
    drawTowerDefenseVfxSkia(canvas, world, bgCtx.layout, bgCtx.tileGrid, isPaperDuskTheme(world), bgCtx.isoCfg);
  },
};

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
  isPaperDusk: boolean,
  isoCfg?: import("./IsoProjection").IsoConfig
): void {
  if (!Skia) return;
  const waypoints = world.getResource<WaypointList>("WaypointList");
  if (!waypoints) return;
  const paint = getPaint();
  if (!paint) return;

  const color = isPaperDusk
    ? resolveThemeColorWithFallback(world, "#14161B", "pd_pathEdge", "pd_ink")
    : "rgba(20,30,44,0.72)";

  for (const marker of createPathDirectionMarkers(waypoints.points, isoCfg)) {
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

function drawDashedLineSkia(
  canvas: SkCanvas,
  paint: SkPaint,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLength: number,
  gapLength: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return;
  const directionX = dx / length;
  const directionY = dy / length;
  const stride = dashLength + gapLength;

  for (let offset = 0; offset < length; offset += stride) {
    const end = Math.min(length, offset + dashLength);
    canvas.drawLine(
      x1 + directionX * offset,
      y1 + directionY * offset,
      x1 + directionX * end,
      y1 + directionY * end,
      paint
    );
  }
}

function drawDashedRectSkia(
  canvas: SkCanvas,
  paint: SkPaint,
  x: number,
  y: number,
  width: number,
  height: number,
  dashLength = 2,
  gapLength = 2
): void {
  drawDashedLineSkia(canvas, paint, x, y, x + width, y, dashLength, gapLength);
  drawDashedLineSkia(canvas, paint, x + width, y, x + width, y + height, dashLength, gapLength);
  drawDashedLineSkia(canvas, paint, x + width, y + height, x, y + height, dashLength, gapLength);
  drawDashedLineSkia(canvas, paint, x, y + height, x, y, dashLength, gapLength);
}

function drawRhombusTileSkia(
  canvas: SkCanvas,
  paint: SkPaint,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  fillColor: string,
  strokeColor?: string,
  dashed = false
): void {
  if (!Skia) return;
  const path = Skia.Path.Make();
  path.moveTo(cx, cy - halfHeight);
  path.lineTo(cx + halfWidth, cy);
  path.lineTo(cx, cy + halfHeight);
  path.lineTo(cx - halfWidth, cy);
  path.close();

  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(fillColor));
  canvas.drawPath(path, paint);

  if (strokeColor) {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1);
    paint.setColor(Skia.Color(strokeColor));
    if (dashed) {
      drawDashedLineSkia(canvas, paint, cx, cy - halfHeight, cx + halfWidth, cy, 3, 3);
      drawDashedLineSkia(canvas, paint, cx + halfWidth, cy, cx, cy + halfHeight, 3, 3);
      drawDashedLineSkia(canvas, paint, cx, cy + halfHeight, cx - halfWidth, cy, 3, 3);
      drawDashedLineSkia(canvas, paint, cx - halfWidth, cy, cx, cy - halfHeight, 3, 3);
    } else {
      canvas.drawPath(path, paint);
    }
  }
}

function drawSkiaTowerPlacementPreview(
  canvas: SkCanvas,
  world: TDWorld,
  layout: GridLayout,
  tileGrid: TileGrid,
  isoCfg: import("./IsoProjection").IsoConfig
): void {
  if (!Skia) return;
  const preview = resolveTowerPlacementPreviewSetup(world, layout, tileGrid, isoCfg);
  if (!preview) return;
  const { col, row, towerType, definition, center, buildable, canAfford, canBuild } = preview;
  const paint = getPaint();
  if (!paint) return;

  const rangeRadii = projectCircleRadii(isoCfg, definition.range);
  canvas.save();
  canvas.translate(center.x, center.y);
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(canBuild ? "rgba(79,195,247,0.08)" : "rgba(229,57,53,0.06)"));
  canvas.drawOval(
    Skia.XYWHRect(-rangeRadii.rx, -rangeRadii.ry, rangeRadii.rx * 2, rangeRadii.ry * 2),
    paint
  );
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.5);
  paint.setColor(Skia.Color(canBuild ? "rgba(79,195,247,0.45)" : "rgba(229,57,53,0.35)"));
  canvas.drawOval(
    Skia.XYWHRect(-rangeRadii.rx, -rangeRadii.ry, rangeRadii.rx * 2, rangeRadii.ry * 2),
    paint
  );
  canvas.restore();

  if (isoCfg.enabled) {
    drawRhombusTileSkia(
      canvas,
      paint,
      center.x,
      center.y,
      isoCfg.tileWidthHalf - 1,
      isoCfg.tileHeightHalf - 1,
      canBuild ? "rgba(102,187,106,0.2)" : "rgba(229,57,53,0.2)",
      canBuild ? "rgba(102,187,106,0.9)" : "rgba(229,57,53,0.7)"
    );
  } else {
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);
    paint.setColor(Skia.Color(canBuild ? "rgba(102,187,106,0.9)" : "rgba(229,57,53,0.7)"));
    canvas.drawRect(
      Skia.XYWHRect(layout.offsetX + col * layout.stepX + 1, layout.offsetY + row * layout.stepY + 1, layout.stepX - 3, layout.stepY - 3),
      paint
    );
  }

  // A compact translucent tower silhouette provides the same placement cue
  // without coupling the Skia path to the procedural tower implementation.
  canvas.save();
  canvas.translate(center.x, center.y - (isoCfg.enabled ? getEntityVisualHeight("tower") : 0));
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setAlphaf(0.45);
  const ghostColor = towerType === "sniper" ? "#ab47bc"
    : towerType === "rapid" ? "#66bb6a"
    : towerType === "frost" ? "#4dd0e1"
    : "#4fc3f7";
  paint.setColor(Skia.Color(ghostColor));
  const size = layout.stepX * 0.65;
  canvas.drawCircle(0, 0, size * 0.42, paint);
  const shape = Skia.Path.Make();
  if (towerType === "rapid") {
    shape.addRect(Skia.XYWHRect(-size * 0.2, -size * 0.2, size * 0.4, size * 0.4));
  } else if (towerType === "sniper") {
    shape.moveTo(-size * 0.16, size * 0.1);
    shape.lineTo(-size * 0.1, -size * 0.28);
    shape.lineTo(size * 0.1, -size * 0.28);
    shape.lineTo(size * 0.16, size * 0.1);
    shape.close();
  } else if (towerType === "frost") {
    for (let index = 0; index < 6; index++) {
      const angle = (index * Math.PI) / 3;
      const x = Math.cos(angle) * size * 0.25;
      const y = Math.sin(angle) * size * 0.25;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.close();
  } else {
    shape.moveTo(0, -size * 0.28);
    shape.lineTo(size * 0.24, size * 0.18);
    shape.lineTo(-size * 0.24, size * 0.18);
    shape.close();
  }
  paint.setColor(Skia.Color("#101827"));
  paint.setAlphaf(0.75);
  canvas.drawPath(shape, paint);
  canvas.restore();

  if (!canAfford && buildable) {
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#ef5350"));
    const font = Skia.Font ? Skia.Font(null, 11) : null;
    if (font) canvas.drawText("NO GOLD", center.x - 22, center.y - (isoCfg.enabled ? isoCfg.tileHeightHalf + 10 : 20), paint, font);
  }
}

export const drawSkiaTdMapBackground: EffectDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world: TDWorld) {
    if (!Skia) return;
    const bgCtx = resolveTdMapBackgroundContext(world);
    if (!bgCtx) return;
    const { layout, isoCfg } = bgCtx;

    const paint = getPaint();
    if (!paint) return;

    const isPaperDusk = isPaperDuskTheme(world);
    const vfxElapsed = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects")?.elapsedSeconds ?? 0;

    forEachTileGridCell(bgCtx, (tile, x, y, row, col) => {
      paint.reset();
      if (isoCfg.enabled) {
        const pdGround = resolveThemeColorWithFallback(world, "#2B2F36", "pd_ground");
        const pdBuildable = resolveThemeColorWithFallback(world, "#3A4049", "pd_buildable");
        const pdBuildableEdge = resolveThemeColorWithFallback(world, "#5B6470", "pd_buildableEdge");
        const pdPath = resolveThemeColorWithFallback(world, "#D8C3A0", "pd_path");
        const pdPathEdge = resolveThemeColorWithFallback(world, "#B39B73", "pd_pathEdge");

        const fillColor = isPaperDusk
          ? (tile === "path" || tile === "spawn" || tile === "base" ? pdPath : tile === "buildable" ? pdBuildable : pdGround)
          : getTileTypeColor(tile);

        const strokeColor = isPaperDusk
          ? (tile === "path" ? pdPathEdge : tile === "buildable" ? pdBuildableEdge : undefined)
          : undefined;

        drawRhombusTileSkia(canvas, paint, x, y, isoCfg.tileWidthHalf, isoCfg.tileHeightHalf, fillColor, strokeColor, tile === "buildable");
      } else {
        const pdBuildableEdge = resolveThemeColorWithFallback(world, "#5B6470", "pd_buildableEdge");
        const pdPathEdge = resolveThemeColorWithFallback(world, "#B39B73", "pd_pathEdge");
        paint.setStyle(Skia.PaintStyle.Fill);
        if (isPaperDusk) {
          const pdGround = resolveThemeColorWithFallback(world, "#2B2F36", "pd_ground");
          const pdBuildable = resolveThemeColorWithFallback(world, "#3A4049", "pd_buildable");
          const pdBuildableEdge = resolveThemeColorWithFallback(world, "#5B6470", "pd_buildableEdge");
          const pdPath = resolveThemeColorWithFallback(world, "#D8C3A0", "pd_path");
          const pdPathEdge = resolveThemeColorWithFallback(world, "#B39B73", "pd_pathEdge");

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
        if (isPaperDusk && tile === "path") {
          paint.setStyle(Skia.PaintStyle.Stroke);
          paint.setStrokeWidth(1);
          paint.setColor(Skia.Color(pdPathEdge));
          canvas.drawRect(Skia.XYWHRect(x, y, layout.stepX - 1, layout.stepY - 1), paint);
        } else if (isPaperDusk && tile === "buildable") {
          paint.setStyle(Skia.PaintStyle.Stroke);
          paint.setStrokeWidth(1);
          paint.setColor(Skia.Color(pdBuildableEdge));
          drawDashedRectSkia(canvas, paint, x + 1, y + 1, layout.stepX - 3, layout.stepY - 3);
        }
      }

      if (tile === "blocked") {
        drawTdAmbientStarSkia(canvas, x, y, isoCfg.enabled ? isoCfg.tileWidthHalf * 2 : layout.stepX, isoCfg.enabled ? isoCfg.tileHeightHalf * 2 : layout.stepY, row, col, vfxElapsed, isPaperDusk, isoCfg.enabled);
      }

      if (tile === "spawn" || tile === "base") {
        drawTdLandmarkSkia(canvas, world, x, y, isoCfg.enabled ? isoCfg.tileWidthHalf : layout.stepX, tile, isPaperDusk);
      }
    });

    drawPathDirectionMarkersSkia(canvas, world, isPaperDusk, isoCfg);
    drawSkiaTowerPlacementPreview(canvas, world, layout, bgCtx.tileGrid, isoCfg);


  },
};
