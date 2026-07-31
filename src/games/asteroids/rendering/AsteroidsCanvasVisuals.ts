import { ShapeDrawer, World, RenderComponent, CircleShape } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";

/**
 * Procedural spaceship drawer with retro vector style, thrust fire, and invulnerability shields.
 * Completely zero-allocation in the render tick.
 * @public
 */
export const drawAsteroidsShip: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const collider = world.getComponent(entity, "Collider");
    const radius = (collider?.shape as CircleShape)?.radius ?? 15;

    ctx.save();

    // 1. Setup retro glowing visual style (neon oscilloscope look)
    const baseColor = render.color || "#00FF66"; // Neon green default for the ship
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 8;

    // Handle hit flash and general invulnerability blinking
    const isInvulnerable = world.hasComponent(entity, "Invulnerable");
    if (isInvulnerable) {
      const frame = Math.floor(Date.now() / 80);
      if (frame % 2 === 0) {
        ctx.globalAlpha = 0.25;
      }
    }

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if ((render.hitFlashFrames >> 1) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      ctx.strokeStyle = "#FFFFFF";
      ctx.shadowColor = "#FFFFFF";
    }

    // 2. Draw classic triangular vector spaceship pointing to the right (+X axis)
    ctx.beginPath();
    // Nose
    ctx.moveTo(radius, 0);
    // Back-left wing tip
    ctx.lineTo(-radius * 0.8, -radius * 0.7);
    // Back-center cutout inset
    ctx.lineTo(-radius * 0.4, 0);
    // Back-right wing tip
    ctx.lineTo(-radius * 0.8, radius * 0.7);
    ctx.closePath();
    ctx.stroke();

    // 3. Draw animating rear rocket flame if thrusting
    const input = world.getComponent(entity, "Input");
    const isThrusting = input?.actions?.["thrust"] === true;
    if (isThrusting) {
      ctx.beginPath();
      ctx.strokeStyle = "#FF3300"; // Red-orange flame
      ctx.shadowColor = "#FF3300";
      // Start inside the back-center cutout
      ctx.moveTo(-radius * 0.4, 0);
      ctx.lineTo(-radius * 0.6, -radius * 0.25);
      // Faux-random length flicker using world.renderRandom
      const flickerLength = radius * (1.0 + world.renderRandom.next() * 0.6);
      ctx.lineTo(-flickerLength, 0);
      ctx.lineTo(-radius * 0.6, radius * 0.25);
      ctx.closePath();
      ctx.stroke();

      // Flame core (yellow)
      ctx.beginPath();
      ctx.strokeStyle = "#FFFF00";
      ctx.shadowColor = "#FFFF00";
      ctx.moveTo(-radius * 0.4, 0);
      ctx.lineTo(-radius * 0.5, -radius * 0.12);
      ctx.lineTo(-radius * (0.7 + world.renderRandom.next() * 0.3), 0);
      ctx.lineTo(-radius * 0.5, radius * 0.12);
      ctx.closePath();
      ctx.stroke();
    }

    // 4. Draw protective shield pulsing overlay if invulnerable
    if (isInvulnerable) {
      ctx.strokeStyle = "#00FFFF"; // Cyan energy shield
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 1.5;

      const timeFactor = Date.now() / 200;
      const pulsingRadius = radius * (1.3 + Math.sin(timeFactor) * 0.1);

      // Dash pattern to make it look like a spinning/charging high-tech shield
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, pulsingRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

/**
 * Neon plasma laser vector drawer.
 * Completely zero-allocation in the render tick.
 * @public
 */
export const drawAsteroidsBullet: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const collider = world.getComponent(entity, "Collider");
    const radius = (collider?.shape as CircleShape)?.radius ?? 2;

    ctx.save();

    // Setup glowing neon laser style
    const laserColor = render.color || "#FF00FF"; // Neon magenta
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = laserColor;
    ctx.shadowBlur = 6;

    // Draw horizontal laser streak
    ctx.beginPath();
    ctx.moveTo(-radius * 3.5, 0);
    ctx.lineTo(radius * 1.5, 0);
    ctx.stroke();

    // Bright white core
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-radius * 2, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Jagged, procedural space-rock vector drawer using a fast deterministic local LCG.
 * Completely zero-allocation in the render tick.
 * @public
 */
export const drawAsteroidsAsteroid: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const collider = world.getComponent(entity, "Collider");
    const radius = (collider?.shape as CircleShape)?.radius ?? 20;

    const asteroid = world.getComponent(entity, "Asteroid");
    const sizeStr = asteroid?.size ?? "medium";

    ctx.save();

    // Visual design: greyish vectors with slight tint
    let rockColor = "#CCCCCC";
    if (sizeStr === "large") rockColor = "#E6A15C"; // Dust gold
    else if (sizeStr === "medium") rockColor = "#A9B2C3"; // Ice blue
    else rockColor = "#D595A3"; // Rose copper

    ctx.strokeStyle = rockColor;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = rockColor;
    ctx.shadowBlur = 6;

    // Solid dark-transparent fill to mask background grid/stars and give massive physical presence
    ctx.fillStyle = "rgba(10, 10, 15, 0.9)";

    const numPoints = sizeStr === "large" ? 12 : sizeStr === "medium" ? 10 : 8;

    // 1. Generate jagged outline deterministically seeded by the unique Entity ID
    ctx.beginPath();
    let seed = (entity * 17 + 37) % 2147483647;

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i % numPoints) * ((Math.PI * 2) / numPoints);
      // LCG step
      seed = (seed * 16807) % 2147483647;
      const offsetFactor = (seed / 2147483647) * 0.45 - 0.22; // -22% to +22% jaggy offset
      const pointR = radius * (1.0 + offsetFactor);

      const px = Math.cos(angle) * pointR;
      const py = Math.sin(angle) * pointR;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Draw a few cool inner crevices/details deterministically
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.shadowBlur = 0; // Turn off shadows for interior micro-cracks

    // Seed reset for details to keep them matching the outline
    seed = (entity * 17 + 37) % 2147483647;

    // Let's draw 3 cracks connected from the edge to toward center
    for (let c = 0; c < 3; c++) {
      seed = (seed * 16807) % 2147483647;
      const targetPointIndex = seed % numPoints;
      const angle = targetPointIndex * ((Math.PI * 2) / numPoints);

      // Re-run LCG to find the jagged edge point
      let edgeSeed = (entity * 17 + 37) % 2147483647;
      for (let j = 0; j <= targetPointIndex; j++) {
        edgeSeed = (edgeSeed * 16807) % 2147483647;
      }
      const offsetFactor = (edgeSeed / 2147483647) * 0.45 - 0.22;
      const pointR = radius * (1.0 + offsetFactor);

      const ex = Math.cos(angle) * pointR;
      const ey = Math.sin(angle) * pointR;

      // Interior crag endpoints
      const cx = Math.cos(angle) * radius * 0.4;
      const cy = Math.sin(angle) * radius * 0.4;

      ctx.moveTo(ex, ey);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Explosion/trail particle vector drawer.
 * Completely zero-allocation in the render tick.
 * @public
 */
export const drawAsteroidsParticle: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 2.0;

    ctx.save();

    const partColor = render.color || "#FFF";
    ctx.fillStyle = partColor;
    ctx.shadowColor = partColor;
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};
