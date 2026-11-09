import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, VisualPoseComponent, UnfoldShardComponent, ScorePopupComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import {
  getGalaxianPalette,
  resolvePaperSkyVisualContext,
  resolveGalaxianEnemyVisualContext,
  resolveOrigamiBirdColors,
  OrigamiBirdColors,
  GalaxianPalette,
} from "./GalaxianVisualHelpers";
import { ORIGAMI_BIRD_POLYGONS, Polygon2D } from "./GalaxianVisualTokens";

function drawPolygonCanvas(ctx: CanvasRenderingContext2D, polygon: Polygon2D): void {
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i][0], polygon[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawPaperSkyCanvas(ctx: CanvasRenderingContext2D, world: World<GalaxianComponentRegistry>): void {
  const skyContext = resolvePaperSkyVisualContext(world);
  if (!skyContext) return;

  const { w, h, palette, stars, layers } = skyContext;

  // 1. Base night sky
  ctx.fillStyle = palette.paperNight;
  ctx.fillRect(0, 0, w, h);

  // 2. Stars scrolling with parallax
  ctx.fillStyle = palette.star;
  for (const star of stars) {
    if (star.isDiamond) {
      ctx.beginPath();
      ctx.moveTo(star.x, star.y - 3);
      ctx.lineTo(star.x + 1.5, star.y);
      ctx.lineTo(star.x, star.y + 3);
      ctx.lineTo(star.x - 1.5, star.y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(star.x, star.y, 1.5, 1.5);
    }
  }

  // 3. Cut paper strata layers
  for (const layer of layers) {
    ctx.save();

    // Shadow path (hard offset +4, +6)
    ctx.fillStyle = palette.strataShadow;
    ctx.beginPath();
    ctx.ellipse(w / 2 + 4, layer.cy + 6, w * 0.7, h * layer.scaleY, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Main paper layer
    ctx.fillStyle = layer.color;
    ctx.strokeStyle = layer.edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(w / 2, layer.cy, w * 0.7, h * layer.scaleY, -0.15, 0, Math.PI * 2);
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
    const transform = world.getComponent(entity, "Transform");
    const pose = world.getComponent(entity, "VisualPose") as VisualPoseComponent | undefined;
    const palette = getGalaxianPalette(world);

    if (!render || !palette) return;

    const invulnerability = world.getComponent(entity, "Invulnerable");
    if (invulnerability && invulnerability.remaining > 0 && Math.floor(world.tick / 5) % 2 === 0) return;

    ctx.save();
    if (pose && transform) {
      ctx.rotate(pose.rotation - transform.rotation);
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
  palette: GalaxianPalette,
  scale: number = 1.0,
  isDamaged: boolean = false
): void {
  const colors: OrigamiBirdColors = resolveOrigamiBirdColors(enemyType, palette, isDamaged);

  ctx.save();
  ctx.scale(scale, scale);

  // Left Body
  ctx.fillStyle = colors.light;
  drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.leftBody);

  // Right Body
  ctx.fillStyle = colors.mid;
  drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.rightBody);

  // Left Wing Top
  ctx.fillStyle = colors.light;
  drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.leftWingTop);

  // Left Wing Bottom
  ctx.fillStyle = colors.mid;
  drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.leftWingBottom);

  // Right Wing Top
  ctx.fillStyle = colors.mid;
  drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.rightWingTop);

  // Right Wing Bottom
  ctx.fillStyle = colors.dark;
  drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.rightWingBottom);

  if (enemyType === "emissary") {
    ctx.fillStyle = colors.mid;
    drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.emissaryHookLeft);

    ctx.fillStyle = colors.dark;
    drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.emissaryHookRight);
  } else if (enemyType === "escort") {
    ctx.fillStyle = colors.light;
    drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.escortHornLeft);

    ctx.fillStyle = colors.dark;
    drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.escortHornRight);
  } else if (enemyType === "flagship") {
    ctx.fillStyle = colors.light;
    drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.flagshipCrest);
  }

  // Head
  ctx.fillStyle = colors.dark;
  drawPolygonCanvas(ctx, ORIGAMI_BIRD_POLYGONS.head);

  // Eye
  ctx.fillStyle = palette.eye;
  ctx.beginPath();
  ctx.arc(0, 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export const drawGalaxianEnemyCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, entity) {
    const enemyCtx = resolveGalaxianEnemyVisualContext(world, entity);
    if (!enemyCtx) return;

    const { palette, enemy, deltaRotation, scaleX, scaleY, baseScale, isDamaged, trailPoints, showWindupReticle } = enemyCtx;

    if (trailPoints) {
      ctx.save();
      ctx.strokeStyle = palette.trail;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.35;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
      for (let i = 1; i < trailPoints.length; i++) {
        ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
      }
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
      for (let i = 1; i < trailPoints.length; i++) {
        ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
      }
      ctx.stroke();

      ctx.restore();
    }

    if (showWindupReticle) {
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
    if (deltaRotation !== 0) {
      ctx.rotate(deltaRotation);
    }
    if (scaleX !== 1.0 || scaleY !== 1.0) {
      ctx.scale(scaleX, scaleY);
    }

    drawOrigamiBirdCanvas(ctx, enemy.enemyType, palette, baseScale, isDamaged);

    ctx.restore();
  },
};

export const drawGalaxianPlayerBulletCanvas: ShapeDrawer<CanvasRenderingContext2D, GalaxianComponentRegistry> = {
  draw(ctx, world, _entity) {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = getGalaxianPalette(world);
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
    const palette = getGalaxianPalette(world);

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
    const palette = getGalaxianPalette(world);

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
