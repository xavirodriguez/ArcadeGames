import type { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, GameStateComponent, TileGrid } from "../types/TowerDefenseTypes";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { drawGlowOrbSkia } from "../../shared/rendering/SkiaNeonUtils";

type TDWorld = World<TowerDefenseComponentRegistry>;

function drawSkiaTower(
  canvas: any,
  size: number,
  primary: string,
  accent: string
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  const s = size;
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color("#1a2332"));
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
    drawSkiaTower(canvas, render?.size ?? 28, "#4fc3f7", "#81d4fa");
  },
};

export const drawSkiaTowerSniper: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(canvas, size, "#ab47bc", "#ce93d8");
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#e1bee7"));
    canvas.drawRect(Skia.XYWHRect(-2, -size * 0.7, 4, size * 0.35), paint);
  },
};

export const drawSkiaTowerRapid: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(canvas, size, "#66bb6a", "#a5d6a7");
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#c8e6c9"));
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
    drawSkiaTower(canvas, render?.size ?? 28, "#4dd0e1", "#b2ebf2");
  },
};

export const drawSkiaCreepBoss: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
        // TODO(refactor): código duplicado detectado (bloque) con tower-defense/rendering/TowerDefenseSkiaVisuals.ts:138-145. Considerar extraer a función compartida. Ref: f95aa196
drawSkiaCreep(canvas, size, "#c62828");
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    paint.setColor(Skia.Color("#e53935"));
    canvas.drawCircle(0, 0, size * 0.55, paint);
  },
};

export const drawSkiaCreepGrunt: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    drawSkiaCreep(canvas, render?.size ?? 12, "#ff7043");
  },
};

export const drawSkiaCreepFast: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    drawSkiaCreep(canvas, render?.size ?? 10, "#29b6f6");
  },
};

export const drawSkiaCreepTank: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 18;
    drawSkiaCreep(canvas, size, "#8d6e63");
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    paint.setColor(Skia.Color("#5d4037"));
    canvas.drawCircle(0, 0, size * 0.55, paint);
  },
};

export const drawSkiaTowerProjectile: ShapeDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 4;
    if (!Skia) return;
    const paint = getPaint();
    if (!paint) return;
    drawGlowOrbSkia(canvas, paint, size, "#ffee58", 0.5, 1.5);
  },
};

export const drawSkiaTdMapBackground: EffectDrawer<any, TowerDefenseComponentRegistry> = {
  draw(canvas, world: TDWorld) {
    if (!Skia) return;
    const layout = world.getResource<GridLayout>("GridLayout");
    const tileGrid = world.getResource<TileGrid>("TileGrid");
    if (!layout || !tileGrid) return;

    const paint = getPaint();
        // TODO(refactor): código duplicado detectado (bloque) con tower-defense/rendering/TowerDefenseCanvasVisuals.ts:186-197. Considerar extraer a función compartida. Ref: 493978f3
if (!paint) return;

    for (let row = 0; row < tileGrid.rows; row++) {
      for (let col = 0; col < tileGrid.cols; col++) {
        const tile = tileGrid.tiles[row]?.[col];
        const x = layout.offsetX + col * layout.stepX;
        const y = layout.offsetY + row * layout.stepY;
        let color = "#0f0f1a";
        if (tile === "path") color = "#2a2a4a";
        else if (tile === "buildable") color = "#16213e";
        else if (tile === "spawn") color = "#3d1a1a";
        else if (tile === "base") color = "#1a3d1a";

        paint.reset();
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(color));
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
