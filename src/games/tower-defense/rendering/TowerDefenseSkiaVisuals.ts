import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, GameStateComponent, TileGrid } from "../types/TowerDefenseTypes";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { getTileTypeColor } from "../MapUtils";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { drawGlowOrbSkia } from "../../shared/rendering/SkiaNeonUtils";

type TDWorld = World<TowerDefenseComponentRegistry>;

function drawSkiaTower(
  world: TDWorld,
  canvas: any,
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
  const baseBg = resolveThemeColorWithFallback(world, "#1a2332", "tower_base_bg");

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

export const drawSkiaTowerBasic: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    drawSkiaTower(world, canvas, render?.size ?? 28, "tower_basic", "tower_basic_accent", "#4fc3f7", "#81d4fa");
  },
};

export const drawSkiaTowerSniper: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_sniper", "tower_sniper_accent", "#ab47bc", "#ce93d8");
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    const barrelColor = resolveThemeColorWithFallback(world, "#e1bee7", "tower_sniper_barrel");
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(barrelColor));
    canvas.drawRect(Skia.XYWHRect(-2, -size * 0.7, 4, size * 0.35), paint);
  },
};

export const drawSkiaTowerRapid: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_rapid", "tower_rapid_accent", "#66bb6a", "#a5d6a7");
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    const barrelColor = resolveThemeColorWithFallback(world, "#c8e6c9", "tower_rapid_barrel");
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(barrelColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.18, -size * 0.5, 3, size * 0.25), paint);
    canvas.drawRect(Skia.XYWHRect(size * 0.08, -size * 0.5, 3, size * 0.25), paint);
  },
};

function drawSkiaCreep(canvas: any, size: number, fill: string): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(fill));
  canvas.drawCircle(0, 0, size / 2, paint);
  paint.setColor(Skia.Color("#ffffff"));
  canvas.drawCircle(size * 0.15, -size * 0.1, size * 0.12, paint);
  paint.setColor(Skia.Color("#111111"));
  canvas.drawCircle(size * 0.18, -size * 0.1, size * 0.06, paint);
}

export const drawSkiaTowerFrost: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    drawSkiaTower(world, canvas, render?.size ?? 28, "tower_frost", "tower_frost_accent", "#4dd0e1", "#b2ebf2");
  },
};

export const drawSkiaCreepBoss: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#4dd0e1", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#c62828", "creep_boss", "boss");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, "#e53935", "creep_boss_stroke");

    drawSkiaCreep(canvas, size, fill);
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    paint.setColor(Skia.Color(stroke));
    canvas.drawCircle(0, 0, size * 0.55, paint);
  },
};

export const drawSkiaCreepGrunt: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#ff7043", "creep_grunt", "enemy");
    drawSkiaCreep(canvas, render?.size ?? 12, fill);
  },
};

export const drawSkiaCreepFast: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#29b6f6", "creep_fast", "enemy");
    drawSkiaCreep(canvas, render?.size ?? 10, fill);
  },
};

export const drawSkiaCreepTank: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 18;
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#80deea", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#8d6e63", "creep_tank", "enemy");
    const stroke = resolveThemeColorWithFallback(world, "#5d4037", "creep_tank_plate");

    drawSkiaCreep(canvas, size, fill);
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    paint.setColor(Skia.Color(stroke));
    canvas.drawCircle(0, 0, size * 0.55, paint);
  },
};

export const drawSkiaTowerProjectile: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const proj = world.getComponent(entity, "TowerProjectile");
    const size = render?.size ?? 4;
    const frost = !!(proj?.slowFactor && proj.slowFactor < 1);
    const color = frost
      ? resolveThemeColorWithFallback(world, "#4dd0e1", "tower_projectile_frost")
      : resolveThemeColorWithFallback(world, "#ffee58", "tower_projectile", "bullet");

    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    drawGlowOrbSkia(canvas, paint, size, color, 0.5, 1.5);
  },
};

export const drawSkiaTdMapBackground: EffectDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world: TDWorld) {
    if (!Skia) return;
    const layout = world.getResource<GridLayout>("GridLayout");
    const tileGrid = world.getResource<TileGrid>("TileGrid");
    if (!layout || !tileGrid) return;

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
          paint.setColor(Skia.Color("rgba(79, 195, 247, 0.35)"));
          canvas.drawCircle(cx, cy, def.range, paint);
        }
      }
    }
  },
};
