import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { getDrawable, getRenderGuard, getDrawableTransform } from "../../shared/rendering/renderingUtils";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { createParticlePool, VisualParticlePool } from "../../shared/rendering/VisualParticlePool";
import { resolveGridDisplacementContext, monitorBulletsAndSpawnTrails } from "./GeometryWarsRenderUtils";

// ============================================================================
// ZERO-ALLOCATION PRE-ALLOCATED VISUAL PARTICLE POOL FOR CANVAS
// ============================================================================

export const GEOMETRY_WARS_CANVAS_PARTICLE_POOL: VisualParticlePool = createParticlePool(250);

export function spawnVisualParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  maxLife: number,
  size: number,
  color: string
): void {
  GEOMETRY_WARS_CANVAS_PARTICLE_POOL.spawn(x, y, vx, vy, maxLife, size, color);
}

function updateVisualParticles(dt: number = 0.016): void {
  GEOMETRY_WARS_CANVAS_PARTICLE_POOL.update(dt, (p) => {
    p.vx *= 0.94; // friction
    p.vy *= 0.94;
  });
}

function drawCanvasVisualParticles(ctx: CanvasRenderingContext2D): void {
  const particles = GEOMETRY_WARS_CANVAS_PARTICLE_POOL.getActiveParticles();
  ctx.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;

    const ratio = p.life / p.maxLife;
    ctx.globalAlpha = ratio;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
}

// ============================================================================
// HIGH-FIDELITY SHAPE DRAWERS
// ============================================================================

function applyNeonStroke(
  ctx: CanvasRenderingContext2D,
  color: string,
  lineWidth = 1.5,
  shadowBlur = 8
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowColor = color;
}

/**
 * Shape drawer for the Geometry Wars player ship (neon diamond/arrow).
 * @public
 */
export const drawPlayerShip: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 16);
    if (!drawable) return;
    const { render, size } = drawable;

    const transform = getDrawableTransform(world, entity);
    if (!transform) return;

    const player = world.getComponent(entity, "Player");
    if (!player) return;
    const color = render.color ?? colors.cyan;
    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    // Trigger thruster smoke/engine particles trailing behind on movement
    const velocity = world.getComponent(entity, "Velocity");
    if (velocity && (Math.abs(velocity.vx) > 10 || Math.abs(velocity.vy) > 10)) {
      if (world.tick % 3 === 0) {
        const angle = Math.atan2(velocity.vy, velocity.vx) + Math.PI; // opposite direction
        const spreadAngle = angle + (world.renderRandom.next() - 0.5) * 0.4;
        const pSpeed = world.renderRandom.nextRange(30, 80);
        const pvx = Math.cos(spreadAngle) * pSpeed;
        const pvy = Math.sin(spreadAngle) * pSpeed;
        spawnVisualParticle(
          x - Math.cos(angle) * 8,
          y - Math.sin(angle) * 8,
          pvx,
          pvy,
          world.renderRandom.nextRange(0.3, 0.6),
          world.renderRandom.nextRange(2.5, 4.0),
          colors.cyan
        );
      }
    }

    // Trigger Muzzle Flash Sparks based on hitFlashFrames set on firing
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      const aim = world.getComponent(entity, "Aim");
      if (aim) {
        const ax = aim.aimX;
        const ay = aim.aimY;
        const alen = Math.sqrt(ax * ax + ay * ay);
        if (alen > 0.1) {
          const nax = ax / alen;
          const nay = ay / alen;
          const noseX = x + nax * 12;
          const noseY = y + nay * 12;

          // Spawn muzzle flash sparks
          for (let i = 0; i < 4; i++) {
            const spreadAngle = Math.atan2(nay, nax) + (world.renderRandom.next() - 0.5) * 0.6;
            const pSpeed = world.renderRandom.nextRange(80, 160);
            spawnVisualParticle(
              noseX,
              noseY,
              Math.cos(spreadAngle) * pSpeed,
              Math.sin(spreadAngle) * pSpeed,
              world.renderRandom.nextRange(0.15, 0.35),
              world.renderRandom.nextRange(2.0, 3.5),
              colors.white
            );
          }
        }
      }
    }

    ctx.save();

    // Invulnerability flashing blinking feedback
    const invState = resolveInvulnerabilityPulse(player.invulnRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0.3 });
    if (invState.isInvulnerable) {
      ctx.globalAlpha = invState.opacity;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;

    // Draw arrow/diamond shape
    ctx.beginPath();
    ctx.moveTo(size, 0); // Nose pointing right (0 degrees is along +X)
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 4, 0);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.stroke();

    // Hot inner core
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.moveTo(size * 0.4, 0);
    ctx.lineTo(-size * 0.2, -size * 0.2);
    ctx.lineTo(-size * 0.1, 0);
    ctx.lineTo(-size * 0.2, size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Shape drawer for Particle (glow square).
 * @public
 */
export const drawParticle: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 3);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.white;

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
};

/**
 * Shape drawer for Chaser enemy (magenta diamond).
 * @public
 */
export const drawChaser: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 14);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.pink;

    applyNeonStroke(ctx, color, 2, 10);

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for Evader enemy (orange triangle / star).
 * @public
 */
export const drawEvader: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 14);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? "#ffaa00";

    applyNeonStroke(ctx, color, 2, 10);

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for Grunt enemy (cyan small triangle).
 * @public
 */
export const drawGrunt: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 10);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.cyan;

    applyNeonStroke(ctx, color);

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.7);
    ctx.lineTo(-size, size * 0.7);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for bullets.
 * @public
 */
export const drawBullet: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 4);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.gold;

    applyNeonStroke(ctx, color);

    // Draw a small bright laser line
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for enemy seeker (neon diamond/star).
 * @public
 */
export const drawEnemySeeker: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 12);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.pink;

    applyNeonStroke(ctx, color);

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size / 2, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for enemy evader (neon square).
 * @public
 */
export const drawEnemyEvader: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 12);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.green;

    applyNeonStroke(ctx, color);

    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for enemy fast seeker (neon arrow/triangle).
 * @public
 */
export const drawEnemyFastSeeker: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 8);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.pink;

    applyNeonStroke(ctx, color);

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size / 2, 0);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

// ============================================================================
// GEOMETRY WARS BACKGROUND NEON DEFORMING GRID EFFECT
// ============================================================================

/**
 * High-fidelity, deforming glowing neon blue background grid.
 * @public
 */
export const drawGeometryWarsBackground: EffectDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world) {
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;

    // 1. Process visual particles updates and drawings
    updateVisualParticles();
    drawCanvasVisualParticles(ctx);

    // 2. Monitor bullet states for trail and explosion spawns
    monitorBulletsAndSpawnTrails(world, spawnVisualParticle, colors.gold, colors.pink);

    // 3. Resolve grid displacement context
    const { playerX, playerY, bulletCount } = resolveGridDisplacementContext(world, width, height);

    // 5. Draw Deforming Grid Lines
    ctx.save();
    ctx.strokeStyle = "rgba(0, 160, 255, 0.16)"; // Translucent neon blue
    ctx.lineWidth = 0.8;

    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      let first = true;
      for (let x = 0; x <= width; x += 25) {
        const displaced = getDisplacedPoint(x, y, playerX, playerY, BULLET_COORDS, bulletCount);
        if (first) {
          ctx.moveTo(displaced.x, displaced.y);
          first = false;
        } else {
          ctx.lineTo(displaced.x, displaced.y);
        }
      }
      ctx.stroke();
    }

    // Draw vertical grid lines
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      let first = true;
      for (let y = 0; y <= height; y += 25) {
        const displaced = getDisplacedPoint(x, y, playerX, playerY, BULLET_COORDS, bulletCount);
        if (first) {
          ctx.moveTo(displaced.x, displaced.y);
          first = false;
        } else {
          ctx.lineTo(displaced.x, displaced.y);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }
};
