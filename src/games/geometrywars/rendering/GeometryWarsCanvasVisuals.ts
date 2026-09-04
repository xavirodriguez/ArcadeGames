import { ShapeDrawer, EffectDrawer, TransformComponent, World, Entity, RenderComponent } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { getDrawable } from "../../shared/rendering/renderingUtils";

// TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsSkiaVisuals.ts:123-149. Considerar extraer a función compartida. Ref: a6905ddf
export function spawnVisualParticle(
  _x: number,
  _y: number,
  _vx: number,
  _vy: number,
  _maxLife: number,
  _size: number,
  _color: string
): void {}

// ============================================================================
// DECOUPLED BULLET DEATH & TRAIL MONITOR
// ============================================================================

const LAST_BULLETS_MAP = new Map<number, { x: number; y: number }>();
const CURRENT_BULLETS_SET = new Set<number>();

// TODO(refactor): código duplicado detectado (función) con geometrywars/rendering/GeometryWarsSkiaVisuals.ts:158-172. Considerar extraer a función compartida. Ref: bf14de5c
function monitorBulletsAndSpawnTrails(world: World<GeometryWarsComponentRegistry>): void {
  CURRENT_BULLETS_SET.clear();

  // Find all active bullets in this frame
  const entities = world.query("Transform", "Render");
  for (const ent of entities) {
    const render = world.getComponent(ent, "Render")!;
    if (render.shape === "gw_bullet" && render.visible) {
      CURRENT_BULLETS_SET.add(ent);
      const transform = world.getComponent(ent, "Transform")!;
      const bx = transform.worldX ?? transform.x;
      const by = transform.worldY ?? transform.y;

      LAST_BULLETS_MAP.set(ent, { x: bx, y: by });

      // Spawn a continuous subtle neon yellow trail spark particle
      if (world.tick % 2 === 0) {
        spawnVisualParticle(
          bx,
          by,
          (world.renderRandom.next() - 0.5) * 15,
          (world.renderRandom.next() - 0.5) * 15,
          0.3,
          2.0,
          colors.gold
        );
      }
    }
  }

  // Find bullets that were removed (present in LAST_BULLETS_MAP but not in CURRENT_BULLETS_SET)
  for (const [id, pos] of LAST_BULLETS_MAP.entries()) {
    if (!CURRENT_BULLETS_SET.has(id)) {
      // Bullet died/expired! Spawn a stunning splash explosion of neon particles
      const sparkCount = 8 + world.renderRandom.nextInt(0, 4);
      for (let s = 0; s < sparkCount; s++) {
        const angle = world.renderRandom.next() * Math.PI * 2;
        const speed = world.renderRandom.nextRange(40, 100);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        spawnVisualParticle(
          pos.x,
          pos.y,
          vx,
          vy,
          world.renderRandom.nextRange(0.4, 0.7),
          world.renderRandom.nextRange(2.0, 3.5),
          world.renderRandom.next() > 0.4 ? colors.gold : colors.pink
        );
      }
      LAST_BULLETS_MAP.delete(id);
    }
  }
}

// ============================================================================
// HIGH-FIDELITY SHAPE DRAWERS
// ============================================================================

/**
 * Shape drawer for the Geometry Wars player ship (neon diamond/arrow).
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con pong/rendering/PongCanvasVisuals.ts:15-23. Considerar extraer a función compartida. Ref: 0f5b5e6b
export const drawPlayerShip: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 16);
    if (!drawable) return;
    const { render, size } = drawable;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const player = world.getComponent(entity, "Player");
    if (!player) return;
    const color = render.color ?? colors.cyan;
    // TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsSkiaVisuals.ts:218-229. Considerar extraer a función compartida. Ref: 8ad13b3a
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
    if (player.invulnRemaining > 0) {
      if (Math.floor(world.tick / 4) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
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
// TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsCanvasVisuals.ts:247-253. Considerar extraer a función compartida. Ref: 4309fb19
export const drawChaser: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 14);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.pink;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

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
// TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsCanvasVisuals.ts:223-229. Considerar extraer a función compartida. Ref: 1e0fb40f
export const drawEvader: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 14);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? "#ffaa00";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

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
    // TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsCanvasVisuals.ts:395-405. Considerar extraer a función compartida. Ref: cd9567aa
    const color = render.color ?? colors.cyan;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

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

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

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
// TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsCanvasVisuals.ts:363-369. Considerar extraer a función compartida. Ref: fc8f753a
export const drawEnemySeeker: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 12);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.pink;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

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

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

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
    // TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsCanvasVisuals.ts:289-299. Considerar extraer a función compartida. Ref: c15c9151
    const color = render.color ?? colors.pink;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

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
    // TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsSkiaVisuals.ts:596-623. Considerar extraer a función compartida. Ref: 3ccbee7f
    const { width, height } = screen;

    // 2. Monitor bullet states for trail and explosion spawns
    monitorBulletsAndSpawnTrails(world);

    // 3. Fetch Player coordinates for real-time grid displacement
    let playerX = width / 2;
    let playerY = height / 2;
    const players = world.query("Player", "Transform");
    if (players.length > 0) {
      const transform = world.getComponent(players[0], "Transform")!;
      playerX = transform.worldX ?? transform.x;
      playerY = transform.worldY ?? transform.y;
    }

    // 4. Collect active bullets coordinates (up to 100) to displace the grid
    let bulletCount = 0;
    const entities = world.query("Transform", "Render");
    for (const ent of entities) {
      if (bulletCount >= 100) break;
      const render = world.getComponent(ent, "Render")!;
      if (render.shape === "gw_bullet" && render.visible) {
        const trans = world.getComponent(ent, "Transform")!;
        BULLET_COORDS[bulletCount].x = trans.worldX ?? trans.x;
        BULLET_COORDS[bulletCount].y = trans.worldY ?? trans.y;
        bulletCount++;
      }
    }

    // 5. Draw Deforming Grid Lines
    ctx.save();
    ctx.strokeStyle = "rgba(0, 160, 255, 0.16)"; // Translucent neon blue
    ctx.lineWidth = 0.8;

    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      let first = true;
      for (// TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsCanvasVisuals.ts:480-490. Considerar extraer a función compartida. Ref: e6dc6a7a
      let x = 0; x <= width; x += 25) {
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
      for (// TODO(refactor): código duplicado detectado (bloque) con geometrywars/rendering/GeometryWarsCanvasVisuals.ts:472-482. Considerar extraer a función compartida. Ref: 4f6c26d6
      let y = 0; y <= height; y += 25) {
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
