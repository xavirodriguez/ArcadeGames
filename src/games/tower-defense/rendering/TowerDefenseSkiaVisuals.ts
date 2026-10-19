import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";
import { getTileTypeColor } from "../MapUtils";
import { Skia, getPaint, SkCanvas, SkPaint } from "../../shared/rendering/SkiaContext";
import { drawGlowOrbSkia } from "../../shared/rendering/SkiaNeonUtils";
import { colors } from "../../../theme/colors";
import {
  resolveCreepVisualState,
  resolveTowerProjectileDrawSetup,
  resolveTdMapBackgroundContext,
  forEachTileGridCell,
  isPaperDuskTheme,
} from "./TowerDefenseVisualHelpers";

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
    drawSkiaTower(world, canvas, render?.size ?? 28, "tower_basic", "tower_basic_accent", colors.cyan, colors.blueLight, "basic");
  },
};

export const drawSkiaTowerSniper: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_sniper", "tower_sniper_accent", colors.purple, colors.violet, "sniper");
    if (!isPaperDuskTheme(world) && Skia) {
      const paint = getPaint();
      if (!paint) return;
      const barrelColor = resolveThemeColorWithFallback(world, colors.violet, "tower_sniper_barrel");
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(barrelColor));
      canvas.drawRect(Skia.XYWHRect(-2, -size * 0.7, 4, size * 0.35), paint);
    }
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

function drawSkiaCreepGeometry(
  canvas: SkCanvas,
  paint: SkPaint,
  radius: number,
  type: "grunt" | "fast" | "tank" | "boss"
): void {
  if (type === "fast") {
    canvas.drawOval(Skia.XYWHRect(-radius * 1.3, -radius * 0.8, radius * 2.6, radius * 1.6), paint);
  } else if (type === "boss") {
    const path = Skia.Path.Make();
    const bumps = 10;
    for (let i = 0; i <= 100; i++) {
      const theta = (i / 100) * Math.PI * 2;
      const r = radius * (1 + 0.07 * Math.sin(theta * bumps));
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

function drawSkiaCreep(
  canvas: SkCanvas,
  size: number,
  fill: string,
  stroke: string,
  isPaperDusk = false,
  type: "grunt" | "fast" | "tank" | "boss" = "grunt"
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  if (isPaperDusk) {
    const shadowOffset = size * 0.1;
    const shadowColor = "rgba(0,0,0,0.35)";
    const radius = size / 2;

    paint.reset();
    paint.setAntiAlias(true);

    // Hard Shadow
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(shadowColor));
    canvas.save();
    canvas.translate(shadowOffset, shadowOffset);

    drawSkiaCreepGeometry(canvas, paint, radius, type);
    canvas.restore();

    // Body Fill
    paint.setColor(Skia.Color(fill));
    drawSkiaCreepGeometry(canvas, paint, radius, type);

    // Ink Stroke
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(2, size * 0.08));
    paint.setColor(Skia.Color(stroke));
    drawSkiaCreepGeometry(canvas, paint, radius, type);

    return;
  }

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
    const isPaperDusk = isPaperDuskTheme(world);

    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "boss");
    if (!isPaperDusk) {
      drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
    }
  },
};

export const drawSkiaCreepGrunt: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 12, "grunt");
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "grunt");
  },
};

export const drawSkiaCreepFast: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 10, "fast");
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "fast");
  },
};

export const drawSkiaCreepTank: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 18, "tank");
    const isPaperDusk = isPaperDuskTheme(world);

    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "tank");
    if (!isPaperDusk) {
      drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
    }
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
    const { layout } = bgCtx;

    const paint = getPaint();
    if (!paint) return;

    const isPaperDusk = isPaperDuskTheme(world);

    forEachTileGridCell(bgCtx, (tile, x, y) => {
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
    });

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
