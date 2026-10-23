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

    // Invulnerability shield aura / alpha oscillation
    if (invulnerable) {
      ctx.save();
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.primary;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 16;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Outer Energy Separation Halo (Golden Rule validation: ensures ship pops on bright clouds)
    ctx.save();
    ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.primary;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Banking tilt based on horizontal movement
    const bankAngle = moveX * 0.22; // ~12.5 degrees tilt
    ctx.rotate(bankAngle);

    // Thruster Plume
    const flicker = 0.85 + 0.3 * Math.sin(time * 32);
    const plumeLength = size * 0.95 * flicker;

    ctx.save();
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.secondary;
    ctx.shadowBlur = 14;
    ctx.shadowColor = SHMUP_COLOR_TOKENS.player.secondary;
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.5);
    ctx.lineTo(size * 0.25, size * 0.5);
    ctx.lineTo(0, size * 0.5 + plumeLength);
    ctx.closePath();
    ctx.fill();

    // Thruster Core
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.beginPath();
    ctx.moveTo(-size * 0.14, size * 0.5);
    ctx.lineTo(size * 0.14, size * 0.5);
    ctx.lineTo(0, size * 0.5 + plumeLength * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Main Fighter Jet Hull (Fantasía tecnológica anime)
    ctx.save();
    ctx.fillStyle = primaryColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = primaryColor;

    ctx.beginPath();
    ctx.moveTo(0, -size * 1.15);                  // Nose
    ctx.lineTo(size * 0.95, size * 0.75);         // Right wing tip
    ctx.lineTo(size * 0.42, size * 0.48);         // Right notch
    ctx.lineTo(0, size * 0.68);                   // Tail center
    ctx.lineTo(-size * 0.42, size * 0.48);        // Left notch
    ctx.lineTo(-size * 0.95, size * 0.75);        // Left wing tip
    ctx.closePath();
    ctx.fill();

    // Inner Armor Panel Accent Lines
    ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.75);
    ctx.lineTo(size * 0.65, size * 0.5);
    ctx.moveTo(0, -size * 0.75);
    ctx.lineTo(-size * 0.65, size * 0.5);
    ctx.stroke();

    // Cockpit Glass Canopy
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.shadowBlur = 8;
    ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size * 0.22, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle Flash Effect at Wing Cannon Mouths when firing
    if (isShooting) {
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.shadowBlur = 12;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;

      // Right cannon flash
      ctx.beginPath();
      ctx.arc(size * 0.7, -size * 0.1, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Left cannon flash
      ctx.beginPath();
      ctx.arc(-size * 0.7, -size * 0.1, 4.5, 0, Math.PI * 2);
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
      const pulse = 1.1 + 0.2 * Math.sin(time * 25);
      ctx.beginPath();
      ctx.arc(0, 0, size * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = enemyColor;

    if (archetype === "scout") {
      // Angular fast scout
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.primary;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.1);
      ctx.lineTo(size * 0.85, -size * 0.3);
      ctx.lineTo(size * 0.35, -size * 0.85);
      ctx.lineTo(0, -size * 0.5);
      ctx.lineTo(-size * 0.35, -size * 0.85);
      ctx.lineTo(-size * 0.85, -size * 0.3);
      ctx.closePath();
      ctx.fill();

      // Cyan accent wingtips
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.primary;
      ctx.beginPath();
      ctx.arc(size * 0.75, -size * 0.25, 3.5, 0, Math.PI * 2);
      ctx.arc(-size * 0.75, -size * 0.25, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
      ctx.fill();

    } else if (archetype === "interceptor") {
      // Aggressive narrow long nose interceptor
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.primary;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.25);                  // Long sharp nose
      ctx.lineTo(size * 0.65, -size * 0.5);
      ctx.lineTo(0, -size * 0.9);
      ctx.lineTo(-size * 0.65, -size * 0.5);
      ctx.closePath();
      ctx.fill();

      // Magenta wing accent lines
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(size * 0.5, -size * 0.3);
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(-size * 0.5, -size * 0.3);
      ctx.stroke();

      // Core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.beginPath();
      ctx.arc(0, -size * 0.1, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else if (archetype === "armored") {
      // Broad heavy armor gunner
      ctx.fillStyle = SHMUP_COLOR_TOKENS.architecture;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.9);
      ctx.lineTo(size * 1.1, size * 0.3);
      ctx.lineTo(size * 0.9, -size * 0.8);
      ctx.lineTo(-size * 0.9, -size * 0.8);
      ctx.lineTo(-size * 1.1, size * 0.3);
      ctx.closePath();
      ctx.fill();

      // Golden weak spot core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.shadowBlur = 12;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
      ctx.fill();

    } else if (archetype === "support") {
      // Mage / Support unit with floating orbital magic ring
      ctx.save();
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.enemy.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.95, 0, Math.PI * 2);
      ctx.stroke();
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
      ctx.moveTo(0, size * 1.1);
      ctx.lineTo(size * 1.2, -size * 0.4);
      ctx.lineTo(size * 0.6, -size * 1.0);
      ctx.lineTo(-size * 0.6, -size * 1.0);
      ctx.lineTo(-size * 1.2, -size * 0.4);
      ctx.closePath();
      ctx.fill();

      // Gold vulnerable core
      const corePulse = 0.85 + 0.3 * Math.sin(time * 10);
      ctx.fillStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.shadowBlur = 18;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.gold.sunlight;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4 * corePulse, 0, Math.PI * 2);
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

    if (kind === "hot") {
      // Fast Dart / Teardrop shape with short tail
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.8);                   // Nose tip pointing down
      ctx.lineTo(size * 0.7, -size * 1.0);
      ctx.lineTo(0, -size * 1.8);                  // Tail tip
      ctx.lineTo(-size * 0.7, -size * 1.0);
      ctx.closePath();
      ctx.fill();

      // White core
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
      ctx.fill();

    } else if (kind === "special") {
      // Heavy Orb with warm aura halo
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
      ctx.fill();

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
    skyGradient.addColorStop(0.5, biome.skyMid);
    skyGradient.addColorStop(1, biome.skyLight);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // Layer 2: Atmospheric Volumetric Clouds
    for (const cloud of clouds) {
      ctx.fillStyle = cloud.color;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.rx, cloud.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Layer 3: Floating Islands & Ruins
    ctx.globalAlpha = 0.85;
    for (const island of islands) {
      ctx.fillStyle = island.color;
      ctx.beginPath();
      ctx.roundRect(island.x, island.y, island.width, island.height, 16);
      ctx.fill();

      if (island.hasArch) {
        ctx.fillStyle = biome.architectureColor;
        ctx.fillRect(island.x + island.width * 0.35, island.y - 18, 14, 18);
        ctx.fillRect(island.x + island.width * 0.6, island.y - 18, 14, 18);
        ctx.fillRect(island.x + island.width * 0.3, island.y - 24, island.width * 0.45, 8);
      }
    }

    // Central Mist Overlay (Contraste dinámico: lowers background saturation/contrast behind combat area)
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = SHMUP_COLOR_TOKENS.sky.mid;
    ctx.fillRect(width * 0.15, 0, width * 0.7, height);

    // Layer 4: Near Decor Particles (capped <= 15)
    for (const p of particles) {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.save();
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

    // Layer 7: Non-Intrusive Fixed Upper HUD Banner (Score, Lives, Biome Name)
    const state = world.getSingleton("ShmupGameState");
    if (state) {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = SHMUP_COLOR_TOKENS.architecture;
      ctx.fillRect(0, 0, width, 48);

      ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 48);
      ctx.lineTo(width, 48);
      ctx.stroke();

      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = SHMUP_COLOR_TOKENS.ui.primary;
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${state.score.toString().padStart(6, "0")}`, 20, 30);

      ctx.textAlign = "center";
      ctx.fillText(`WAVE ${state.wave} - ${biome.name.toUpperCase()}`, width / 2, 30);

      ctx.textAlign = "right";
      ctx.fillText(`LIVES: ${state.lives}`, width - 20, 30);
    }

    ctx.restore();
  }
};
