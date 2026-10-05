import type { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  GameStateComponent,
  TileGrid,
  ThreatInfo,
  TowerCatalog,
} from "../types/TowerDefenseTypes";
import type { GridLayout } from "../../shared/grid/GridTypes";

type TDWorld = World<TowerDefenseComponentRegistry>;

function drawTowerBase(
  ctx: CanvasRenderingContext2D,
  size: number,
  primary: string,
  accent: string
): void {
  const s = size;
  ctx.fillStyle = "#1a2332";
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
    drawTowerBase(ctx, render?.size ?? 28, "#4fc3f7", "#81d4fa");
  },
};

export const drawTowerSniper: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawTowerBase(ctx, size, "#ab47bc", "#ce93d8");
    ctx.fillStyle = "#e1bee7";
    ctx.fillRect(-2, -size * 0.7, 4, size * 0.35);
  },
};

export const drawTowerRapid: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawTowerBase(ctx, size, "#66bb6a", "#a5d6a7");
    ctx.fillStyle = "#c8e6c9";
    ctx.fillRect(-size * 0.18, -size * 0.5, 3, size * 0.25);
    ctx.fillRect(size * 0.08, -size * 0.5, 3, size * 0.25);
  },
};

export const drawTowerFrost: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    drawTowerBase(ctx, size, "#4dd0e1", "#b2ebf2");
    ctx.strokeStyle = "#e0f7fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(0, size * 0.15);
    ctx.moveTo(-size * 0.2, -size * 0.35);
    ctx.lineTo(size * 0.2, -size * 0.05);
    ctx.moveTo(size * 0.2, -size * 0.35);
    ctx.lineTo(-size * 0.2, -size * 0.05);
    ctx.stroke();
  },
};

function drawCreepBody(
  ctx: CanvasRenderingContext2D,
  size: number,
  fill: string,
  stroke: string
): void {
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
    const render = world.getComponent(entity, "Render");
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    drawCreepBody(ctx, render?.size ?? 12, slowed ? "#80deea" : "#ff7043", slowed ? "#e0f7fa" : "#ffab91");
  },
};

export const drawCreepFast: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    drawCreepBody(ctx, render?.size ?? 10, slowed ? "#80deea" : "#29b6f6", slowed ? "#e0f7fa" : "#81d4fa");
  },
};

export const drawCreepTank: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 18;
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    drawCreepBody(ctx, size, slowed ? "#80deea" : "#8d6e63", slowed ? "#e0f7fa" : "#bcaaa4");
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.55, 0.2, Math.PI - 0.2);
    ctx.stroke();
  },
};

export const drawCreepBoss: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const size = render?.size ?? 28;
    const creep = world.getComponent(entity, "Creep");
    const slowed = (creep?.slowRemainingMs ?? 0) > 0;
    ctx.strokeStyle = slowed ? "#80deea" : "#e53935";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    drawCreepBody(ctx, size, slowed ? "#4dd0e1" : "#c62828", slowed ? "#e0f7fa" : "#ef9a9a");
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.35);
    ctx.lineTo(-size * 0.15, -size * 0.6);
    ctx.lineTo(0, -size * 0.4);
    ctx.lineTo(size * 0.15, -size * 0.6);
    ctx.lineTo(size * 0.3, -size * 0.35);
    ctx.closePath();
    ctx.fill();
  },
};

export const drawTowerProjectile: ShapeDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const proj = world.getComponent(entity, "TowerProjectile");
    const size = render?.size ?? 4;
    const frost = !!(proj?.slowFactor && proj.slowFactor < 1);
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = frost ? "#4dd0e1" : "#ffee58";
    ctx.fillStyle = frost ? "#4dd0e1" : "#ffee58";
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

export const drawTdMapBackground: EffectDrawer<CanvasRenderingContext2D, TowerDefenseComponentRegistry> = {
  draw(ctx, world: TDWorld) {
    const layout = world.getResource<GridLayout>("GridLayout");
    const tileGrid = world.getResource<TileGrid>("TileGrid");
    if (!layout || !tileGrid) return;

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
        else if (tile === "blocked") color = "#0a0a12";

        ctx.fillStyle = color;
        ctx.fillRect(x, y, layout.stepX - 1, layout.stepY - 1);

        if (tile === "spawn") {
          ctx.fillStyle = "#e53935";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("S", x + layout.stepX / 2, y + layout.stepY / 2 + 3);
        }
        if (tile === "base") {
          ctx.fillStyle = "#43a047";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("BASE", x + layout.stepX / 2, y + layout.stepY / 2 + 3);
        }
      }
    }

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
              ? "#ab47bc"
              : towerType === "rapid"
                ? "#66bb6a"
                : towerType === "frost"
                  ? "#4dd0e1"
                  : "#4fc3f7";
          drawTowerBase(ctx, layout.stepX * 0.65, ghostColor, ghostColor);
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
