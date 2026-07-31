import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

/**
 * Visuals for the player ship.
 * Sleek sci-fi dual-winged fighter with an active flickering thruster flame.
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

    // 1. Flickering thruster flame (fully deterministic using world.renderRandom)
    const rng = world.renderRandom;
    const flameHeight = 10 + rng.next() * 12;
    const flameWidth = 6 + rng.next() * 4;
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

    // 2. Twin wings (Sleek aerodynamic wings)
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

    // 3. Central main ship hull
    ctx.fillStyle = (color === "white") ? "white" : "#00DD00"; // darker green for shading depth
    ctx.beginPath();
    ctx.moveTo(-size / 6, size / 4);
    ctx.lineTo(-size / 6, -size / 4);
    ctx.lineTo(0, -size / 2); // Nose cone
    ctx.lineTo(size / 6, -size / 4);
    ctx.lineTo(size / 6, size / 4);
    ctx.closePath();
    ctx.fill();

    // 4. Cockpit windshield
    ctx.fillStyle = (color === "white") ? "white" : "#00FFFF"; // Cyan canopy glass
    ctx.beginPath();
    ctx.moveTo(-size / 10, -size / 8);
    ctx.lineTo(0, -size / 4);
    ctx.lineTo(size / 10, -size / 8);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // 5. Dual side blasters
    ctx.fillStyle = "#888888";
    ctx.fillRect(-size / 2.2, -size / 12, 3, size / 4);
    ctx.fillRect(size / 2.2 - 3, -size / 12, 3, size / 4);

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
      // Magenta / Violet tone naturally or colored via blueprint
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
 * Styled as energy projectile capsules with glowing neon borders and hyper-white core.
 */
export const drawSpaceInvadersBullet: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 4, color = "yellow" } = render;

    ctx.save();

    // Outer glow simulation using canvas shadows (doesn't trigger heap allocation)
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;

    // Glowing envelope capsule
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size / 2, -size, size, size * 2, size / 2);
    } else {
      ctx.rect(-size / 2, -size, size, size * 2);
    }
    ctx.fill();

    // Internal hot plasma laser core
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
 * High-juice sparkling diamonds that dynamically shrink and fade based on their remaining TTL.
 */
export const drawSpaceInvadersParticle: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 2, color = "white" } = render;

    // Check TTL to scale and fade smoothly
    const ttlType = "TTL" as Extract<keyof SpaceInvadersComponentRegistry, string>;
    const ttl = world.getComponent(entity, ttlType) as any;

    let opacity = 1.0;
    let currentSize = size;

    if (ttl && ttl.remaining > 0) {
      const ratio = Math.max(0, Math.min(1, ttl.timeLeft / ttl.remaining));
      opacity = ratio;
      currentSize = size * (0.3 + 0.7 * ratio);
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;

    // Sparkling starburst diamond path
    ctx.beginPath();
    ctx.moveTo(0, -currentSize);
    ctx.lineTo(currentSize / 2, 0);
    ctx.lineTo(0, currentSize);
    ctx.lineTo(-currentSize / 2, 0);
    ctx.closePath();
    ctx.fill();

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

const stars: Star[] = [];

/**
 * Generate seedable starfield once at compilation/module load to enforce 0 heap allocations in drawing loop.
 */
function initializeStarfield() {
  let seed = 12345;
  function lcg() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  for (let i = 0; i < 60; i++) {
    const layer = Math.floor(lcg() * 3);
    let speed = 20;
    let size = 1;
    let color = "#FFFFFF";

    if (layer === 0) {
      speed = 10 + lcg() * 10;
      size = 1.0;
      color = "rgba(120, 120, 255, 0.4)"; // faint blue background star
    } else if (layer === 1) {
      speed = 25 + lcg() * 15;
      size = 1.5;
      color = "rgba(220, 100, 220, 0.6)"; // medium pink star
    } else {
      speed = 60 + lcg() * 30;
      size = 2.0;
      color = "rgba(100, 255, 255, 0.85)"; // bright cyan foreground star
    }

    stars.push({
      x: lcg() * 800,
      y: lcg() * 600,
      speed,
      size,
      color
    });
  }
}
initializeStarfield();

/**
 * Parallax Starfield Background effect drawer with retro glowing cabinet borders.
 */
export const spaceInvadersStarfield: EffectDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world) {
    const tick = world.tick;
    ctx.save();

    // 1. Draw drift stars (modulo-wrapped based on tick)
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const currentY = (star.y + star.speed * (tick / 60)) % 600;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, currentY, star.size, star.size);
    }

    // 2. Draw glowing side-borders for retro CRT cabinet feel
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
