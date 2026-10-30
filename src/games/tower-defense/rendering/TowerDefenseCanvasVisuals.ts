import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  WaypointList,
  GameStateComponent,
  TileGrid,
  ThreatInfo,
  TowerCatalog,
  TowerDefenseVisualEffects,
} from "../types/TowerDefenseTypes";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { getTileTypeColor } from "../MapUtils";
import {
  createPathDirectionMarkers,
  resolveCreepAnimationState,
  resolveCreepVisualState,
  resolveTowerProjectileDrawSetup,
  resolveTowerWeaponDrawSetup,
  resolveTdLandmarkSetup,
  resolveTdMapBackgroundContext,
  forEachTileGridCell,
  resolveEntityIsometricOffset,
  getEntityVisualHeight,
} from "./TowerDefenseVisualHelpers";

type TDWorld = World<TowerDefenseComponentRegistry>;

import { isPaperDuskTheme } from "./TowerDefenseVisualHelpers";
import { createSpriteAnimator, drawSpriteCanvas } from "../../shared/sprites";
import { TOWER_DEFENSE_VISUAL_TOKENS } from "../presentation/TowerDefenseVisualTokens";
import { worldToIso, isoToWorld } from "./IsoProjection";

const TOWER_BASIC_SPRITE = createSpriteAnimator("tower_basic_art");
const TOWER_SNIPER_SPRITE = createSpriteAnimator("tower_sniper_art");

function drawTowerBase(
  world: TDWorld,
  ctx: CanvasRenderingContext2D,
  size: number,
  primaryKey: string,
  accentKey: string,
  fallbackPrimary: string,
  fallbackAccent: string,
  towerType: "basic" | "sniper" | "rapid" | "frost" = "basic"
): void {
  const primary = resolveThemeColorWithFallback(world, fallbackPrimary, primaryKey, "primary");
  const accent = resolveThemeColorWithFallback(world, fallbackAccent, accentKey, "accent");
  const baseBg = resolveThemeColorWithFallback(world, "#1a2332", "tower_base_bg");
  const isPaperDusk = isPaperDuskTheme(world);

  const s = size;

  if (isPaperDusk) {
    const shadowColor = resolveThemeColorWithFallback(world, "rgba(0,0,0,0.35)", "pd_shadow");
    const inkColor = resolveThemeColorWithFallback(world, "#14161B", "pd_ink");
    const paperColor = resolveThemeColorWithFallback(world, "#F2E9D8", "pd_paper", "tower_base_bg");
    const shadowOffset = s * 0.08;

    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.arc(shadowOffset, shadowOffset, s * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = paperColor;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.stroke();

    ctx.fillStyle = primary;
    ctx.beginPath();
    if (towerType === "basic" || towerType === "rapid") {
      if (towerType === "basic") {
        ctx.moveTo(0, -s * 0.28);
        ctx.lineTo(s * 0.24, s * 0.18);
        ctx.lineTo(-s * 0.24, s * 0.18);
      } else {
        ctx.rect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const hx = Math.cos(angle) * (s * 0.25);
        const hy = Math.sin(angle) * (s * 0.25);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  ctx.fillStyle = baseBg;
  ctx.fillRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4);
  ctx.fillStyle = primary;
  ctx.beginPath();
  if (towerType === "basic") {
    ctx.moveTo(-s * 0.25, -s * 0.1);
    ctx.lineTo(-s * 0.1, -s * 0.45);
    ctx.lineTo(s * 0.1, -s * 0.45);
    ctx.lineTo(s * 0.25, -s * 0.1);
  } else if (towerType === "rapid") {
    ctx.rect(-s * 0.23, -s * 0.34, s * 0.46, s * 0.38);
  } else if (towerType === "sniper") {
    ctx.moveTo(-s * 0.16, -s * 0.1);
    ctx.lineTo(-s * 0.1, -s * 0.47);
    ctx.lineTo(s * 0.1, -s * 0.47);
    ctx.lineTo(s * 0.16, -s * 0.1);
  } else {
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(s * 0.23, -s * 0.12);
    ctx.lineTo(s * 0.14, s * 0.16);
    ctx.lineTo(0, s * 0.27);
    ctx.lineTo(-s * 0.14, s * 0.16);
    ctx.lineTo(-s * 0.23, -s * 0.12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, 0, s * (towerType === "frost" ? 0.1 : 0.085), 0, Math.PI * 2);
  ctx.fill();

  if (towerType === "rapid") {
    ctx.fillRect(-s * 0.16, -s * 0.04, s * 0.07, s * 0.16);
    ctx.fillRect(s * 0.09, -s * 0.04, s * 0.07, s * 0.16);
  } else if (towerType === "sniper") {
    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(-s * 0.055, -s * 0.3, s * 0.11, s * 0.055);
  } else if (towerType === "frost") {
    ctx.strokeStyle = "#e0f7fa";
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.1);
    ctx.lineTo(s * 0.12, s * 0.1);
    ctx.moveTo(s * 0.12, -s * 0.1);
    ctx.lineTo(-s * 0.12, s * 0.1);
    ctx.stroke();
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4);

  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(-s * 0.32, -s * 0.12, s * 0.64, Math.max(0.8, s * 0.035));
  ctx.fillStyle = baseBg;
  ctx.fillRect(-s * 0.07, s * 0.02, s * 0.14, s * 0.13);
  ctx.fillStyle = accent;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * s * 0.36, s * 0.03, Math.max(0.8, s * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTowerWeaponCanvas(
  ctx: CanvasRenderingContext2D,
  world: TDWorld,
  entity: number,
  size: number,
  type: "basic" | "sniper" | "rapid" | "frost"
): void {
  const {
    angle,
    barrelColor,
    inkColor,
    barrelLength,
    barrelWidth,
    firing,
    pulse
  } = resolveTowerWeaponDrawSetup(world, entity, size, type);

  ctx.save();
  ctx.globalAlpha = 0.18 + pulse * 0.16;
  ctx.strokeStyle = barrelColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, size * (0.23 + pulse * 0.025), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.rotate(angle);
  ctx.lineCap = "round";
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = barrelWidth + 2;
  ctx.beginPath();
  ctx.moveTo(size * 0.08, 0);
  ctx.lineTo(barrelLength, 0);
  ctx.stroke();

  ctx.strokeStyle = barrelColor;
  ctx.lineWidth = barrelWidth;
  ctx.beginPath();
  ctx.moveTo(size * 0.08, 0);
  ctx.lineTo(barrelLength, 0);
  ctx.stroke();

  if (firing) {
    const flashSize = Math.max(4, size * 0.2);
    ctx.shadowBlur = flashSize * 1.8;
    ctx.shadowColor = barrelColor;
    ctx.fillStyle = barrelColor;
    ctx.beginPath();
    ctx.moveTo(barrelLength - 2, 0);
    ctx.lineTo(barrelLength + flashSize, -flashSize * 0.6);
    ctx.lineTo(barrelLength + flashSize * 0.65, 0);
    ctx.lineTo(barrelLength + flashSize, flashSize * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff4db";
    ctx.beginPath();
    ctx.arc(barrelLength, 0, flashSize * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGroundShadowCanvas(
  ctx: CanvasRenderingContext2D,
  size: number,
  heightOffset: number,
  isoEnabled: boolean
): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  if (isoEnabled) {
    ctx.translate(0, heightOffset);
    ctx.ellipse(0, 0, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(size * 0.1, size * 0.1, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawTowerWithOffset(
  ctx: CanvasRenderingContext2D,
  world: TDWorld,
  entity: number,
  drawer: () => void
): void {
  const { isoCfg } = resolveEntityIsometricOffset(world, entity, "tower");

  ctx.save();
  if (isoCfg.enabled) {
    const heightPx = getEntityVisualHeight("tower");
    drawGroundShadowCanvas(ctx, 28, heightPx, true);
    ctx.translate(0, -heightPx);
  }
  drawer();
  ctx.restore();
}

export const drawTowerBasic: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    drawTowerWithOffset(ctx, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      const isPaperDusk = isPaperDuskTheme(world);
      TOWER_BASIC_SPRITE.scale = size / 34;
      const spriteDrawn = !isPaperDusk && drawSpriteCanvas(ctx, TOWER_BASIC_SPRITE, 0, 0);
      if (!spriteDrawn) {
        drawTowerBase(world, ctx, size, "tower_basic", "tower_basic_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.basic.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.basic.accent, "basic");
      }
      drawTowerWeaponCanvas(ctx, world, entity, size, "basic");
    });
  },
};

export const drawTowerSniper: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    drawTowerWithOffset(ctx, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      const isPaperDusk = isPaperDuskTheme(world);
      TOWER_SNIPER_SPRITE.scale = size / 34;
      const spriteDrawn = !isPaperDusk && drawSpriteCanvas(ctx, TOWER_SNIPER_SPRITE, 0, 0);
      if (!spriteDrawn) {
        drawTowerBase(world, ctx, size, "tower_sniper", "tower_sniper_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.sniper.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.sniper.accent, "sniper");
      }
      drawTowerWeaponCanvas(ctx, world, entity, size, "sniper");
    });
  },
};

export const drawTowerRapid: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    drawTowerWithOffset(ctx, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      drawTowerBase(world, ctx, size, "tower_rapid", "tower_rapid_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.rapid.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.rapid.accent, "rapid");
      drawTowerWeaponCanvas(ctx, world, entity, size, "rapid");
    });
  },
};

export const drawTowerFrost: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    drawTowerWithOffset(ctx, world, entity, () => {
      const render = world.getComponent(entity, "Render");
      const size = render?.size ?? 28;
      drawTowerBase(world, ctx, size, "tower_frost", "tower_frost_accent", TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.frost.primary, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.canvas.frost.accent, "frost");
      if (!isPaperDuskTheme(world)) {
        const flakeColor = resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.weapon.frost, "tower_frost_flake");
        ctx.strokeStyle = flakeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.55);
        ctx.lineTo(0, size * 0.15);
        ctx.moveTo(-size * 0.2, -size * 0.35);
        ctx.lineTo(size * 0.2, -size * 0.05);
        ctx.moveTo(size * 0.2, -size * 0.35);
        ctx.lineTo(-size * 0.2, -size * 0.05);
        ctx.stroke();
      }
      drawTowerWeaponCanvas(ctx, world, entity, size, "frost");
    });
  },
};

function drawCreepPath(
  ctx: CanvasRenderingContext2D,
  size: number,
  type: "grunt" | "fast" | "tank" | "boss"
): void {
  const radius = size / 2;
  ctx.beginPath();

  if (type === "fast") {
    ctx.moveTo(-radius * 0.95, -radius * 0.42);
    ctx.lineTo(radius * 0.42, -radius * 0.58);
    ctx.lineTo(radius, 0);
    ctx.lineTo(radius * 0.42, radius * 0.58);
    ctx.lineTo(-radius * 0.95, radius * 0.42);
    ctx.lineTo(-radius * 0.62, 0);
  } else if (type === "tank") {
    ctx.moveTo(-radius * 0.68, -radius * 0.62);
    ctx.lineTo(radius * 0.68, -radius * 0.62);
    ctx.lineTo(radius, -radius * 0.08);
    ctx.lineTo(radius * 0.68, radius * 0.62);
    ctx.lineTo(-radius * 0.68, radius * 0.62);
    ctx.lineTo(-radius, -radius * 0.08);
  } else if (type === "boss") {
    const bumps = 10;
    for (let i = 0; i <= 100; i++) {
      const theta = (i / 100) * Math.PI * 2;
      const r = radius * (1 + 0.14 * Math.sin(theta * bumps));
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  }
  ctx.closePath();
}

function drawCreepDetails(
  ctx: CanvasRenderingContext2D,
  size: number,
  type: "grunt" | "fast" | "tank" | "boss",
  stroke: string
): void {
  const eyeRadius = Math.max(1.2, size * 0.075);
  const eyeOffset = size * (type === "fast" ? 0.2 : 0.16);
  const eyeY = -size * 0.07;

  ctx.fillStyle = "#fff4db";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#18202b";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * eyeOffset + size * 0.018, eyeY, eyeRadius * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, size * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-eyeOffset - eyeRadius * 0.35, eyeY - eyeRadius * 0.8);
  ctx.lineTo(-eyeOffset + eyeRadius * 0.55, eyeY - eyeRadius * 0.9);
  ctx.moveTo(eyeOffset - eyeRadius * 0.55, eyeY - eyeRadius * 0.9);
  ctx.lineTo(eyeOffset + eyeRadius * 0.35, eyeY - eyeRadius * 0.8);
  ctx.moveTo(-size * 0.09, size * 0.12);
  ctx.lineTo(size * 0.09, size * 0.12);
  ctx.stroke();

  if (type === "fast") {
    ctx.fillStyle = stroke;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, -size * 0.12);
    ctx.lineTo(-size * 0.48, -size * 0.27);
    ctx.lineTo(-size * 0.42, -size * 0.02);
    ctx.closePath();
    ctx.moveTo(-size * 0.28, size * 0.1);
    ctx.lineTo(-size * 0.48, size * 0.25);
    ctx.lineTo(-size * 0.42, size * 0.01);
    ctx.closePath();
    ctx.fill();
  }

  if (type === "tank") {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.5, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(-size * 0.27, size * 0.22);
    ctx.lineTo(size * 0.27, size * 0.22);
    ctx.stroke();
    ctx.fillStyle = "#d1d5db";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * size * 0.29, size * 0.22, Math.max(0.8, size * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.22);
    ctx.lineTo(size * 0.22, -size * 0.22);
    ctx.stroke();
  }

  if (type === "boss") {
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.moveTo(-size * 0.16, -size * 0.24);
    ctx.lineTo(0, -size * 0.42);
    ctx.lineTo(size * 0.16, -size * 0.24);
    ctx.lineTo(0, -size * 0.1);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCreepBody(
  ctx: CanvasRenderingContext2D,
  size: number,
  fill: string,
  stroke: string,
  isPaperDusk = false,
  type: "grunt" | "fast" | "tank" | "boss" = "grunt",
  hitFlash = false,
  isoEnabled = false
): void {
  ctx.save();

  const bodyFill = hitFlash ? "#fff4db" : fill;
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.save();
  if (isoEnabled) {
    ctx.translate(0, size * 0.2);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const shadowOffset = size * 0.1;
    ctx.translate(shadowOffset, shadowOffset);
    drawCreepPath(ctx, size, type);
    ctx.fill();
  }
  ctx.restore();

  if (isoEnabled) {
    ctx.translate(0, -getEntityVisualHeight("creep"));
  }

  drawCreepPath(ctx, size, type);
  ctx.fillStyle = bodyFill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, size * (isPaperDusk ? 0.1 : 0.08));
  ctx.lineJoin = "round";
  ctx.stroke();

  drawCreepDetails(ctx, size, type, stroke);
  ctx.restore();
}

function drawCreepHealthBar(
  ctx: CanvasRenderingContext2D,
  world: TDWorld,
  entity: number,
  size: number
): void {
  const health = world.getComponent(entity, "Health");
  if (!health || health.max <= 0) return;

  const ratio = Math.max(0, Math.min(1, health.current / health.max));
  const width = Math.max(20, size * 1.25);
  const height = Math.max(3, size * 0.12);
  const x = -width / 2;
  const y = -size * 0.82 - height;

  ctx.save();
  ctx.fillStyle = "rgba(8,12,20,0.9)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = ratio > 0.5 ? "#65e572" : ratio > 0.25 ? "#ffce4a" : "#ff5252";
  ctx.fillRect(x + 1, y + 1, Math.max(0, (width - 2) * ratio), Math.max(1, height - 2));
  ctx.strokeStyle = isPaperDuskTheme(world) ? "#14161b" : "#f4f7ff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

export const drawCreepGrunt: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 12, "grunt");
    const animation = resolveCreepAnimationState(world, entity, "grunt");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    const { isoCfg } = resolveEntityIsometricOffset(world, entity, "creep");

    ctx.save();
    ctx.translate(animation.offsetX, animation.offsetY);
    ctx.rotate(animation.rotation);
    ctx.scale(animation.scaleX, animation.scaleY);
    drawCreepBody(ctx, size, fill, stroke, isPaperDuskTheme(world), "grunt", hitFlash, isoCfg.enabled);
    drawCreepHealthBar(ctx, world, entity, size);
    ctx.restore();
  },
};

export const drawCreepFast: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 10, "fast");
    const animation = resolveCreepAnimationState(world, entity, "fast");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    const { isoCfg } = resolveEntityIsometricOffset(world, entity, "creep");

    ctx.save();
    ctx.translate(animation.offsetX, animation.offsetY);
    ctx.rotate(animation.rotation);
    ctx.scale(animation.scaleX, animation.scaleY);
    drawCreepBody(ctx, size, fill, stroke, isPaperDuskTheme(world), "fast", hitFlash, isoCfg.enabled);
    drawCreepHealthBar(ctx, world, entity, size);
    ctx.restore();
  },
};

export const drawCreepTank: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 18, "tank");
    const isPaperDusk = isPaperDuskTheme(world);
    const animation = resolveCreepAnimationState(world, entity, "tank");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    const { isoCfg } = resolveEntityIsometricOffset(world, entity, "creep");

    ctx.save();
    ctx.translate(animation.offsetX, animation.offsetY);
    ctx.rotate(animation.rotation);
    ctx.scale(animation.scaleX, animation.scaleY);
    drawCreepBody(ctx, size, fill, stroke, isPaperDusk, "tank", hitFlash, isoCfg.enabled);
    if (!isPaperDusk) {
      ctx.strokeStyle = resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.tank.plate, "creep_tank_plate");
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    drawCreepHealthBar(ctx, world, entity, size);
    ctx.restore();
  },
};

export const drawCreepBoss: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke, innerStroke } = resolveCreepVisualState(world, entity, 28, "boss");
    const isPaperDusk = isPaperDuskTheme(world);
    const animation = resolveCreepAnimationState(world, entity, "boss");
    const hitFlash = (world.getComponent(entity, "Render")?.hitFlashFrames ?? 0) > 0;
    const { isoCfg } = resolveEntityIsometricOffset(world, entity, "creep");

    ctx.save();
    ctx.translate(animation.offsetX, animation.offsetY);
    ctx.rotate(animation.rotation);
    ctx.scale(animation.scaleX, animation.scaleY);
    if (!isPaperDusk) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawCreepBody(ctx, size, fill, innerStroke ?? stroke, isPaperDusk, "boss", hitFlash, isoCfg.enabled);
    if (!isPaperDusk) {
      ctx.fillStyle = resolveThemeColorWithFallback(world, "#ffd54f", "creep_boss_crown");
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size * 0.35);
      ctx.lineTo(-size * 0.15, -size * 0.6);
      ctx.lineTo(0, -size * 0.4);
      ctx.lineTo(size * 0.15, -size * 0.6);
      ctx.lineTo(size * 0.3, -size * 0.35);
      ctx.closePath();
      ctx.fill();
    }
    drawCreepHealthBar(ctx, world, entity, size);
    ctx.restore();
  },
};

export const drawTowerProjectile: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, color } = resolveTowerProjectileDrawSetup(world, entity);

    const velocity = world.getComponent(entity, "Velocity");
    if (velocity) {
      const speed = Math.hypot(velocity.vx, velocity.vy);
      if (speed > 1) {
        const dirX = velocity.vx / speed;
        const dirY = velocity.vy / speed;
        const trailLength = Math.min(18, Math.max(7, size * 2.5));
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.lineWidth = Math.max(2, size * 0.75);
        ctx.beginPath();
        ctx.moveTo(-dirX * trailLength, -dirY * trailLength);
        ctx.lineTo(-dirX * size * 0.25, -dirY * size * 0.25);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,244,219,0.9)";
        ctx.shadowBlur = 0;
        ctx.lineWidth = Math.max(1, size * 0.25);
        ctx.beginPath();
        ctx.moveTo(-dirX * trailLength * 0.72, -dirY * trailLength * 0.72);
        ctx.lineTo(-dirX * size * 0.4, -dirY * size * 0.4);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

function drawTdAmbientStarCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  row: number,
  col: number,
  elapsedSeconds: number,
  isPaperDusk: boolean
): void {
  const seed = (row * 73 + col * 37 + 19) >>> 0;
  if (seed % 3 !== 0) return;
  const starX = x + 5 + (seed % Math.max(1, Math.floor(width - 10)));
  const starY = y + 5 + ((seed * 13) % Math.max(1, Math.floor(height - 10)));
  const pulse = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(elapsedSeconds * 2.6 + seed * 0.17));
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = isPaperDusk ? "rgba(255,238,201,0.62)" : "rgba(117,222,255,0.8)";
  ctx.fillRect(starX, starY, seed % 11 === 0 ? 2 : 1, 1);
  if (seed % 13 === 0) {
    ctx.fillRect(starX, starY - 2, 1, 5);
    ctx.fillRect(starX - 2, starY, 5, 1);
  }
  ctx.restore();
}

function drawTowerDefenseVfxCanvas(
  ctx: CanvasRenderingContext2D,
  world: TDWorld,
  layout: GridLayout,
  tileGrid: TileGrid,
  isPaperDusk: boolean
): void {
  const state = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects");
  const gameState = world.getSingleton("GameState") as GameStateComponent | undefined;
  const centerX = layout.offsetX + (tileGrid.cols * layout.stepX) / 2;
  const bannerY = Math.max(8, layout.offsetY - 10);

  if (state) {
    for (const effect of state.effects) {
      const progress = Math.max(0, Math.min(1, effect.ageSeconds / effect.durationSeconds));
      const fade = progress > 0.68 ? (1 - progress) / 0.32 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));

      if (effect.kind === "enemy-death") {
        const count = effect.creepType === "boss" ? 16 : effect.creepType === "tank" ? 11 : 8;
        const radius = 4 + progress * (effect.creepType === "boss" ? 29 : 20);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = Math.max(1, 2.5 * (1 - progress));
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 4 + progress * 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = effect.color;
        for (let index = 0; index < count; index++) {
          const angle = (index / count) * Math.PI * 2 + effect.id * 0.37;
          const distance = radius * (0.65 + (index % 3) * 0.18);
          const sparkX = effect.x + Math.cos(angle) * distance;
          const sparkY = effect.y + Math.sin(angle) * distance;
          ctx.save();
          ctx.translate(sparkX, sparkY);
          ctx.rotate(angle);
          ctx.fillRect(-1.2, -2.1, 2.4, 4.2);
          ctx.restore();
        }
        ctx.fillStyle = "#fff4db";
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(1, 3 * (1 - progress)), 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.kind === "gold-reward") {
        const rise = progress * 28;
        const coinX = effect.x;
        const coinY = effect.y - rise;
        ctx.fillStyle = "#ffd54f";
        ctx.strokeStyle = "#815f18";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(coinX, coinY, 4.2 * (1 - progress * 0.22), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#fff1a8";
        ctx.beginPath();
        ctx.moveTo(coinX, coinY - 2);
        ctx.lineTo(coinX, coinY + 2);
        ctx.stroke();
        ctx.fillStyle = "#ffe082";
        ctx.strokeStyle = isPaperDusk ? "#2a2214" : "#111827";
        ctx.lineWidth = 2.5;
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";
        ctx.strokeText(`+${effect.amount ?? 0}`, coinX + 7, coinY - 2);
        ctx.fillText(`+${effect.amount ?? 0}`, coinX + 7, coinY - 2);
      } else if (effect.kind === "base-hit") {
        for (let ring = 0; ring < 2; ring++) {
          const ringProgress = Math.max(0, Math.min(1, progress - ring * 0.16));
          ctx.globalAlpha = Math.max(0, (1 - ringProgress) * 0.8);
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 3 - ringProgress * 2;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, 6 + ringProgress * (34 + ring * 9), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (effect.kind === "phase-banner") {
        const width = Math.min(290, tileGrid.cols * layout.stepX - 20);
        const height = 28;
        const left = centerX - width / 2;
        const top = bannerY - height / 2;
        ctx.globalAlpha = Math.max(0, Math.min(1, fade));
        ctx.fillStyle = isPaperDusk ? "rgba(242,233,216,0.95)" : "rgba(5,12,26,0.9)";
        ctx.fillRect(left, top, width, height);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(left + 1, top + 1, width - 2, height - 2);
        ctx.fillStyle = effect.color;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(effect.text ?? "WAVE", centerX, bannerY);
      }
      ctx.restore();
    }
  }

  if (gameState?.phase === "victory" || gameState?.phase === "game_over") {
    const color = gameState.phase === "victory" ? "#ffd54f" : "#ff5252";
    const label = gameState.phase === "victory" ? `VICTORY  ·  SCORE ${gameState.score}` : `GAME OVER  ·  SCORE ${gameState.score}`;
    const width = Math.min(310, tileGrid.cols * layout.stepX - 16);
    const left = centerX - width / 2;
    const top = bannerY - 16;
    ctx.save();
    ctx.fillStyle = isPaperDusk ? "rgba(242,233,216,0.97)" : "rgba(5,12,26,0.94)";
    ctx.fillRect(left, top, width, 32);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 1, top + 1, width - 2, 30);
    ctx.fillStyle = color;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, centerX, bannerY);
    ctx.restore();
  }
}

function drawTdLandmarkCanvas(
  ctx: CanvasRenderingContext2D,
  world: TDWorld,
  x: number,
  y: number,
  size: number,
  kind: "spawn" | "base",
  isPaperDusk: boolean
): void {
  const { cx, cy, fill, outline, pulse } = resolveTdLandmarkSetup(world, x, y, size, kind, isPaperDusk);

  ctx.save();
  ctx.globalAlpha = isPaperDusk ? 0.2 + pulse * 0.18 : 0.25 + pulse * 0.3;
  ctx.strokeStyle = kind === "base" ? "#62f6bd" : fill;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, size * ((kind === "base" ? 0.32 : 0.24) + pulse * 0.035), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = outline;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, size * (kind === "spawn" ? 0.2 : 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (kind === "spawn") {
    ctx.fillStyle = "#fff4db";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.075, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#fff4db";
    ctx.lineWidth = Math.max(1.5, size * 0.055);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff4db";
    ctx.fillRect(cx - size * 0.045, cy - size * 0.045, size * 0.09, size * 0.09);
  }
  ctx.restore();
}

function drawPathDirectionMarkersCanvas(
  ctx: CanvasRenderingContext2D,
  world: TDWorld,
  isPaperDusk: boolean,
  isoCfg?: import("./IsoProjection").IsoConfig
): void {
  const waypoints = world.getResource<WaypointList>("WaypointList");
  if (!waypoints) return;

  const color = isPaperDusk
    ? resolveThemeColorWithFallback(world, "#14161B", "pd_pathEdge", "pd_ink")
    : "rgba(20,30,44,0.72)";

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const marker of createPathDirectionMarkers(waypoints.points, isoCfg)) {
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.rotate(marker.angle);
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(2, 0);
    ctx.lineTo(-5, 6);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawRhombusTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  fillColor: string,
  strokeColor?: string,
  dashed = false
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - halfHeight);
  ctx.lineTo(cx + halfWidth, cy);
  ctx.lineTo(cx, cy + halfHeight);
  ctx.lineTo(cx - halfWidth, cy);
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    if (dashed) {
      ctx.setLineDash([3, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export const drawTdMapBackground: EffectDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world: TDWorld) {
    const bgCtx = resolveTdMapBackgroundContext(world);
    if (!bgCtx) return;
    const { layout, tileGrid, isoCfg } = bgCtx;

    const isPaperDusk = isPaperDuskTheme(world);
    const vfxElapsed = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects")?.elapsedSeconds ?? 0;

    forEachTileGridCell(bgCtx, (tile, x, y, row, col) => {
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

        drawRhombusTile(ctx, x, y, isoCfg.tileWidthHalf, isoCfg.tileHeightHalf, fillColor, strokeColor, tile === "buildable");
      } else {
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

          ctx.fillStyle = fillColor;
          ctx.fillRect(x, y, layout.stepX - 1, layout.stepY - 1);

          if (tile === "path") {
            ctx.strokeStyle = pdPathEdge;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, layout.stepX - 1, layout.stepY - 1);
          } else if (tile === "buildable") {
            ctx.strokeStyle = pdBuildableEdge;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(x + 1, y + 1, layout.stepX - 3, layout.stepY - 3);
            ctx.setLineDash([]);
          }
        } else {
          ctx.fillStyle = getTileTypeColor(tile);
          ctx.fillRect(x, y, layout.stepX - 1, layout.stepY - 1);
        }
      }

      if (tile === "blocked") {
        drawTdAmbientStarCanvas(ctx, x, y, isoCfg.enabled ? isoCfg.tileWidthHalf * 2 : layout.stepX, isoCfg.enabled ? isoCfg.tileHeightHalf * 2 : layout.stepY, row, col, vfxElapsed, isPaperDusk);
      }

      if (tile === "spawn" || tile === "base") {
        drawTdLandmarkCanvas(ctx, world, x, y, isoCfg.enabled ? isoCfg.tileWidthHalf : layout.stepX, tile, isPaperDusk);
      }
    });

    drawPathDirectionMarkersCanvas(ctx, world, isPaperDusk, isoCfg);

    const playerEntity = world.query("Player")[0];
    const catalog = world.getResource<TowerCatalog>("TowerCatalog");
    const gs = world.getSingleton("GameState") as GameStateComponent | undefined;

    if (playerEntity !== undefined) {
      const player = world.getComponent(playerEntity, "Player");
      const input = world.getComponent(playerEntity, "Input");
      const towerType = player?.selectedTowerType ?? gs?.selectedTowerType ?? "basic";
      const def = catalog?.[towerType];

      if (input && def) {
        let col: number;
        let row: number;
        if (isoCfg.enabled) {
          const worldP = isoToWorld(isoCfg, input.cursorX, input.cursorY);
          col = Math.floor((worldP.x - layout.offsetX) / layout.stepX);
          row = Math.floor((worldP.y - layout.offsetY) / layout.stepY);
        } else {
          col = Math.floor((input.cursorX - layout.offsetX) / layout.stepX);
          row = Math.floor((input.cursorY - layout.offsetY) / layout.stepY);
        }

        if (row >= 0 && row < tileGrid.rows && col >= 0 && col < tileGrid.cols) {
          const cellCenterX = layout.offsetX + (col + 0.5) * layout.stepX;
          const cellCenterY = layout.offsetY + (row + 0.5) * layout.stepY;
          const isoCenter = isoCfg.enabled ? worldToIso(isoCfg, cellCenterX, cellCenterY) : { x: cellCenterX, y: cellCenterY };

          const buildable = tileGrid.tiles[row]?.[col] === "buildable";
          const canAfford = (gs?.gold ?? 0) >= def.cost;
          const occupied = world.query("Tower").some((e) => {
            const tw = world.getComponent(e, "Tower");
            return tw && tw.col === col && tw.row === row;
          });
          const canBuild = buildable && canAfford && !occupied;

          ctx.save();
          ctx.beginPath();
          if (isoCfg.enabled) {
            const rx = def.range;
            const ry = rx * (isoCfg.tileHeightHalf / isoCfg.tileWidthHalf);
            ctx.ellipse(isoCenter.x, isoCenter.y, rx, ry, 0, 0, Math.PI * 2);
          } else {
            ctx.arc(isoCenter.x, isoCenter.y, def.range, 0, Math.PI * 2);
          }
          ctx.strokeStyle = canBuild ? "rgba(79, 195, 247, 0.45)" : "rgba(229, 57, 53, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = canBuild ? "rgba(79, 195, 247, 0.08)" : "rgba(229, 57, 53, 0.06)";
          ctx.fill();

          if (isoCfg.enabled) {
            drawRhombusTile(
              ctx,
              isoCenter.x,
              isoCenter.y,
              isoCfg.tileWidthHalf - 1,
              isoCfg.tileHeightHalf - 1,
              canBuild ? "rgba(102, 187, 106, 0.2)" : "rgba(229, 57, 53, 0.2)",
              canBuild ? "rgba(102, 187, 106, 0.9)" : "rgba(229, 57, 53, 0.7)"
            );
          } else {
            ctx.strokeStyle = canBuild ? "rgba(102, 187, 106, 0.9)" : "rgba(229, 57, 53, 0.7)";
            ctx.lineWidth = 2;
            const gx = layout.offsetX + col * layout.stepX;
            const gy = layout.offsetY + row * layout.stepY;
            ctx.strokeRect(gx + 1, gy + 1, layout.stepX - 3, layout.stepY - 3);
          }

          ctx.save();
          const ghostY = isoCfg.enabled ? isoCenter.y - getEntityVisualHeight("tower") : isoCenter.y;
          ctx.translate(isoCenter.x, ghostY);
          ctx.globalAlpha = 0.45;
          const ghostColor =
            towerType === "sniper"
              ? resolveThemeColorWithFallback(world, "#ab47bc", "tower_sniper")
              : towerType === "rapid"
                ? resolveThemeColorWithFallback(world, "#66bb6a", "tower_rapid")
                : towerType === "frost"
                  ? resolveThemeColorWithFallback(world, "#4dd0e1", "tower_frost")
                  : resolveThemeColorWithFallback(world, "#4fc3f7", "tower_basic");
          drawTowerBase(world, ctx, layout.stepX * 0.65, `tower_${towerType}`, `tower_${towerType}_accent`, ghostColor, ghostColor);
          ctx.restore();

          if (!canAfford && buildable) {
            ctx.fillStyle = "#ef5350";
            ctx.font = "11px monospace";
            ctx.textAlign = "center";
            ctx.fillText("NO GOLD", isoCenter.x, isoCenter.y - (isoCfg.enabled ? isoCfg.tileHeightHalf + 10 : 20));
          }
          ctx.restore();
        }
      }
    }

    if (world.getResource<boolean>("ShowTowerDefenseDebugHud") === true) {
      const threat = world.getResource<ThreatInfo>("ThreatInfo");
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(4, 4, 200, 120);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px monospace";
      ctx.textAlign = "left";
      if (gs) {
        ctx.fillText(`Gold  ${gs.gold}`, 12, 24);
        ctx.fillText(`Lives ${gs.lives}`, 12, 42);
        ctx.fillText(`Wave  ${gs.wave + 1}`, 12, 60);
        ctx.fillText(`Phase ${gs.phase}`, 12, 78);
        ctx.fillStyle = "#4fc3f7";
        ctx.fillText(`Tower ${gs.selectedTowerType ?? "basic"}`, 12, 96);
      }
      if (threat) {
        ctx.fillStyle = "#ffab91";
        ctx.fillText(`Threat ${threat.alive} alive / ${threat.remainingInWave} wave`, 12, 114);
      }

      if (gs && (gs.phase === "build" || gs.phase === "intermission")) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(layout.offsetX, 4, 220, 28);
        ctx.fillStyle = "#ffee58";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "left";
        const hint =
          gs.phase === "intermission"
            ? `Intermission ${Math.ceil(gs.intermissionRemaining)}s`
            : "START WAVE (Space / button)";
        ctx.fillText(hint, layout.offsetX + 8, 24);
      }
    }

    drawTowerDefenseVfxCanvas(ctx, world, layout, tileGrid, isPaperDusk);
  },
};
