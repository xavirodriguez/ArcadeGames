import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, WaypointList } from "../types/TowerDefenseTypes";
import { getTileTypeColor } from "../MapUtils";
import { Skia, getPaint, SkCanvas, SkPaint } from "../../shared/rendering/SkiaContext";
import { drawGlowOrbSkia } from "../../shared/rendering/SkiaNeonUtils";
import { colors } from "../../../theme/colors";
import {
  createPathDirectionMarkers,
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
  const tower = world.getComponent(entity, "Tower");
  const transform = world.getComponent(entity, "Transform");
  const targetTransform = tower && tower.targetEntity !== null
    ? world.getComponent(tower.targetEntity, "Transform")
    : undefined;
  const angle = transform && targetTransform
    ? Math.atan2(targetTransform.y - transform.y, targetTransform.x - transform.x)
    : -Math.PI / 2;

  const barrelColor = type === "sniper"
    ? resolveThemeColorWithFallback(world, colors.violet, "tower_sniper_barrel")
    : type === "rapid"
      ? resolveThemeColorWithFallback(world, colors.green, "tower_rapid_barrel")
      : type === "frost"
        ? resolveThemeColorWithFallback(world, "#e0f7fa", "tower_frost_flake", "tower_frost_accent")
        : resolveThemeColorWithFallback(world, colors.blueLight, "tower_basic_accent");
  const inkColor = isPaperDuskTheme(world)
    ? resolveThemeColorWithFallback(world, "#14161B", "pd_ink")
    : "#101827";
  const barrelLength = size * (type === "sniper" ? 0.62 : type === "rapid" ? 0.5 : 0.54);
  const barrelWidth = Math.max(3, size * (type === "sniper" ? 0.15 : 0.12));
  const cooldownDuration = tower && tower.fireRate > 0 ? 1 / tower.fireRate : 0;
  const firing = Boolean(
    tower && cooldownDuration > 0 && tower.cooldownRemaining > 0 &&
    tower.cooldownRemaining >= cooldownDuration * 0.9
  );

  canvas.save();
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
    drawSkiaTower(world, canvas, size, "tower_basic", "tower_basic_accent", colors.cyan, colors.blueLight, "basic");
    drawSkiaTowerWeapon(canvas, world, entity, size, "basic");
  },
};

export const drawSkiaTowerSniper: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawSkiaTower(world, canvas, size, "tower_sniper", "tower_sniper_accent", colors.purple, colors.violet, "sniper");
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
  type: "grunt" | "fast" | "tank" | "boss"
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

  if (type === "tank") {
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1.5, size * 0.06));
    paint.setColor(Skia.Color("#14161b"));
    canvas.drawLine(-size * 0.27, size * 0.22, size * 0.27, size * 0.22, paint);
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

  drawSkiaCreepDetails(canvas, size, type);
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
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;

    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "boss", hitFlash);
    if (!isPaperDusk) {
      drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
    }
    drawSkiaCreepHealthBar(canvas, world, entity, size);
  },
};

export const drawSkiaCreepGrunt: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 12, "grunt");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "grunt", hitFlash);
    drawSkiaCreepHealthBar(canvas, world, entity, size);
  },
};

export const drawSkiaCreepFast: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 10, "fast");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    drawSkiaCreep(canvas, size, fill, stroke, isPaperDuskTheme(world), "fast", hitFlash);
    drawSkiaCreepHealthBar(canvas, world, entity, size);
  },
};

export const drawSkiaCreepTank: ShapeDrawer<SkCanvas, TowerDefenseComponentRegistry> = {
  draw(canvas, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 18, "tank");
    const isPaperDusk = isPaperDuskTheme(world);
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;

    drawSkiaCreep(canvas, size, fill, stroke, isPaperDusk, "tank", hitFlash);
    if (!isPaperDusk) {
      drawSkiaCreepStrokedOutline(canvas, size * 0.55, stroke, 3);
    }
    drawSkiaCreepHealthBar(canvas, world, entity, size);
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

  const cx = x + size / 2;
  const cy = y + size / 2;
  const fill = kind === "spawn"
    ? resolveThemeColorWithFallback(world, "#ef5350", "map_spawn", "accent")
    : resolveThemeColorWithFallback(world, "#43a047", "map_base", "primary");
  const outline = isPaperDusk
    ? resolveThemeColorWithFallback(world, "#14161B", "pd_ink")
    : "#101827";

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
  },
};
