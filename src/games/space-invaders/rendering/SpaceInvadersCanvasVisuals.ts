import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

/**
 * Visuals for the player ship.
 * Incorporates:
 * - High-fidelity futuristic cockpit chassis design.
 * - Dynamic tilt/leaning on movement based on horizontal velocity.
 * - Flickering, dual-stage thruster plasma plume tail.
 * - Glowing defensive neon invulnerability bubble shield when invulnerable.
 */
export const drawSpaceInvadersPlayer: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 40 } = render;
    let { color = "#00FF00" } = render;

    // Apply hit flash
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    ctx.save();

    // 1. Dynamic tilt/lean based on horizontal velocity
    const velocity = world.getComponent(entity, "Velocity");
    if (velocity) {
      const maxTilt = 0.15; // Limit tilt radians (~8.5 degrees)
      const targetTilt = velocity.vx * 0.0004; // scale velocity to tilt
      const tilt = Math.max(-maxTilt, Math.min(maxTilt, targetTilt));
      ctx.rotate(tilt);
    }

    // 2. Flickering dual-stage thruster plume tail (at the bottom)
    const tick = world.tick;
    const flicker = 1.0 + 0.18 * Math.sin(tick / 2);
    const plumeLength = (size / 2.2) * flicker;

    // Outer plasma flame
    ctx.fillStyle = "#FF3C00";
    ctx.beginPath();
    ctx.moveTo(-size / 5, size / 4);
    ctx.lineTo(size / 5, size / 4);
    ctx.lineTo(0, size / 4 + plumeLength);
    ctx.closePath();
    ctx.fill();

    // Inner hotter core flame
    ctx.fillStyle = "#FFCC00";
    ctx.beginPath();
    ctx.moveTo(-size / 8, size / 4);
    ctx.lineTo(size / 8, size / 4);
    ctx.lineTo(0, size / 4 + plumeLength * 0.6);
    ctx.closePath();
    ctx.fill();

    // 3. Futuristic high-fidelity cockpit, body wings, and neon trims
    ctx.fillStyle = color;

    // Main central chassis
    ctx.beginPath();
    ctx.moveTo(0, -size / 2); // nose tip
    ctx.lineTo(size / 4, -size / 6);
    ctx.lineTo(size / 2, size / 4); // right sweep wing
    ctx.lineTo(size / 3, size / 4);
    ctx.lineTo(size / 5, size / 6); // right hull intake
    ctx.lineTo(-size / 5, size / 6); // left hull intake
    ctx.lineTo(-size / 3, size / 4);
    ctx.lineTo(-size / 2, size / 4); // left sweep wing
    ctx.lineTo(-size / 4, -size / 6);
    ctx.closePath();
    ctx.fill();

    // Neon Wingtips / Cannons
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Left Cannon
    ctx.moveTo(-size / 3, size / 6);
    ctx.lineTo(-size / 3, -size / 3);
    // Right Cannon
    ctx.moveTo(size / 3, size / 6);
    ctx.lineTo(size / 3, -size / 3);
    ctx.stroke();

    // Cannons white cores
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(-size / 3 - 1, -size / 3, 2, size / 4);
    ctx.fillRect(size / 3 - 1, -size / 3, 2, size / 4);

    // High-energy cockpit glass canopy (Cyan)
    ctx.fillStyle = "#00FFFF";
    ctx.beginPath();
    ctx.moveTo(0, -size / 3);
    ctx.lineTo(size / 6, -size / 10);
    ctx.lineTo(size / 8, size / 8);
    ctx.lineTo(-size / 8, size / 8);
    ctx.lineTo(-size / 6, -size / 10);
    ctx.closePath();
    ctx.fill();

    // Inner bright white cockpit reflection
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(-size / 12, -size / 5);
    ctx.lineTo(0, -size / 4);
    ctx.lineTo(size / 12, -size / 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 4. Glowing defensive neon invulnerability bubble shield (Pulsing blue/cyan)
    const health = world.getComponent(entity, "Health");
    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      const shieldPulse = 1.0 + 0.08 * Math.sin(tick / 4);
      const shieldAlpha = 0.35 + 0.15 * Math.sin(tick / 4 + Math.PI);
      const radius = size * 0.72 * shieldPulse;

      ctx.save();
      ctx.strokeStyle = "#00F0FF";
      ctx.lineWidth = 3;
      ctx.globalAlpha = shieldAlpha;
      ctx.shadowColor = "#00F0FF";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Soft shield body fill
      ctx.fillStyle = "rgba(0, 240, 255, 0.08)";
      ctx.fill();

      // Inner electric ring
      ctx.strokeStyle = "#0096FF";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    ctx.globalAlpha = 1.0;
  }
};

/**
 * Visuals for an invader.
 * Incorporates:
 * - Row-based distinct colors (magenta commanders, cyan scouts, gold grunts).
 * - Multi-stage procedural eye/core pulses using sine-waves.
 * - Organic pixel leg walking animations based on ticks.
 */
export const drawSpaceInvadersInvader: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15 } = render;
    let { color = "white" } = render;

    // Apply hit flash
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    } else {
      // Assign gorgeous row-based/rank-based colors
      const invaderComp = world.getComponent(entity, "Invader");
      if (invaderComp) {
        const row = invaderComp.row;
        if (row === 0) {
          color = "#FF0088"; // Row 0 (Commanders): Hot Magenta
        } else if (row <= 2) {
          color = "#00FFDD"; // Rows 1-2 (Scouts): Electric Cyan
        } else {
          color = "#FFCC00"; // Rows 3-4 (Grunts): Cyber Gold
        }
      }
    }

    ctx.fillStyle = color;

    // Simple pixelated invader shape
    const s = size / 11;
    const tick = world.tick;
    // Walk animation toggles legs state organically
    const animPhase = Math.floor(tick / 15) % 2 === 0;

    // Head/Antennae
    ctx.fillRect(-s * 4, -s * 5, s, s);
    ctx.fillRect(s * 3, -s * 5, s, s);
    ctx.fillRect(-s * 3, -s * 4, s, s);
    ctx.fillRect(s * 2, -s * 4, s, s);

    // Main Face
    ctx.fillRect(-s * 4, -s * 3, s * 8, s * 4);

    // Tentacles/Legs that animate!
    if (animPhase) {
      // Leg Position A
      ctx.fillRect(-s * 5, -s, s, s * 3);
      ctx.fillRect(s * 4, -s, s, s * 3);
      ctx.fillRect(-s * 3, s, s * 2, s);
      ctx.fillRect(s * 1, s, s * 2, s);
      ctx.fillRect(-s * 2, s * 2, s, s);
      ctx.fillRect(s * 1, s * 2, s, s);
    } else {
      // Leg Position B
      ctx.fillRect(-s * 4, -s, s, s * 2);
      ctx.fillRect(s * 3, -s, s, s * 2);
      ctx.fillRect(-s * 5, s, s, s * 2);
      ctx.fillRect(s * 4, s, s, s * 2);
      ctx.fillRect(-s * 2, s, s, s * 2);
      ctx.fillRect(s * 1, s, s * 2, s);
    }

    // Glowing alien cyber-cores/eyes (Dynamic glowing orange/red center)
    const eyePulse = 0.5 + 0.5 * Math.abs(Math.sin(tick / 6));
    ctx.fillStyle = "#FF2200";
    ctx.shadowColor = "#FF2200";
    ctx.shadowBlur = 6 * eyePulse;
    ctx.fillRect(-s * 2, -s * 2, s, s);
    ctx.fillRect(s, -s * 2, s, s);

    // Reset shadow blur
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  }
};

/**
 * Visuals for bullets.
 * - Player projectiles render as high-energy cyan plasma bolts with trails.
 * - Enemy projectiles render as aggressive crimson glowing plasma capsules with trails.
 */
export const drawSpaceInvadersBullet: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 4 } = render;

    const isPlayerBullet = world.hasComponent(entity, "PlayerBullet");

    const glowColor = isPlayerBullet ? "#00FFFF" : "#FF1E00";
    const coreColor = "#FFFFFF";

    ctx.save();

    // 1. Draw glowing outer fading capsules as motion trails
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = glowColor;
    const trailOffset = isPlayerBullet ? size * 1.5 : -size * 1.5;

    for (let i = 1; i <= 3; i++) {
      ctx.fillRect(-size / 2, -size + (trailOffset * i), size, size * 2);
    }

    // 2. Draw outer energetic glowing aura
    ctx.globalAlpha = 0.4;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(-size * 1.25, -size * 1.25, size * 2.5, size * 2.5);

    // 3. Draw solid primary energetic bolt
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = glowColor;
    ctx.fillRect(-size / 2, -size, size, size * 2);

    // 4. Draw bright white core
    ctx.fillStyle = coreColor;
    ctx.fillRect(-size / 4, -size * 0.7, size / 2, size * 1.4);

    ctx.restore();
  }
};

/**
 * Visuals for shield blocks.
 * - Layered high-tech hex barricade structures.
 * - Neon green outer outline.
 * - Real damage cracks and fragmenting line patterns overlay based on segment HP ratio.
 */
export const drawSpaceInvadersShield: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15 } = render;
    let { color = "#00FF00" } = render;

    // Apply hit flash
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    const shield = world.getComponent(entity, "Shield");
    const hp = shield ? shield.hp : 3;
    const maxHp = shield ? shield.maxHp : 3;
    const ratio = Math.max(0, Math.min(1.0, hp / maxHp));

    ctx.save();

    // Draw glowing semi-transparent high-tech energy cell fill
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15 + 0.5 * ratio;
    ctx.fillRect(-size / 2, -size / 2, size, size);

    // Draw glowing contours around undamaged/active shield segments
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3 + 0.7 * ratio;
    ctx.strokeRect(-size / 2, -size / 2, size, size);

    // Draw procedural damage cracking overlay lines if damaged
    if (ratio < 1.0) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();

      // Deterministic cracks based on entity ID as seed
      const seed1 = (entity * 17) % size;
      const seed2 = (entity * 41) % size;
      ctx.moveTo(-size / 2 + seed1, -size / 2);
      ctx.lineTo(size / 2 - seed2, size / 2);

      if (ratio < 0.4) {
        // Double the cracks for highly-damaged cells
        const seed3 = (entity * 97) % size;
        ctx.moveTo(size / 2, -size / 2 + seed3);
        ctx.lineTo(-size / 2, size / 2 - seed3);
      }
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
  }
};

/**
 * Visuals for particles.
 * - Zero-allocation heat-dissipation color shifting model.
 * - Sparks start glowing white/yellow, fade to orange, red, and scale down dynamically by TTL.
 */
export const drawSpaceInvadersParticle: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 2, color = "white" } = render;

    const ttl = world.getComponent(entity, "TTL") as any;
    let progress = 0.5;

    if (ttl && ttl.timeLeft !== undefined && ttl.remaining !== undefined) {
      const totalLife = ttl.timeLeft || 0.5;
      progress = Math.max(0, Math.min(1.0, 1.0 - (ttl.remaining / totalLife)));
    }

    // Zero-allocation heat-dissipation color shifting
    let particleColor = color;
    if (color === "white") {
      if (progress < 0.2) {
        particleColor = "#FFFFFF"; // Hot white
      } else if (progress < 0.45) {
        particleColor = "#FFFF33"; // Yellow flare
      } else if (progress < 0.7) {
        particleColor = "#FF6C00"; // Dissipating Orange
      } else {
        particleColor = "#FF1A00"; // Red ember
      }
    }

    // Scale down proportionally to remaining life
    const currentSize = Math.max(0.5, size * (1.1 - progress));

    ctx.save();
    ctx.globalAlpha = 1.0 - progress;
    ctx.fillStyle = particleColor;

    // Glowing shadow for hotter particles
    if (progress < 0.5) {
      ctx.shadowColor = particleColor;
      ctx.shadowBlur = 6 * (1.0 - progress);
    }

    ctx.beginPath();
    ctx.arc(0, 0, currentSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Screen shake background effect.
 */
export const spaceInvadersScreenShakeEffect: EffectDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world) {
    const gameState = world.getSingleton("GameState");
    if (gameState && gameState.screenShake && gameState.screenShake.duration > 0) {
      const { intensity } = gameState.screenShake;
      const renderRandom = world.renderRandom;
      const dx = (renderRandom.next() - 0.5) * intensity;
      const dy = (renderRandom.next() - 0.5) * intensity;
      ctx.translate(dx, dy);
    }
  }
};
