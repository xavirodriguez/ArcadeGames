import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";
import { getTileTypeColor } from "../MapUtils";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";
import { drawGlowOrbSkia } from "../../shared/rendering/SkiaNeonUtils";
import { colors } from "../../../theme/colors";
import {
  resolveCreepVisualState,
  resolveTowerProjectileDrawSetup,
  resolveTdMapBackgroundContext,
} from "./TowerDefenseVisualHelpers";

type TDWorld = World<TowerDefenseComponentRegistry>;

function drawSkiaTower(
  world: TDWorld,
  canvas: SkCanvas,
  size: number,
  primaryKey: string,
  accentKey: string,
  fallbackPrimary: string,
  fallbackAccent: string
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  const primary = resolveThemeColorWithFallback(world, fallbackPrimary, primaryKey, "primary");
  const accent = resolveThemeColorWithFallback(world, fallbackAccent, accentKey, "accent");
  const baseBg = resolveThemeColorWithFallback(world, colors.backgroundSlate, "tower_base_bg");

  const s = size;
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(baseBg));
  canvas.drawRect(Skia.XYWHRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4), paint);

  paint.setColor(Skia.Color(primary));
  const path = Skia.Path.Make();
  path.moveTo(-s * 0.25, -s * 0.1);
  path.lineTo(-s * 0.1, -s * 0.45);
  path.lineTo(s * 0.1, -s * 0.45);
  path.lineTo(s * 0.25, -s * 0.1);
  path.close();
  canvas.drawPath(path, paint);

  paint.setColor(Skia.Color(accent));
  canvas.drawCircle(0, 0, s * 0.18, paint);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.5);
  paint.setColor(Skia.Color(accent));
  canvas.drawRect(Skia.XYWHRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4), paint);
}

export const drawSkiaTowerBasic: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    drawSkiaTower(world, canvas, render?.size ?? 28, "tower_basic", "tower_basic_accent", colors.cyan, colors.blueLight);
  },
};

export const drawSkiaTowerSniper: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_sniper", "tower_sniper_accent", colors.purple, colors.violet);
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    const barrelColor = resolveThemeColorWithFallback(world, colors.violet, "tower_sniper_barrel");
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(barrelColor));
    canvas.drawRect(Skia.XYWHRect(-2, -size * 0.7, 4, size * 0.35), paint);
  },
};

export const drawSkiaTowerRapid: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_rapid", "tower_rapid_accent", colors.green, colors.primary);
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    const barrelColor = resolveThemeColorWithFallback(world, colors.green, "tower_rapid_barrel");
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(barrelColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.18, -size * 0.5, 3, size * 0.25), paint);
    canvas.drawRect(Skia.XYWHRect(size * 0.08, -size * 0.5, 3, size * 0.25), paint);
  },
};

function drawSkiaCreep(canvas: SkCanvas, size: number, fill: string): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(fill));
  canvas.drawCircle(0, 0, size / 2, paint);
  paint.setColor(Skia.Color(colors.white));
  canvas.drawCircle(size * 0.15, -size * 0.1, size * 0.12, paint);
  paint.setColor(Skia.Color(colors.neutral[800]));
  canvas.drawCircle(size * 0.18, -size * 0.1, size * 0.06, paint);
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
    drawSkiaTower(world, canvas, render?.size ?? 28, "tower_frost", "tower_frost_accent", colors.cyan, colors.tertiary);
  },
};

export const drawSkiaCreepBoss: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 28, "boss");

    drawSkiaCreep(canvas, size, fill);
    drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
  },
};

export const drawSkiaCreepGrunt: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill } = resolveCreepVisualState(world, entity, 12, "grunt");
    drawSkiaCreep(canvas, size, fill);
  },
};

export const drawSkiaCreepFast: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill } = resolveCreepVisualState(world, entity, 10, "fast");
    drawSkiaCreep(canvas, size, fill);
  },
};

export const drawSkiaCreepTank: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill } = resolveCreepVisualState(world, entity, 18, "tank");
    const stroke = resolveThemeColorWithFallback(world, colors.slate, "creep_tank_plate");

    drawSkiaCreep(canvas, size, fill);
    drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
  },
};

export const drawSkiaTowerProjectile: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, color } = resolveTowerProjectileDrawSetup(world, entity);

    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    drawGlowOrbSkia(canvas, paint, size, color, 0.5, 1.5);
  },
};

export const drawSkiaTdMapBackground: EffectDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world: TDWorld) {
    if (!Skia) return;
    const bgCtx = resolveTdMapBackgroundContext(world);
    if (!bgCtx) return;
    const { layout, tileGrid } = bgCtx;

    const paint = getPaint();
    if (!paint) return;

    for (let row = 0; row < tileGrid.rows; row++) {
      for (let col = 0; col < tileGrid.cols; col++) {
        const tile = tileGrid.tiles[row]?.[col];
        const x = layout.offsetX + col * layout.stepX;
        const y = layout.offsetY + row * layout.stepY;
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(getTileTypeColor(tile)));
        canvas.drawRect(Skia.XYWHRect(x, y, layout.stepX - 1, layout.stepY - 1), paint);
      }
    }

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
  },
};
