import type { ShapeDrawer } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse, resolveAsteroidHitFlash } from "../../../shared/rendering/RenderUtils";
import {
  resolveAsteroidDrawSetup,
  resolvePlayerShipSetup
} from "../../rendering/AsteroidsVisualHelpers";
import type { AsteroidsComponentRegistry } from "../../types/AsteroidRegistry";
import {
  ICEBERG_PALETTE,
  ICEBERG_SHADOW_OFFSET,
  iceToneColor,
  hullToneColor
} from "./IcebergPalette";
import {
  ICEBREAKER_HULL_VERTS,
  ICEBREAKER_DECK_VERTS,
  scaleVerts
} from "./IcebergGeometry";
import { buildFanFacets } from "./IcebergFacets";
import { vertsForAsteroidEntity } from "./IcebergDrawUtils";

function pathFromVerts(
  ctx: CanvasRenderingContext2D,
  verts: Array<{ x: number; y: number }>
): void {
  if (verts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();
}

function drawHardShadow(
  ctx: CanvasRenderingContext2D,
  verts: Array<{ x: number; y: number }>,
  scale = 1
): void {
  ctx.save();
  ctx.translate(ICEBERG_SHADOW_OFFSET.x * scale, ICEBERG_SHADOW_OFFSET.y * scale);
  pathFromVerts(ctx, verts);
  ctx.fillStyle = ICEBERG_PALETTE.abyssShadow;
  ctx.fill();
  ctx.restore();
}

function drawFacetedBody(
  ctx: CanvasRenderingContext2D,
  verts: Array<{ x: number; y: number }>,
  colorFn: (tone: "light" | "mid" | "dark") => string,
  outlineColor: string
): void {
  const fans = buildFanFacets(verts);
  for (let i = 0; i < fans.length; i++) {
    const f = fans[i];
    ctx.beginPath();
    ctx.moveTo(f.a.x, f.a.y);
    ctx.lineTo(f.b.x, f.b.y);
    ctx.lineTo(f.c.x, f.c.y);
    ctx.closePath();
    ctx.fillStyle = colorFn(f.tone);
    ctx.fill();
  }
  pathFromVerts(ctx, verts);
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.25;
  ctx.lineJoin = "miter";
  ctx.stroke();
}

/**
 * Borealis icebreaker (Canvas) — faceted hull + deck + thermal wake blocks.
 *
 * @public
 */
export const drawIcebergPlayerShip: ShapeDrawer<
  CanvasRenderingContext2D,
  AsteroidsComponentRegistry
> = {
  draw(ctx, world, entity) {
    const setup = resolvePlayerShipSetup(world, world.getComponent(entity, "Render"), entity);
    if (!setup) return;

    const { render, size, isThrusting } = setup;
    let alpha = 1;

    ctx.save();

    const flash = resolveHitFlash(render, ICEBERG_PALETTE.shipHull, 1);
    if (flash.isFlashing) {
      alpha = flash.opacity;
    }
    if (world.hasComponent(entity, "Invulnerable")) {
      const inv = world.getComponent(entity, "Invulnerable");
      const invState = resolveInvulnerabilityPulse(inv?.remaining, alpha, { mode: "time" });
      if (invState.isInvulnerable) alpha = invState.opacity;
    }
    ctx.globalAlpha = alpha;

    const hull = scaleVerts(ICEBREAKER_HULL_VERTS, size);
    const deck = scaleVerts(ICEBREAKER_DECK_VERTS, size);

    // Hard shadow on water
    drawHardShadow(ctx, hull, 1);

    // Faceted hull (warm volume)
    drawFacetedBody(ctx, hull, hullToneColor, ICEBERG_PALETTE.shipShade);

    // Deck block
    pathFromVerts(ctx, deck);
    ctx.fillStyle = ICEBERG_PALETTE.shipDeck;
    ctx.fill();
    ctx.strokeStyle = ICEBERG_PALETTE.shipShade;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Thermal wake — geometric blocks, not soft flame
    if (isThrusting) {
      ctx.fillStyle = ICEBERG_PALETTE.thermalBeam;
      const blocks = [
        { x: -size * 0.85, y: -size * 0.12, w: size * 0.35, h: size * 0.1 },
        { x: -size * 1.05, y: -size * 0.06, w: size * 0.28, h: size * 0.08 },
        { x: -size * 0.85, y: size * 0.02, w: size * 0.35, h: size * 0.1 }
      ];
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        ctx.globalAlpha = alpha * (0.55 + i * 0.12);
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      ctx.globalAlpha = alpha;
    }

    if (flash.isFlashing) {
      pathFromVerts(ctx, hull);
      ctx.strokeStyle = ICEBERG_PALETTE.hudText;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();
  }
};

/**
 * Faceted iceberg asteroid (Canvas) — 3-tone crystal + hard shadow.
 *
 * @public
 */
export const drawIcebergAsteroid: ShapeDrawer<
  CanvasRenderingContext2D,
  AsteroidsComponentRegistry
> = {
  draw(ctx, world, entity) {
    const setup = resolveAsteroidDrawSetup(world, world.getComponent(entity, "Render"), entity);
    if (!setup) return;

    const { render, radius } = setup;
    const { opacity, isHitFlashing } = resolveAsteroidHitFlash(render, ICEBERG_PALETTE.iceMid);

    ctx.save();
    ctx.globalAlpha = opacity;

    const verts = vertsForAsteroidEntity(entity, radius);

    drawHardShadow(ctx, verts, Math.max(0.6, radius / 40));
    drawFacetedBody(ctx, verts, iceToneColor, ICEBERG_PALETTE.iceDark);

    if (isHitFlashing) {
      pathFromVerts(ctx, verts);
      ctx.strokeStyle = ICEBERG_PALETTE.thermalBeam;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();
  }
};

/**
 * Thermal beam projectile (Canvas) — solid warm block, no soft glow.
 *
 * @public
 */
export const drawIcebergBullet: ShapeDrawer<
  CanvasRenderingContext2D,
  AsteroidsComponentRegistry
> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 2;
    const length = size * 5;
    const thickness = Math.max(2, size * 1.2);

    ctx.save();
    // Outer thermal block
    ctx.fillStyle = ICEBERG_PALETTE.thermalBeam;
    ctx.fillRect(-length / 2, -thickness / 2, length, thickness);
    // Hot core
    ctx.fillStyle = ICEBERG_PALETTE.hudText;
    ctx.fillRect(-length / 2, -thickness / 4, length, thickness / 2);
    ctx.restore();
  }
};
