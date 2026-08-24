import { ShapeDrawer, EffectDrawer, TransformComponent, World, Entity, RenderComponent } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";

let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {}

let cachedPaint: any = null;
function getPaint(): any {
  if (!cachedPaint && Skia) {
    cachedPaint = Skia.Paint();
  }
  return cachedPaint;
}

// ============================================================================
// ZERO-ALLOCATION FILE-LEVEL PRE-ALLOCATED VISUAL PARTICLE POOL
// ============================================================================

interface VisualParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  skColor?: any;
}

const PARTICLE_POOL_SIZE = 250;
const PARTICLE_POOL: VisualParticle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
  active: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  life: 0,
  maxLife: 0,
  size: 0,
  color: ""
}));

/**
 * Spawns a custom particle from our zero-allocation pool.
 */
export function spawnSkiaVisualParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  maxLife: number,
  size: number,
  color: string
): void {
  for (let i = 0; i < PARTICLE_POOL.length; i++) {
    const p = PARTICLE_POOL[i];
    if (!p.active) {
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.size = size;
      p.color = color;
      p.skColor = Skia ? Skia.Color(color) : null;
      break;
    }
  }
}

/**
 * Updates active particles with friction and limits.
 */
function updateVisualParticles(dt: number = 0.016): void {
  for (let i = 0; i < PARTICLE_POOL.length; i++) {
    const p = PARTICLE_POOL[i];
    if (p.active) {
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94; // friction
      p.vy *= 0.94;
    }
  }
}

/**
 * Draws all active particles with neon glow.
 */
function drawVisualParticles(canvas: any): void {
  if (!Skia) return;
  const paint = getPaint();

  canvas.save();
  for (let i = 0; i < PARTICLE_POOL.length; i++) {
    const p = PARTICLE_POOL[i];
    if (!p.active) continue;

    const ratio = p.life / p.maxLife;
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(p.skColor || Skia.Color(p.color));
    paint.setAlphaf(ratio);

    canvas.drawRect(
      Skia.XYWHRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size),
      paint
    );
  }
  canvas.restore();
}


// ============================================================================
// DECOUPLED BULLET DEATH & TRAIL MONITOR
// ============================================================================

const LAST_BULLETS_MAP = new Map<number, { x: number; y: number }>();
const CURRENT_BULLETS_SET = new Set<number>();

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
        spawnSkiaVisualParticle(
          bx,
          by,
          (world.renderRandom.next() - 0.5) * 15,
          (world.renderRandom.next() - 0.5) * 15,
          0.3,
          2.0,
          "#ffff00"
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
        spawnSkiaVisualParticle(
          pos.x,
          pos.y,
          vx,
          vy,
          world.renderRandom.nextRange(0.4, 0.7),
          world.renderRandom.nextRange(2.0, 3.5),
          world.renderRandom.next() > 0.4 ? "#ffff00" : "#ff00ff"
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
 * Skia shape drawer for the player ship.
 * @public
 */
export const drawSkiaPlayerShip: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const player = world.getComponent(entity, "Player");
    if (!player) return;

    const size = render.size ?? 16;
    const color = render.color ?? "#00f0ff";
    if (transform) {
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
          spawnSkiaVisualParticle(
            x - Math.cos(angle) * 8,
            y - Math.sin(angle) * 8,
            pvx,
            pvy,
            world.renderRandom.nextRange(0.3, 0.6),
            world.renderRandom.nextRange(2.5, 4.0),
            "#00f0ff"
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
              spawnSkiaVisualParticle(
                noseX,
                noseY,
                Math.cos(spreadAngle) * pSpeed,
                Math.sin(spreadAngle) * pSpeed,
                world.renderRandom.nextRange(0.15, 0.35),
                world.renderRandom.nextRange(2.0, 3.5),
                "#ffffff"
              );
            }
          }
        }
      }
    }

    const paint = getPaint();
    canvas.save();

    let visualOpacity = render.opacity ?? 1.0;
    // Invulnerability flashing blinking feedback in Skia
    if (player.invulnRemaining > 0) {
      if (Math.floor(world.tick / 4) % 2 === 0) {
        visualOpacity = 0.3;
      }
    }

    // 1. Draw glowing neon stroke outline using a Skia path
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2.0);
    paint.setColor(Skia.Color(color));
    paint.setAlphaf(visualOpacity);

    const path = Skia.Path.Make();
    path.moveTo(size, 0); // Nose pointing right
    path.lineTo(-size / 2, -size / 2);
    path.lineTo(-size / 4, 0);
    path.lineTo(-size / 2, size / 2);
    path.close();

    canvas.drawPath(path, paint);

    // 2. Draw white inner hot core
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#ffffff"));
    paint.setAlphaf(visualOpacity);

    const corePath = Skia.Path.Make();
    corePath.moveTo(size * 0.4, 0);
    corePath.lineTo(-size * 0.2, -size * 0.2);
    corePath.lineTo(-size * 0.1, 0);
    corePath.lineTo(-size * 0.2, size * 0.2);
    corePath.close();

    canvas.drawPath(corePath, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Grunt enemy.
 * @public
 */
export const drawSkiaParticle: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 3;
    const color = render.color ?? "#ffffff";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));

    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Chaser enemy.
 * @public
 */
export const drawSkiaChaser: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 14;
    const color = render.color ?? "#ff00ff";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2.0);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(0, -size);
    path.lineTo(size, 0);
    path.lineTo(0, size);
    path.lineTo(-size, 0);
    path.close();

    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Evader enemy.
 * @public
 */
export const drawSkiaEvader: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 14;
    const color = render.color ?? "#ffaa00";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2.0);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size / 2, -size / 2);
    path.lineTo(-size / 2, size / 2);
    path.close();

    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Grunt enemy.
 * @public
 */
export const drawSkiaGrunt: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 10;
    const color = render.color ?? "#00ffff";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size, -size * 0.7);
    path.lineTo(-size, size * 0.7);
    path.close();

    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the bullets.
 * @public
 */
export const drawSkiaBullet: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 4;
    const color = render.color ?? "#ffff00";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(color));

    canvas.drawLine(-size, 0, size, 0, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for enemy seeker (neon diamond/star).
 * @public
 */
export const drawSkiaEnemySeeker: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 12;
    const color = render.color ?? "#ff00ff";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(0, -size);
    path.lineTo(size / 2, 0);
    path.lineTo(0, size);
    path.lineTo(-size / 2, 0);
    path.close();

    canvas.drawPath(path, paint);
    canvas.restore();
  }
};

/**
 * Skia shape drawer for enemy evader (neon square).
 * @public
 */
export const drawSkiaEnemyEvader: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 12;
    const color = render.color ?? "#00ff00";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(color));

    canvas.drawRect(
      Skia.XYWHRect(-size / 2, -size / 2, size, size),
      paint
    );
    canvas.restore();
  }
};

/**
 * Skia shape drawer for enemy fast seeker (neon arrow/triangle).
 * @public
 */
export const drawSkiaEnemyFastSeeker: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 8;
    const color = render.color ?? "#ff0000";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size, -size / 2);
    path.lineTo(-size / 2, 0);
    path.lineTo(-size, size / 2);
    path.close();

    canvas.drawPath(path, paint);
    canvas.restore();
  }
};

// ============================================================================
// GEOMETRY WARS BACKGROUND NEON DEFORMING GRID EFFECT (SKIA)
// ============================================================================

/**
 * Skia-based high-fidelity deforming glowing neon blue background grid.
 * @public
 */
export const drawSkiaGeometryWarsBackground: EffectDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;

    // 1. Process visual particles updates and drawings
    updateVisualParticles();
    drawVisualParticles(canvas);

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

    // 5. Draw Deforming Grid Lines via Skia DrawLine
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 160, 255, 0.16)"));
    paint.setStrokeWidth(0.8);

    canvas.save();

    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += 40) {
      let lastX = 0;
      let lastY = 0;
      let first = true;
      for (let x = 0; x <= width; x += 25) {
        const displaced = getDisplacedPoint(x, y, playerX, playerY, BULLET_COORDS, bulletCount);
        if (first) {
          lastX = displaced.x;
          lastY = displaced.y;
          first = false;
        } else {
          canvas.drawLine(lastX, lastY, displaced.x, displaced.y, paint);
          lastX = displaced.x;
          lastY = displaced.y;
        }
      }
    }

    // Draw vertical grid lines
    for (let x = 0; x <= width; x += 40) {
      let lastX = 0;
      let lastY = 0;
      let first = true;
      for (let y = 0; y <= height; y += 25) {
        const displaced = getDisplacedPoint(x, y, playerX, playerY, BULLET_COORDS, bulletCount);
        if (first) {
          lastX = displaced.x;
          lastY = displaced.y;
          first = false;
        } else {
          canvas.drawLine(lastX, lastY, displaced.x, displaced.y, paint);
          lastX = displaced.x;
          lastY = displaced.y;
        }
      }
    }

    canvas.restore();
  }
};
