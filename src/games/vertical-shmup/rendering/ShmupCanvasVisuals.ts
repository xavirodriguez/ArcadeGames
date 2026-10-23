import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SHMUP_COLOR_TOKENS } from "./ShmupColorTokens";
import {
  computeShmupParallaxWorld,
  resolveShmupPlayerDrawContext,
  resolveShmupEnemyDrawContext,
  resolveShmupBulletDrawContext,
} from "./ShmupVisualHelpers";

export const drawShmupPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const pCtx = resolveShmupPlayerDrawContext(world, entity);
    if (!pCtx || pCtx.shouldBlink) return;

    const { invulnerable, time, size, primaryColor, moveX, isShooting } = pCtx;

    ctx.save();

    // Invulnerability shield aura
    if (invulnerable) {
      ctx.save();
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.primary;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 16;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating shield notches
      ctx.rotate(time * 3);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.35, (i * Math.PI * 2) / 3, (i * Math.PI * 2) / 3 + 0.4);
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Outer Energy Separation Halo (Ensures player ship pops over bright clouds/islands)
    ctx.save();
    ctx.strokeStyle = "rgba(0, 20, 40, 0.6)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.primary;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 10;
    ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Banking tilt based on horizontal movement
    const bankAngle = moveX * 0.22; // ~12.5 degrees tilt
    ctx.rotate(bankAngle);

    // Twin Engine Thruster Plumes
    const flicker = 0.85 + 0.28 * Math.sin(time * 36);
    const plumeLength = size * 0.95 * flicker;

    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = SHMUP_COLOR_TOKENS.player.secondary;

    // Left Engine Plume
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.secondary;
    ctx.beginPath();
    ctx.moveTo(-size * 0.35, size * 0.45);
    ctx.lineTo(-size * 0.15, size * 0.45);
    ctx.lineTo(-size * 0.25, size * 0.45 + plumeLength);
    ctx.closePath();
    ctx.fill();

    // Right Engine Plume
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.45);
    ctx.lineTo(size * 0.35, size * 0.45);
    ctx.lineTo(size * 0.25, size * 0.45 + plumeLength);
    ctx.closePath();
    ctx.fill();

    // Core Plumes (White hot center)
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.45);
    ctx.lineTo(-size * 0.2, size * 0.45);
    ctx.lineTo(-size * 0.25, size * 0.45 + plumeLength * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.45);
    ctx.lineTo(size * 0.3, size * 0.45);
    ctx.lineTo(size * 0.25, size * 0.45 + plumeLength * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Main Fighter Jet Hull (Fantasía tecnológica anime)
    ctx.save();
    ctx.fillStyle = primaryColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = primaryColor;

    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);                   // Nose tip
    ctx.lineTo(size * 0.25, -size * 0.4);         // Nose shoulder
    ctx.lineTo(size * 1.05, size * 0.4);          // Wing tip right
    ctx.lineTo(size * 0.82, size * 0.72);         // Wing trailing edge right
    ctx.lineTo(size * 0.42, size * 0.45);         // Intake notch right
    ctx.lineTo(size * 0.22, size * 0.65);         // Engine right
    ctx.lineTo(0, size * 0.5);                    // Tail center
    ctx.lineTo(-size * 0.22, size * 0.65);        // Engine left
    ctx.lineTo(-size * 0.42, size * 0.45);        // Intake notch left
    ctx.lineTo(-size * 0.82, size * 0.72);        // Wing trailing edge left
    ctx.lineTo(-size * 1.05, size * 0.4);         // Wing tip left
    ctx.lineTo(-size * 0.25, -size * 0.4);        // Nose shoulder
    ctx.closePath();
    ctx.fill();

    // Inner Armor Panel Accent Lines
    ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.85);
    ctx.lineTo(size * 0.75, size * 0.38);
    ctx.moveTo(0, -size * 0.85);
    ctx.lineTo(-size * 0.75, size * 0.38);
    ctx.stroke();

    // Cockpit Glass Canopy
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.shadowBlur = 8;
    ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.15, size * 0.2, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cannon Muzzle Flashes when shooting
    if (isShooting) {
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.shadowBlur = 12;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;

      // Right wing cannon flash
      ctx.beginPath();
      ctx.arc(size * 0.85, -size * 0.05, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Left wing cannon flash
      ctx.beginPath();
      ctx.arc(-size * 0.85, -size * 0.05, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }
};

export const drawShmupEnemy: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const eCtx = resolveShmupEnemyDrawContext(world, entity);
    if (!eCtx) return;

    const { size, enemyColor, time, archetype, isTelegraphing } = eCtx;

    ctx.save();

    // Attack Telegraph Warning Ring
    if (isTelegraphing) {
      ctx.save();
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.warning;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.shadowBlur = 14;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.warning;
      const pulse = 1.12 + 0.18 * Math.sin(time * 25);
      ctx.beginPath();
      ctx.arc(0, 0, size * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = enemyColor;

    if (archetype === "scout") {
      // Angular fast scout (dagger wings, forward sensors)
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.primary;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.1);
      ctx.lineTo(size * 0.9, -size * 0.25);
      ctx.lineTo(size * 0.4, -size * 0.85);
      ctx.lineTo(0, -size * 0.5);
      ctx.lineTo(-size * 0.4, -size * 0.85);
      ctx.lineTo(-size * 0.9, -size * 0.25);
      ctx.closePath();
      ctx.fill();

      // Cyan wingtip sensor nodes
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.primary;
      ctx.beginPath();
      ctx.arc(size * 0.8, -size * 0.2, 3.5, 0, Math.PI * 2);
      ctx.arc(-size * 0.8, -size * 0.2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Magenta core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else if (archetype === "interceptor") {
      // Aggressive narrow long-nose interceptor
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.primary;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.25);                  // Sharp nose
      ctx.lineTo(size * 0.7, -size * 0.45);
      ctx.lineTo(size * 0.2, -size * 0.85);
      ctx.lineTo(0, -size * 0.6);
      ctx.lineTo(-size * 0.2, -size * 0.85);
      ctx.lineTo(-size * 0.7, -size * 0.45);
      ctx.closePath();
      ctx.fill();

      // Magenta wing accent lines
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(size * 0.55, -size * 0.3);
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(-size * 0.55, -size * 0.3);
      ctx.stroke();

      // Core eye
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.beginPath();
      ctx.arc(0, -size * 0.1, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else if (archetype === "armored") {
      // Broad heavy armor gunner with slate plates
      ctx.fillStyle = SHMUP_COLOR_TOKENS.architecture;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.95);
      ctx.lineTo(size * 1.15, size * 0.25);
      ctx.lineTo(size * 0.85, -size * 0.85);
      ctx.lineTo(-size * 0.85, -size * 0.85);
      ctx.lineTo(-size * 1.15, size * 0.25);
      ctx.closePath();
      ctx.fill();

      // Heavy armor trim
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.enemy.primary;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Golden weak spot core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.shadowBlur = 14;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
      ctx.fill();

    } else if (archetype === "support") {
      // Mage / Support unit with orbiting magic ring
      ctx.save();
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      // Orbital nodes
      const orbAngle = time * 2.5;
      for (let i = 0; i < 3; i++) {
        const angle = orbAngle + (i * Math.PI * 2) / 3;
        const ox = Math.cos(angle) * size * 0.95;
        const oy = Math.sin(angle) * size * 0.95;
        ctx.fillStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
        ctx.beginPath();
        ctx.arc(ox, oy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.primary;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Boss entity
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.primary;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.15);
      ctx.lineTo(size * 1.25, -size * 0.35);
      ctx.lineTo(size * 0.7, -size * 1.0);
      ctx.lineTo(-size * 0.7, -size * 1.0);
      ctx.lineTo(-size * 1.25, -size * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = SHMUP_COLOR_TOKENS.architecture;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Gold vulnerable core with pulse
      const corePulse = 0.85 + 0.3 * Math.sin(time * 10);
      ctx.fillStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.shadowBlur = 20;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.42 * corePulse, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawShmupPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const bCtx = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_COLOR_TOKENS.player.primary);
    if (!bCtx) return;
    const { size, color } = bCtx;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;

    // Outer plasma aura
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.75, -size * 2.5, size * 1.5, size * 5);

    // Crisp white core laser beam
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.fillRect(-size * 0.35, -size * 2, size * 0.7, size * 4);

    ctx.restore();
  }
};

export const drawShmupEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const bCtx = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_COLOR_TOKENS.bullet.warm);
    if (!bCtx) return;
    const { size, color, kind } = bCtx;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    // Outer High-Contrast Dark Rim for visibility on bright clouds
    ctx.strokeStyle = SHMUP_COLOR_TOKENS.enemy.primary;
    ctx.lineWidth = 1.8;

    if (kind === "hot") {
      // Fast Dart / Teardrop shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.8);                   // Nose tip
      ctx.lineTo(size * 0.7, -size * 1.0);
      ctx.lineTo(0, -size * 1.8);                  // Tail
      ctx.lineTo(-size * 0.7, -size * 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
      ctx.fill();

    } else if (kind === "special") {
      // Heavy Orb with electric magenta aura
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crisp white core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Basic Coral Orb
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawShmupStarfield: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, biome, clouds, islands, particles } = computeShmupParallaxWorld(world);

    ctx.save();

    // Layer 1: Sky Gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, biome.skyTop);
    skyGradient.addColorStop(0.55, biome.skyMid);
    skyGradient.addColorStop(1, biome.skyLight);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // Layer 2: Volumetric Drifting Clouds (Multi-lobe bumps with shadow base)
    for (const cloud of clouds) {
      ctx.save();
      // Cloud shadow base
      ctx.fillStyle = biome.cloudShadow;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y + cloud.ry * 0.2, cloud.rx * 1.1, cloud.ry * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Multi-lobe volumetric cloud bumps
      ctx.fillStyle = biome.cloudLight;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(cloud.x - cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, 0, Math.PI * 2);
      ctx.arc(cloud.x, cloud.y - cloud.ry * 0.25, cloud.ry * 0.95, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Layer 3: Floating Islands & Architectural Ruins
    for (const island of islands) {
      ctx.save();
      ctx.globalAlpha = 0.88;

      // Island dark rock base
      ctx.fillStyle = SHMUP_COLOR_TOKENS.architecture;
      ctx.beginPath();
      ctx.roundRect(island.x, island.y + island.height * 0.3, island.width, island.height * 0.7, 12);
      ctx.fill();

      // Island foliage cap
      ctx.fillStyle = island.color;
      ctx.beginPath();
      ctx.roundRect(island.x - 4, island.y, island.width + 8, island.height * 0.55, 14);
      ctx.fill();

      // Temple Arch / Columns
      if (island.hasArch) {
        ctx.fillStyle = biome.architectureColor;
        ctx.fillRect(island.x + island.width * 0.32, island.y - 18, 10, 18);
        ctx.fillRect(island.x + island.width * 0.62, island.y - 18, 10, 18);
        ctx.fillRect(island.x + island.width * 0.26, island.y - 24, island.width * 0.5, 7);

        // Temple gold emblem
        ctx.fillStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
        ctx.beginPath();
        ctx.arc(island.x + island.width * 0.5, island.y - 12, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Soft Smooth Vignette Overlay (Dims outer edges without harsh vertical lines)
    ctx.save();
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(11, 21, 40, 0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Layer 4: Near Decor Particles (capped <= 15)
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === "petal") {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "crystal") {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }
};
