import { ShapeDrawer, EffectDrawer, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  GameStateComponent,
  TileGrid,
  ThreatInfo,
  TowerCatalog,
} from "../types/TowerDefenseTypes";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { getTileTypeColor } from "../MapUtils";
import {
  resolveCreepVisualState,
  resolveTowerProjectileDrawSetup,
  resolveTdMapBackgroundContext,
  forEachTileGridCell,
} from "./TowerDefenseVisualHelpers";

type TDWorld = World<TowerDefenseComponentRegistry>;

import { isPaperDuskTheme } from "./TowerDefenseVisualHelpers";

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

    // Hard Shadow
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.arc(shadowOffset, shadowOffset, s * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Paper Base
    ctx.fillStyle = paperColor;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.stroke();

    // Cap Shape by Tower Type
    ctx.fillStyle = primary;
    ctx.beginPath();
    if (towerType === "basic" || towerType === "rapid") {
      // Triangle (Basic) / Square (Rapid)
      if (towerType === "basic") {
        ctx.moveTo(0, -s * 0.28);
        ctx.lineTo(s * 0.24, s * 0.18);
        ctx.lineTo(-s * 0.24, s * 0.18);
      } else {
        ctx.rect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4);
      }
    } else {
      // Hexagon (Sniper / Frost)
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
  ctx.moveTo(-s * 0.25, -s * 0.1);
  ctx.lineTo(-s * 0.1, -s * 0.45);
  ctx.lineTo(s * 0.1, -s * 0.45);
  ctx.lineTo(s * 0.25, -s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4);
}

export const drawTowerBasic: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    drawTowerBase(world, ctx, render?.size ?? 28, "tower_basic", "tower_basic_accent", "#4fc3f7", "#81d4fa", "basic");
  },
};

export const drawTowerSniper: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawTowerBase(world, ctx, size, "tower_sniper", "tower_sniper_accent", "#ab47bc", "#ce93d8", "sniper");
    if (!isPaperDuskTheme(world)) {
      const barrelColor = resolveThemeColorWithFallback(world, "#e1bee7", "tower_sniper_barrel");
      ctx.fillStyle = barrelColor;
      ctx.fillRect(-2, -size * 0.7, 4, size * 0.35);
    }
  },
};

export const drawTowerRapid: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawTowerBase(world, ctx, size, "tower_rapid", "tower_rapid_accent", "#66bb6a", "#a5d6a7", "rapid");
    if (!isPaperDuskTheme(world)) {
      const barrelColor = resolveThemeColorWithFallback(world, "#c8e6c9", "tower_rapid_barrel");
      ctx.fillStyle = barrelColor;
      ctx.fillRect(-size * 0.18, -size * 0.5, 3, size * 0.25);
      ctx.fillRect(size * 0.08, -size * 0.5, 3, size * 0.25);
    }
  },
};

export const drawTowerFrost: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawTowerBase(world, ctx, size, "tower_frost", "tower_frost_accent", "#4dd0e1", "#b2ebf2", "frost");
    if (!isPaperDuskTheme(world)) {
      const flakeColor = resolveThemeColorWithFallback(world, "#e0f7fa", "tower_frost_flake");
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
    ctx.ellipse(0, 0, radius * 1.3, radius * 0.8, 0, 0, Math.PI * 2);
  } else if (type === "boss") {
    const bumps = 10;
    for (let i = 0; i <= 100; i++) {
      const theta = (i / 100) * Math.PI * 2;
      const r = radius * (1 + 0.07 * Math.sin(theta * bumps));
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

function drawCreepBody(
  ctx: CanvasRenderingContext2D,
  size: number,
  fill: string,
  stroke: string,
  isPaperDusk = false,
  type: "grunt" | "fast" | "tank" | "boss" = "grunt"
): void {
  if (isPaperDusk) {
    const shadowOffset = size * 0.1;
    const shadowColor = "rgba(0,0,0,0.35)";

    ctx.save();

    // Shadow
    ctx.fillStyle = shadowColor;
    ctx.save();
    ctx.translate(shadowOffset, shadowOffset);
    drawCreepPath(ctx, size, type);
    ctx.fill();
    ctx.restore();

    // Fill + Ink stroke
    drawCreepPath(ctx, size, type);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.restore();
    return;
  }

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(size * 0.15, -size * 0.1, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(size * 0.18, -size * 0.1, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

export const drawCreepGrunt: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 12, "grunt");
    drawCreepBody(ctx, size, fill, stroke, isPaperDuskTheme(world), "grunt");
  },
};

export const drawCreepFast: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 10, "fast");
    drawCreepBody(ctx, size, fill, stroke, isPaperDuskTheme(world), "fast");
  },
};

export const drawCreepTank: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke } = resolveCreepVisualState(world, entity, 18, "tank");
    const isPaperDusk = isPaperDuskTheme(world);
    drawCreepBody(ctx, size, fill, stroke, isPaperDusk, "tank");
    if (!isPaperDusk) {
      ctx.strokeStyle = resolveThemeColorWithFallback(world, "#5d4037", "creep_tank_plate");
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  },
};

export const drawCreepBoss: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, fill, stroke, innerStroke } = resolveCreepVisualState(world, entity, 28, "boss");
    const isPaperDusk = isPaperDuskTheme(world);

    if (!isPaperDusk) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawCreepBody(ctx, size, fill, innerStroke ?? stroke, isPaperDusk, "boss");
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
  },
};

export const drawTowerProjectile: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const { size, color } = resolveTowerProjectileDrawSetup(world, entity);

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

export const drawTdMapBackground: EffectDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world: TDWorld) {
    const bgCtx = resolveTdMapBackgroundContext(world);
    if (!bgCtx) return;
    const { layout, tileGrid } = bgCtx;

    const isPaperDusk = isPaperDuskTheme(world);

    forEachTileGridCell(bgCtx, (tile, x, y) => {
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

      if (tile === "spawn") {
        ctx.fillStyle = resolveThemeColorWithFallback(world, "#e53935", "map_spawn", "accent");
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("S", x + layout.stepX / 2, y + layout.stepY / 2 + 3);
      }
      if (tile === "base") {
        ctx.fillStyle = resolveThemeColorWithFallback(world, "#43a047", "map_base", "primary");
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("BASE", x + layout.stepX / 2, y + layout.stepY / 2 + 3);
      }
    });

    const playerEntity = world.query("Player")[0];
    const catalog = world.getResource<TowerCatalog>("TowerCatalog");
    const gs = world.getSingleton("GameState") as GameStateComponent | undefined;

    if (playerEntity !== undefined) {
      const player = world.getComponent(playerEntity, "Player");
      const input = world.getComponent(playerEntity, "Input");
      const towerType = player?.selectedTowerType ?? gs?.selectedTowerType ?? "basic";
      const def = catalog?.[towerType];

      if (input && def) {
        const col = Math.floor((input.cursorX - layout.offsetX) / layout.stepX);
        const row = Math.floor((input.cursorY - layout.offsetY) / layout.stepY);
        if (row >= 0 && row < tileGrid.rows && col >= 0 && col < tileGrid.cols) {
          const gx = layout.offsetX + col * layout.stepX;
          const gy = layout.offsetY + row * layout.stepY;
          const cx = gx + layout.stepX / 2;
          const cy = gy + layout.stepY / 2;
          const buildable = tileGrid.tiles[row]?.[col] === "buildable";
          const canAfford = (gs?.gold ?? 0) >= def.cost;
          const occupied = world.query("Tower").some((e) => {
            const tw = world.getComponent(e, "Tower");
            return tw && tw.col === col && tw.row === row;
          });
          const canBuild = buildable && canAfford && !occupied;

          ctx.beginPath();
          ctx.arc(cx, cy, def.range, 0, Math.PI * 2);
          ctx.strokeStyle = canBuild ? "rgba(79, 195, 247, 0.45)" : "rgba(229, 57, 53, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = canBuild ? "rgba(79, 195, 247, 0.08)" : "rgba(229, 57, 53, 0.06)";
          ctx.fill();

          ctx.strokeStyle = canBuild ? "rgba(102, 187, 106, 0.9)" : "rgba(229, 57, 53, 0.7)";
          ctx.lineWidth = 2;
          ctx.strokeRect(gx + 1, gy + 1, layout.stepX - 3, layout.stepY - 3);

          ctx.save();
          ctx.translate(cx, cy);
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
            ctx.fillText("NO GOLD", cx, gy - 4);
          }
        }
      }
    }

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
  },
};
