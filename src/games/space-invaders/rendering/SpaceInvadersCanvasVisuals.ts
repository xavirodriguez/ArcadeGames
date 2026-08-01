import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

/**
 * Visuals for the player ship.
 * Sleek sci-fi dual-winged fighter with dynamic motion tilting and wing cannon muzzle flashes.
 */
export const drawSpaceInvadersPlayer: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 40 } = render;
    let { color = "#00FF00" } = render;

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    ctx.save();

    // 0. Render a glowing energy shield bubble if the player is currently invulnerable
    const healthType = "Health" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const health = world.getComponent(entity, healthType) as any;
    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      const rng = world.renderRandom;
      const pulse = 1.0 + 0.08 * Math.sin(world.tick / 4);
      const shieldRadius = (size / 1.5) * pulse;

      ctx.save();
      ctx.strokeStyle = "rgba(0, 255, 255, 0.45)";
      ctx.lineWidth = 2 + rng.next() * 2; // slight organic flicker

      // Glowing core circle
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Soft internal shield grid pattern
      ctx.fillStyle = "rgba(0, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius - 2, 0, Math.PI * 2);
      ctx.fill();

      // Concentric smaller energy ring
      ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius - 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // 1. Dynamic motion leaning/tilting based on horizontal velocity
    const velocityType = "Velocity" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const velocity = world.getComponent(entity, velocityType) as any;
    if (velocity && Math.abs(velocity.vx) > 10) {
      // Lean into the movement direction
      const tilt = (velocity.vx > 0) ? 0.07 : -0.07;
      ctx.rotate(tilt);
    }

    // 2. Flickering thruster flame (fully deterministic using world.renderRandom)
    const rng = world.renderRandom;
    const flameHeight = 12 + rng.next() * 14;
    const flameWidth = 7 + rng.next() * 5;
    ctx.fillStyle = "#FF5500";
    ctx.beginPath();
    ctx.moveTo(-flameWidth / 2, size / 4);
    ctx.lineTo(0, size / 4 + flameHeight);
    ctx.lineTo(flameWidth / 2, size / 4);
    ctx.closePath();
    ctx.fill();

    // Inner hotter core of the flame
    ctx.fillStyle = "#FFCC00";
    ctx.beginPath();
    ctx.moveTo(-flameWidth / 4, size / 4);
    ctx.lineTo(0, size / 4 + flameHeight * 0.6);
    ctx.lineTo(flameWidth / 4, size / 4);
    ctx.closePath();
    ctx.fill();

    // 3. Twin wings (Sleek aerodynamic wings)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-size / 2, size / 4);
    ctx.lineTo(-size / 3, -size / 8);
    ctx.lineTo(0, 0);
    ctx.lineTo(size / 3, -size / 8);
    ctx.lineTo(size / 2, size / 4);
    ctx.lineTo(size / 3, size / 4);
    ctx.lineTo(0, size / 8);
    ctx.lineTo(-size / 3, size / 4);
    ctx.closePath();
    ctx.fill();

    // 4. Central main ship hull
    ctx.fillStyle = (color === "white") ? "white" : "#00DD00"; // darker green for shading depth
    ctx.beginPath();
    ctx.moveTo(-size / 6, size / 4);
    ctx.lineTo(-size / 6, -size / 4);
    ctx.lineTo(0, -size / 2); // Nose cone
    ctx.lineTo(size / 6, -size / 4);
    ctx.lineTo(size / 6, size / 4);
    ctx.closePath();
    ctx.fill();

    // 5. Cockpit windshield
    ctx.fillStyle = (color === "white") ? "white" : "#00FFFF"; // Cyan canopy glass
    ctx.beginPath();
    ctx.moveTo(-size / 10, -size / 8);
    ctx.lineTo(0, -size / 4);
    ctx.lineTo(size / 10, -size / 8);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // 6. Dual side blasters
    ctx.fillStyle = "#888888";
    const leftBlasterX = -size / 2.2;
    const rightBlasterX = size / 2.2 - 3;
    const blasterY = -size / 12;
    const blasterH = size / 4;
    ctx.fillRect(leftBlasterX, blasterY, 3, blasterH);
    ctx.fillRect(rightBlasterX, blasterY, 3, blasterH);

    // 7. Dynamic muzzle flash when shooting
    const inputType = "Input" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const input = world.getComponent(entity, inputType) as any;
    if (input && input.shootCooldownRemaining > 0.38) {
      // Left cannon flash
      ctx.fillStyle = "#FFFF88";
      ctx.beginPath();
      ctx.arc(leftBlasterX + 1.5, blasterY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(leftBlasterX + 1.5, blasterY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Right cannon flash
      ctx.fillStyle = "#FFFF88";
      ctx.beginPath();
      ctx.arc(rightBlasterX + 1.5, blasterY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(rightBlasterX + 1.5, blasterY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

/**
 * Visuals for an invader.
 * Render highly distinct archetype-based animated alien shapes with blinking parts.
 */
export const drawSpaceInvadersInvader: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 24 } = render;
    let { color = "white" } = render;

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    ctx.save();
    ctx.fillStyle = color;

    // Get archetype identifier from EnemyTag
    const enemyTag = world.getComponent(entity, "EnemyTag" as any) as any;
    const blueprintId = enemyTag?.blueprintId || "";

    const animFrame = Math.floor(world.tick / 15) % 2 === 0;
    const s = size / 12;

    if (blueprintId === "invader_commander") {
      // --- Commander Shape (Menacing wide alien with claws & antennas) ---
      ctx.fillRect(-s * 5, -s * 3, s * 10, s * 2);
      ctx.fillRect(-s * 4, -s, s * 8, s * 3);

      // Glowing yellow/amber angled eyes
      ctx.fillStyle = "#FFFF00";
      ctx.beginPath();
      ctx.moveTo(-s * 3.5, -s * 2);
      ctx.lineTo(-s, -s);
      ctx.lineTo(-s * 3.5, -s);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(s * 3.5, -s * 2);
      ctx.lineTo(s, -s);
      ctx.lineTo(s * 3.5, -s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = color;

      // Antennae loops
      ctx.fillRect(-s * 3, -s * 5, s, s * 2);
      ctx.fillRect(s * 2, -s * 5, s, s * 2);

      // Moving pincers
      if (animFrame) {
        // Pincers clamping
        ctx.fillRect(-s * 6, -s * 2, s * 2, s);
        ctx.fillRect(-s * 5, -s, s, s * 3);

        ctx.fillRect(s * 4, -s * 2, s * 2, s);
        ctx.fillRect(s * 4, -s, s, s * 3);
      } else {
        // Pincers open wide
        ctx.fillRect(-s * 6, -s * 3, s, s * 3);
        ctx.fillRect(-s * 6, s, s * 2, s);

        ctx.fillRect(s * 5, -s * 3, s, s * 3);
        ctx.fillRect(s * 4, s, s * 2, s);
      }

      // Heavy segmented tails
      ctx.fillRect(-s * 3, s * 2, s * 2, s * 2);
      ctx.fillRect(s, s * 2, s * 2, s * 2);

    } else if (blueprintId === "elite_invader") {
      // --- Elite Invader Shape (Futuristic tall alien with vertical shield plates) ---
      // Draw Dome Head
      ctx.beginPath();
      ctx.arc(0, -s * 2, s * 4, Math.PI, 0);
      ctx.fill();

      // Armor core
      ctx.fillRect(-s * 5, -s, s * 10, s * 3);

      // White visor core
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(-s * 3, -s * 2, s * 6, s);

      ctx.fillStyle = color;

      // Heavy shield plates that slide up and down
      if (animFrame) {
        ctx.fillRect(-s * 6, -s * 2, s, s * 5); // Left shield up
        ctx.fillRect(s * 5, -s * 2, s, s * 5);  // Right shield up
        // Engine hover flare
        ctx.fillStyle = "#00FFFF";
        ctx.fillRect(-s * 2, s * 2, s, s * 2);
        ctx.fillRect(s, s * 2, s, s * 2);
      } else {
        ctx.fillRect(-s * 6, -s, s, s * 5); // Left shield down
        ctx.fillRect(s * 5, -s, s, s * 5);  // Right shield down
        // Hover flicker
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-s * 2, s * 2, s, s * 1.2);
        ctx.fillRect(s, s * 2, s, s * 1.2);
      }

    } else {
      // --- Classic Scout/Basic Invader Shape (Pixelated Crab-octopus) ---
      // Head/Body core
      ctx.fillRect(-s * 4, -s * 2, s * 8, s * 4);

      // Hollow pixelated eyes
      ctx.fillStyle = "black";
      ctx.fillRect(-s * 2.2, -s, s * 1.2, s * 1.2);
      ctx.fillRect(s, -s, s * 1.2, s * 1.2);

      ctx.fillStyle = color;

      // Antenna horns
      ctx.fillRect(-s * 3, -s * 4, s, s * 2);
      ctx.fillRect(s * 2, -s * 4, s, s * 2);

      if (animFrame) {
        // Appendages pointing outward/upward
        ctx.fillRect(-s * 5, -s, s, s * 3); // Upper arms
        ctx.fillRect(s * 4, -s, s, s * 3);

        // Lower tentacles
        ctx.fillRect(-s * 4, s * 2, s, s * 3);
        ctx.fillRect(-s * 2, s * 2, s, s * 2);
        ctx.fillRect(s, s * 2, s, s * 2);
        ctx.fillRect(s * 3, s * 2, s, s * 3);
      } else {
        // Appendages pointing inward/downward
        ctx.fillRect(-s * 4, -s * 3, s, s * 2);
        ctx.fillRect(s * 3, -s * 3, s, s * 2);

        // Lower tentacles
        ctx.fillRect(-s * 5, s * 2, s, s * 2);
        ctx.fillRect(-s * 3, s * 2, s, s * 3);
        ctx.fillRect(s * 2, s * 2, s, s * 3);
        ctx.fillRect(s * 4, s * 2, s, s * 2);
      }
    }

    ctx.restore();
  }
};

/**
 * Visuals for UFO Scout.
 * Aerodynamic retro flyer with active blinking signal lights on bottom deck.
 */
export const drawSpaceInvadersUFO: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 30 } = render;
    let { color = "#FF0000" } = render;

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    ctx.save();

    const w = size * 1.3;
    const h = size * 0.55;

    // 1. Sleek metallic diamond spaceship chassis
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 4, -h / 4);
    ctx.lineTo(w / 4, -h / 4);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w / 4, h / 2);
    ctx.lineTo(-w / 4, h / 2);
    ctx.closePath();
    ctx.fill();

    // 2. Neon-cyan bubble cockpit canopy
    ctx.fillStyle = (color === "white") ? "white" : "rgba(0, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(0, -h / 4, w / 6, Math.PI, 0);
    ctx.fill();

    // 3. Alternating neon deck lights at bottom of chassis
    const tick = world.tick;
    const blink = Math.floor(tick / 10) % 2 === 0;

    ctx.fillStyle = blink ? "#FF00FF" : "#00FFFF";
    ctx.beginPath();
    ctx.arc(-w / 3, h / 8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = blink ? "#00FFFF" : "#FF00FF";
    ctx.beginPath();
    ctx.arc(0, h / 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = blink ? "#FF00FF" : "#00FFFF";
    ctx.beginPath();
    ctx.arc(w / 3, h / 8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Visuals for bullets.
 * Styled as energy projectile capsules with glowing neon borders, laser motion trails, and hyper-white core.
 */
export const drawSpaceInvadersBullet: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 4, color = "yellow" } = render;

    ctx.save();

    // 1. Procedural afterimage laser motion trail based on bullet velocity direction
    const velocityType = "Velocity" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const vel = world.getComponent(entity, velocityType) as any;
    if (vel) {
      const trailLength = 24;
      const angle = Math.atan2(vel.vy, vel.vx);
      const trailX = -Math.cos(angle) * trailLength;
      const trailY = -Math.sin(angle) * trailLength;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(-size / 2, 0);
      ctx.lineTo(trailX, trailY);
      ctx.lineTo(size / 2, 0);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Glowing shadow overlay simulation
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;

    // 3. Main glowing capsule envelope
    ctx.fillStyle = color;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size / 2, -size, size, size * 2, size / 2);
    } else {
      ctx.rect(-size / 2, -size, size, size * 2);
    }
    ctx.fill();

    // 4. Hot laser plasma core
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size / 4, -size * 0.8, size / 2, size * 1.6, size / 4);
    } else {
      ctx.rect(-size / 4, -size * 0.8, size / 2, size * 1.6);
    }
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Visuals for shield blocks.
 * Renders physically degrading shield blocks. Erases parts and forms cracks depending on the HP of the shield block.
 */
export const drawSpaceInvadersShield: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15 } = render;
    let { color = "#00FF00" } = render;

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    ctx.save();
    ctx.fillStyle = color;

    const shieldType = "Shield" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const shield = world.getComponent(entity, shieldType) as any;

    if (shield) {
      const hp = shield.hp;

      if (hp === 3) {
        // Pristine bunker segment: Full block + glass highlights
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(-size / 2, -size / 2, size, 2);
      } else if (hp === 2) {
        // Moderately damaged segment: Slightly chipped with carved out crack
        ctx.fillRect(-size / 2, -size / 2, size, size);

        // Subtly erase a jagged crack line using background black
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.moveTo(-size / 4, -size / 4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-size / 4, 0);
        ctx.closePath();
        ctx.fill();
      } else if (hp === 1) {
        // Critically damaged: Fragmented into small floating sub-blocks
        ctx.fillRect(-size / 2, -size / 2, size / 3, size / 3);
        ctx.fillRect(size / 6, -size / 2, size / 3, size / 3);
        ctx.fillRect(-size / 6, size / 6, size / 3, size / 3);
        ctx.fillRect(size / 6, size / 6, size / 3, size / 3);
      } else {
        ctx.fillRect(-size / 2, -size / 2, size, size);
      }
    } else {
      ctx.fillRect(-size / 2, -size / 2, size, size);
    }

    ctx.restore();
  }
};

/**
 * Visuals for particles.
 * High-juice sparkling diamonds that dynamically shrink, fade, and diffuse soft glowing halos.
 */
export const drawSpaceInvadersParticle: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 2 } = render;
    let { color = "white" } = render;

    // Check TTL to scale and fade smoothly
    const ttlType = "TTL" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const ttl = world.getComponent(entity, ttlType) as any;

    let opacity = 1.0;
    let currentSize = size;
    let ratio = 1.0;

    if (ttl && ttl.remaining > 0) {
      ratio = Math.max(0, Math.min(1, ttl.remaining));
      opacity = ratio;
      currentSize = size * (0.3 + 0.7 * ratio);
    }

    // 1. Dynamic heat/plasma dispersion color shift based on remaining TTL ratio (No heap allocations!)
    // If the particle is yellow, shift to orange/red as it ages. If white/cyan, shift to deep blue.
    if (color === "yellow" || color === "#FFFF00") {
      if (ratio < 0.4) color = "#FF3300"; // cool red
      else if (ratio < 0.7) color = "#FF9900"; // warm orange
    } else if (color === "white" || color === "#FFFFFF") {
      if (ratio < 0.3) color = "#0055FF"; // deep cooling blue
      else if (ratio < 0.6) color = "#00FFFF"; // warm cyan
    } else if (color === "#FF00FF" || color === "magenta") {
      if (ratio < 0.4) color = "#660066"; // deep purple
      else if (ratio < 0.7) color = "#CC00CC"; // magenta-red
    }

    ctx.save();

    // 2. Draw secondary soft glowing heat dispersion halo
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity * 0.32;
    ctx.beginPath();
    ctx.arc(0, 0, currentSize * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // 3. Main sparkling diamond path
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -currentSize);
    ctx.lineTo(currentSize / 2, 0);
    ctx.lineTo(0, currentSize);
    ctx.lineTo(-currentSize / 2, 0);
    ctx.closePath();
    ctx.fill();

    // 4. Procedural sparkling tail / trail along flight velocity vector (Fully zero-allocation!)
    const velocityType = "Velocity" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const vel = world.getComponent(entity, velocityType) as any;
    if (vel && (Math.abs(vel.vx) > 5 || Math.abs(vel.vy) > 5)) {
      const angle = Math.atan2(vel.vy, vel.vx);
      const renderRandom = world.renderRandom;

      // Determine back offset positions
      const trailDist1 = currentSize * (1.6 + renderRandom.next() * 0.8);
      const trailX1 = -Math.cos(angle) * trailDist1;
      const trailY1 = -Math.sin(angle) * trailDist1;

      // Draw first trailing tiny spark
      const trailSize1 = currentSize * 0.5;
      ctx.globalAlpha = opacity * 0.5;
      ctx.beginPath();
      ctx.moveTo(trailX1, trailY1 - trailSize1);
      ctx.lineTo(trailX1 + trailSize1 / 2, trailY1);
      ctx.lineTo(trailX1, trailY1 + trailSize1);
      ctx.lineTo(trailX1 - trailSize1 / 2, trailY1);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
};

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
}

interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

const stars: Star[] = [];
const nebulas: NebulaCloud[] = [];

/**
 * Generate seedable starfield and nebulas once at compilation/module load to enforce 0 heap allocations in drawing loop.
 */
function initializeSpaceArt() {
  let seed = 54321;
  function lcg() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  // Initialize Stars
  for (let i = 0; i < 60; i++) {
    const layer = Math.floor(lcg() * 3);
    let speed = 20;
    let size = 1;
    let color = "#FFFFFF";

    if (layer === 0) {
      speed = 10 + lcg() * 10;
      size = 1.0;
      color = "rgba(100, 100, 255, 0.4)"; // Faint deep blue
    } else if (layer === 1) {
      speed = 25 + lcg() * 15;
      size = 1.5;
      color = "rgba(220, 100, 220, 0.6)"; // Medium purple-pink
    } else {
      speed = 60 + lcg() * 30;
      size = 2.0;
      color = "rgba(100, 255, 255, 0.85)"; // Bright foreground cyan
    }

    stars.push({
      x: lcg() * 800,
      y: lcg() * 600,
      speed,
      size,
      color
    });
  }

  // Initialize Cosmic Nebula Gas Clouds
  nebulas.push({ x: 200, y: 150, radius: 180, color: "rgba(0, 255, 255, 0.05)", speed: 4 }); // Cyan Cloud
  nebulas.push({ x: 600, y: 400, radius: 210, color: "rgba(255, 0, 255, 0.04)", speed: 6 }); // Pink Cloud
  nebulas.push({ x: 400, y: -80, radius: 150, color: "rgba(100, 100, 255, 0.045)", speed: 5 }); // Deep Blue Cloud
}
initializeSpaceArt();

/**
 * Parallax Starfield & Cosmic Nebula Background effect drawer with retro glowing cabinet borders and soft CRT Scanlines.
 */
export const spaceInvadersStarfield: EffectDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world) {
    const tick = world.tick;
    ctx.save();

    // 1. Draw slow drifting cosmic nebulas (simulated using layered alpha circles for smooth gas halos)
    for (let i = 0; i < nebulas.length; i++) {
      const neb = nebulas[i];
      const currentY = (neb.y + neb.speed * (tick / 60)) % 800 - 100;

      ctx.fillStyle = neb.color;
      // Core gas cloud
      ctx.beginPath();
      ctx.arc(neb.x, currentY, neb.radius, 0, Math.PI * 2);
      ctx.fill();

      // Middle gas cloud
      ctx.beginPath();
      ctx.arc(neb.x, currentY, neb.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Inner dense gas cloud
      ctx.beginPath();
      ctx.arc(neb.x, currentY, neb.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw drifting stars (modulo-wrapped)
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const currentY = (star.y + star.speed * (tick / 60)) % 600;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, currentY, star.size, star.size);
    }

    // 3. Draw glowing neon side-borders for premium retro cabinet feel
    ctx.strokeStyle = "rgba(255, 0, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#FF00FF";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(10, 600);
    ctx.moveTo(790, 0);
    ctx.lineTo(790, 600);
    ctx.stroke();

    ctx.restore();

    // 4. Overlay soft scanline grids
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    for (let y = 0; y < 600; y += 4) {
      ctx.fillRect(0, y, 800, 1.5);
    }

    // 5. Retro Screen Vignette border
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, 800, 8); // Top edge
    ctx.fillRect(0, 592, 800, 8); // Bottom edge
    ctx.fillRect(0, 0, 8, 600); // Left edge
    ctx.fillRect(792, 0, 8, 600); // Right edge
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

/**
 * Visuals for the Boss Mothership.
 * Menacing heavy dreadnought with a pulsing procedural plasma core, rotating shielding rings,
 * and animated visual feedback indicating damage (shifting armor plating based on HP).
 */
export const drawSpaceInvadersBoss: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 80 } = render;
    let { color = "#FF00FF" } = render;

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "white";
    }

    ctx.save();

    const bossType = "Boss" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const boss = world.getComponent(entity, bossType) as any;
    const tick = world.tick;

    const hpRatio = boss ? (boss.hp / boss.maxHp) : 1.0;

    // 1. Draw rotating protective shield ring (outer layer)
    const ringRadius = size * 0.6;
    const ringAngle = (tick / 40) % (Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, ringAngle, ringAngle + Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, ringAngle + Math.PI, ringAngle + Math.PI * 1.5);
    ctx.stroke();

    // 2. Draw Menacing Heavy Mothership Hull
    ctx.fillStyle = color;
    ctx.beginPath();
    // Complex layered spacecraft shape: heavy center dome with long curved wings/wingspikes
    ctx.moveTo(-size / 2, -size / 8);
    ctx.bezierCurveTo(-size / 3, -size / 2, size / 3, -size / 2, size / 2, -size / 8); // top curve
    ctx.lineTo(size * 0.6, size / 6); // wing edge right
    ctx.lineTo(size * 0.35, size / 12); // inner wing notch right
    ctx.lineTo(0, size / 3); // bottom center point
    ctx.lineTo(-size * 0.35, size / 12); // inner wing notch left
    ctx.lineTo(-size * 0.6, size / 6); // wing edge left
    ctx.closePath();
    ctx.fill();

    // 3. Procedural flashing plasma engine vents on the back/top
    ctx.fillStyle = (tick % 10 < 5) ? "#FF0055" : "#FFCC00";
    ctx.fillRect(-size / 4 - 3, -size / 2, 6, size / 8);
    ctx.fillRect(size / 4 - 3, -size / 2, 6, size / 8);

    // 4. Heavy Segmented Armor Plates that slide / adjust based on remaining HP ratio
    // Left and right plates move outwards when HP is high, clamp inwards as a "defensive" cocoon as HP is low
    const armorOffset = size * 0.08 * hpRatio;
    ctx.fillStyle = (color === "white") ? "white" : "#990099"; // Darker base armor color

    // Left armor plate
    ctx.beginPath();
    ctx.moveTo(-size / 3 - armorOffset, -size / 6);
    ctx.lineTo(-size * 0.5 - armorOffset, 0);
    ctx.lineTo(-size / 3 - armorOffset, size / 6);
    ctx.lineTo(-size / 6 - armorOffset, 0);
    ctx.closePath();
    ctx.fill();

    // Right armor plate
    ctx.beginPath();
    ctx.moveTo(size / 3 + armorOffset, -size / 6);
    ctx.lineTo(size * 0.5 + armorOffset, 0);
    ctx.lineTo(size / 3 + armorOffset, size / 6);
    ctx.lineTo(size / 6 + armorOffset, 0);
    ctx.closePath();
    ctx.fill();

    // 5. Pulsing hot core reactor (fully deterministic using tick-sine pulse)
    const corePulse = 0.8 + 0.2 * Math.sin(tick / 6);
    const coreSize = size * 0.16 * corePulse;

    // Core glow halo (zero allocation, no canvas gradient, just solid arc overlays)
    ctx.fillStyle = "rgba(0, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00FFFF";
    ctx.beginPath();
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Glow beacons/eyes
    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.12, 3, 0, Math.PI * 2);
    ctx.arc(size * 0.15, -size * 0.12, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};
