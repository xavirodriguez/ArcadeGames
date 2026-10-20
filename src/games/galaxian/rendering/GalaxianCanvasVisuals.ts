import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEnemyComponent, VisualPoseComponent, DiveTrailComponent, UnfoldShardComponent, ScorePopupComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";

export function drawPaperSkyCanvas(ctx: CanvasRenderingContext2D, world: World<GalaxianComponentRegistry>): void {
  const config = world.getResource<GalaxianConfig>("GameConfig");
  const palette = config?.visual.colorblindMode
    ? config.visual.paletteColorblind
    : config?.visual.palette;

  if (!palette) return;

  const w = config?.worldWidth ?? 480;
  const h = config?.worldHeight ?? 640;
  const time = (world.tick * (1 / 60));

  // 1. Base night sky
  ctx.fillStyle = palette.paperNight;
  ctx.fillRect(0, 0, w, h);

  // 2. Stars scrolling with parallax
  ctx.fillStyle = palette.star;
  const starCount = config?.visual.quality === "low" ? 25 : 55;
  for (let i = 0; i < starCount; i++) {
    const speed = 15 + (i % 3) * 20;
    const sx = (i * 73 + (i % 5) * 17) % w;
    const sy = ((i * 41 + time * speed) % h);

    if (i % 4 === 0) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - 3);
      ctx.lineTo(sx + 1.5, sy);
      ctx.lineTo(sx, sy + 3);
      ctx.lineTo(sx - 1.5, sy);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
  }

  // 3. Cut paper strata layers
  const isLowQuality = config?.visual.quality === "low";
  const layers = isLowQuality
    ? [{ color: palette.strataMid, edge: palette.strataEdge, speed: 8, scaleY: 0.35, offsetY: 120 }]
    : [
        { color: palette.strataFar, edge: palette.strataEdge, speed: 5, scaleY: 0.25, offsetY: 80 },
        { color: palette.strataMid, edge: palette.strataEdge, speed: 10, scaleY: 0.35, offsetY: 220 },
        { color: palette.strataNear, edge: palette.strataEdge, speed: 18, scaleY: 0.45, offsetY: 400 },
      ];

  for (const layer of layers) {
    const scrollY = (time * layer.speed) % (h * 1.5);
    const cy = (layer.offsetY + scrollY) % (h * 1.5) - h * 0.25;

    ctx.save();

    // Shadow path (hard offset +4, +6)
    ctx.fillStyle = palette.strataShadow;
    ctx.beginPath();
    ctx.ellipse(w / 2 + 4, cy + 6, w * 0.7, h * layer.scaleY, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Main paper layer
    ctx.fillStyle = layer.color;
    ctx.strokeStyle = layer.edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(w / 2, cy, w * 0.7, h * layer.scaleY, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export const drawPaperSkyEffect: EffectDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world) {
    drawPaperSkyCanvas(ctx, world);
  },
};

export const drawGalaxianPlayerCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const pose = world.getComponent(entity, "VisualPose") as VisualPoseComponent | undefined;
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;

    if (!render || !palette) return;

    ctx.save();
    if (pose) {
      ctx.rotate(pose.rotation);
    }

    // Left Wing
    ctx.fillStyle = palette.player;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(-14, 10);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Right Wing
    ctx.fillStyle = palette.playerShade;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(14, 10);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Tail / Underfold
    ctx.fillStyle = palette.playerFold;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-5, 13);
    ctx.lineTo(0, 10);
    ctx.lineTo(5, 13);
    ctx.closePath();
    ctx.fill();

    // Center crease line
    ctx.strokeStyle = palette.playerFold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, 4);
    ctx.stroke();

    // Engine glow
    ctx.fillStyle = palette.playerAccent;
    ctx.beginPath();
    ctx.arc(0, 12, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

export function drawOrigamiBirdCanvas(
  ctx: CanvasRenderingContext2D,
  enemyType: "flagship" | "escort" | "emissary" | "drone",
  palette: any,
  scale: number = 1.0
): void {
  let light = palette.droneLight;
  let mid = palette.droneMid;
  let dark = palette.droneDark;

  if (enemyType === "emissary") {
    light = palette.emissaryLight;
    mid = palette.emissaryMid;
    dark = palette.emissaryDark;
  } else if (enemyType === "escort") {
    light = palette.escortLight;
    mid = palette.escortMid;
    dark = palette.escortDark;
  } else if (enemyType === "flagship") {
    light = palette.flagshipLight;
    mid = palette.flagshipMid;
    dark = palette.flagshipDark;
  }

  ctx.save();
  ctx.scale(scale, scale);

  // Left Body
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 10);
  ctx.lineTo(-4.5, 0);
  ctx.closePath();
  ctx.fill();

  // Right Body
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(4.5, 0);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();

  // Left Wing Top
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(-15, -10);
  ctx.lineTo(-13, 2);
  ctx.closePath();
  ctx.fill();

  // Left Wing Bottom
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(-13, 2);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  ctx.fill();

  // Right Wing Top
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.lineTo(15, -10);
  ctx.lineTo(13, 2);
  ctx.closePath();
  ctx.fill();

  // Right Wing Bottom
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.lineTo(13, 2);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();

  if (enemyType === "emissary") {
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(-19, -4);
    ctx.lineTo(-13, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(15, -10);
    ctx.lineTo(19, -4);
    ctx.lineTo(13, 2);
    ctx.closePath();
    ctx.fill();
  } else if (enemyType === "escort") {
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(-2, 6);
    ctx.lineTo(-6, 12);
    ctx.lineTo(-1, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(2, 6);
    ctx.lineTo(6, 12);
    ctx.lineTo(1, 8);
    ctx.closePath();
    ctx.fill();
  } else if (enemyType === "flagship") {
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(3, -13);
    ctx.lineTo(0, -18);
    ctx.lineTo(-3, -13);
    ctx.closePath();
    ctx.fill();
  }

  // Head
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(-2.6, 5);
  ctx.lineTo(2.6, 5);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = palette.eye;
  ctx.beginPath();
  ctx.arc(0, 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export const drawGalaxianEnemyCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, entity) {
    const enemy = world.getComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
    const pose = world.getComponent(entity, "VisualPose") as VisualPoseComponent | undefined;
    const trail = world.getComponent(entity, "DiveTrail") as DiveTrailComponent | undefined;
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;

    if (!enemy || !palette) return;

    if (trail && trail.history.length > 1 && (enemy.state === "diving" || enemy.state === "windup")) {
      ctx.save();
      const pts = trail.history;

      ctx.strokeStyle = palette.trail;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.35;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      ctx.restore();
    }

    if (enemy.state === "windup") {
      ctx.save();
      ctx.strokeStyle = palette.trail;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    if (pose) {
      ctx.rotate(pose.rotation);
      ctx.scale(pose.scaleX, pose.scaleY);
    }

    const baseScale = enemy.enemyType === "flagship" ? 1.25 : 1.0;
    drawOrigamiBirdCanvas(ctx, enemy.enemyType, palette, baseScale);

    ctx.restore();
  },
};

export const drawGalaxianPlayerBulletCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, _entity) {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;
    const color = palette?.playerAccent ?? "#5CF2C0";

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 8);
    ctx.stroke();

    if (config?.visual.colorblindMode) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(-2, -2, 4, 12);
    }

    ctx.restore();
  },
};

export const drawGalaxianEnemyBulletCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, _entity) {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;

    const fireColor = palette?.enemyFire ?? "#FF7A45";
    const coreColor = palette?.enemyFireCore ?? "#FFF6E5";

    ctx.save();

    ctx.fillStyle = fireColor;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(2, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();

    if (config?.visual.colorblindMode) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  },
};

export const drawUnfoldShardCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, entity) {
    const shard = world.getComponent(entity, "UnfoldShard") as UnfoldShardComponent | undefined;
    if (!shard) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, shard.life / shard.maxLife);
    ctx.fillStyle = shard.color;

    ctx.beginPath();
    ctx.moveTo(0, -shard.size);
    ctx.lineTo(shard.size / 2, shard.size / 2);
    ctx.lineTo(-shard.size / 2, shard.size / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },
};

export const drawScorePopupCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, entity) {
    const popup = world.getComponent(entity, "ScorePopup") as ScorePopupComponent | undefined;
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;

    if (!popup || !palette) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, popup.life / popup.maxLife);
    ctx.fillStyle = palette.trail;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${popup.points}`, 0, 0);
    ctx.restore();
  },
};
