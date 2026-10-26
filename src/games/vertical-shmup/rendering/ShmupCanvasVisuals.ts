import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SHMUP_COLOR_TOKENS } from "./ShmupColorTokens";
import { SHMUP_SUMI_E_THEME } from "./ShmupVisualHelpers";
import { drawSumiECanvasBackdrop } from "./SumiECanvasBackdrop";
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

    // Fine cyan exhaust filaments add a sense of thrust without obscuring bullets.
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(time * 22));
    ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.primary;
    ctx.lineWidth = Math.max(1, size * 0.055);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.78);
    ctx.lineTo(-size * 0.25, size * 0.78 + plumeLength * 0.58);
    ctx.moveTo(size * 0.25, size * 0.78);
    ctx.lineTo(size * 0.25, size * 0.78 + plumeLength * 0.58);
    ctx.stroke();
    ctx.restore();

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

    // Twin recessed engine housings connect the hull visually to its exhaust plumes.
    ctx.save();
    ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.secondary;
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.fillStyle = "rgba(5, 24, 52, 0.92)";
      ctx.beginPath();
      ctx.ellipse(side * size * 0.24, size * 0.48, size * 0.085, size * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.beginPath();
      ctx.arc(side * size * 0.24, size * 0.48, size * 0.026, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Layered wing armor: dark insets and luminous feather panels give the fighter
    // a more deliberate anime-mecha silhouette without changing its hitbox.
    ctx.fillStyle = "rgba(5, 24, 52, 0.72)";
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, -size * 0.28);
    ctx.lineTo(-size * 0.88, size * 0.37);
    ctx.lineTo(-size * 0.7, size * 0.53);
    ctx.lineTo(-size * 0.38, size * 0.31);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.28, -size * 0.28);
    ctx.lineTo(size * 0.88, size * 0.37);
    ctx.lineTo(size * 0.7, size * 0.53);
    ctx.lineTo(size * 0.38, size * 0.31);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, size * 0.08);
    ctx.lineTo(-size * 0.82, size * 0.36);
    ctx.moveTo(size * 0.5, size * 0.08);
    ctx.lineTo(size * 0.82, size * 0.36);
    ctx.stroke();

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

    // Canopy highlight and central crest make the nose readable at small scale.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.06, -size * 0.48);
    ctx.lineTo(size * 0.04, -size * 0.24);
    ctx.stroke();

    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.secondary;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.92);
    ctx.lineTo(size * 0.09, -size * 0.66);
    ctx.lineTo(0, -size * 0.56);
    ctx.lineTo(-size * 0.09, -size * 0.66);
    ctx.closePath();
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

    // Boss presentation: a slow celestial seal gives the encounter a distinct silhouette.
    if (archetype === "boss") {
      ctx.save();
      const pulse = 1 + 0.035 * Math.sin(time * 2.4);
      const orbitRadius = size * 1.34 * pulse;
      ctx.strokeStyle = "rgba(255, 209, 102, 0.32)";
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.17, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 209, 102, 0.78)";
      ctx.lineWidth = Math.max(2, size * 0.045);
      for (let index = 0; index < 4; index += 1) {
        const startAngle = time * 0.42 + index * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(0, 0, orbitRadius, startAngle, startAngle + Math.PI * 0.22);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(242, 93, 187, 0.48)";
      ctx.lineWidth = Math.max(1.5, size * 0.025);
      ctx.beginPath();
      ctx.arc(0, 0, size * (1.02 + 0.025 * Math.sin(time * 1.8)), -time * 0.3, -time * 0.3 + Math.PI * 1.15);
      ctx.stroke();
      ctx.restore();
    }

    // Animated rear thrusters reinforce each fighter's direction and silhouette.
    // These are purely decorative and sit behind the hull; the hitbox is unchanged.
    if (archetype !== "support") {
      ctx.save();
      const plumePulse = 0.82 + 0.18 * Math.sin(time * (archetype === "interceptor" ? 34 : 22));
      const engineOffset = archetype === "armored" ? 0.46 : archetype === "boss" ? 0.42 : 0.23;
      const engineAnchorY = archetype === "boss" ? -0.72 : archetype === "armored" ? -0.64 : -0.55;
      const plumeLength = size * (0.34 + plumePulse * 0.3);
      const plumeWidth = archetype === "boss" ? 0.15 : 0.09;
      ctx.globalAlpha = 0.78;
      ctx.shadowBlur = size * 0.25;
      ctx.shadowColor = archetype === "armored" ? SHMUP_COLOR_TOKENS.gold.sunlight : (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
      ctx.fillStyle = archetype === "armored" ? SHMUP_COLOR_TOKENS.warning : (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);

      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * (engineOffset - plumeWidth) * size, engineAnchorY * size);
        ctx.lineTo(side * (engineOffset + plumeWidth) * size, engineAnchorY * size);
        ctx.lineTo(side * engineOffset * size, engineAnchorY * size - plumeLength);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
        ctx.beginPath();
        ctx.moveTo(side * (engineOffset - plumeWidth * 0.3) * size, engineAnchorY * size);
        ctx.lineTo(side * (engineOffset + plumeWidth * 0.3) * size, engineAnchorY * size);
        ctx.lineTo(side * engineOffset * size, engineAnchorY * size - plumeLength * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = archetype === "armored" ? SHMUP_COLOR_TOKENS.warning : (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
      }
      ctx.restore();
    }

    if (archetype === "scout") {
      // Angular fast scout (dagger wings, forward sensors)
      ctx.fillStyle = enemyColor;
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
      ctx.fillStyle = (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else if (archetype === "interceptor") {
      // Aggressive narrow long-nose interceptor
      ctx.fillStyle = enemyColor;
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
      ctx.strokeStyle = (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(size * 0.55, -size * 0.3);
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(-size * 0.55, -size * 0.3);
      ctx.stroke();

      // Core eye
      ctx.fillStyle = (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
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
      ctx.strokeStyle = enemyColor;
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
      ctx.strokeStyle = (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
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

      ctx.fillStyle = enemyColor;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Boss entity
      ctx.fillStyle = enemyColor;
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

    // Brief white/cyan impact ring and rays while an enemy hit flash is active.
    const hitFlash = Math.max(0, Math.min(1, (eCtx.render.hitFlashFrames ?? 0) / 5));
    if (hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = hitFlash * 0.9;
      ctx.strokeStyle = SHMUP_COLOR_TOKENS.player.core;
      ctx.lineWidth = 1.5 + hitFlash * 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = SHMUP_COLOR_TOKENS.player.primary;
      ctx.beginPath();
      ctx.arc(0, 0, size * (1.02 + hitFlash * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i += 1) {
        const angle = time * 1.8 + i * Math.PI / 2;
        const innerRadius = size * 0.72;
        const outerRadius = size * (1.05 + hitFlash * 0.25);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
        ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        ctx.stroke();
      }
      ctx.restore();
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

    // Moving pulse gives the laser a bright core and a softer separation halo.
    const time = world.tick * 0.016;
    const pulse = 0.9 + 0.1 * Math.sin(time * 26);
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-size * 0.95, -size * 3, size * 1.9, size * 6, size * 0.95);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-size * 0.62, -size * 2.5, size * 1.24, size * 5, size * 0.62);
    ctx.fill();

    // Crisp white core and pointed leading edge.
    ctx.fillStyle = SHMUP_COLOR_TOKENS.player.core;
    ctx.beginPath();
    ctx.roundRect(-size * 0.23, -size * 2.12, size * 0.46, size * 4.2 * pulse, size * 0.23);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -size * 2.8);
    ctx.lineTo(size * 0.35, -size * 1.9);
    ctx.lineTo(-size * 0.35, -size * 1.9);
    ctx.closePath();
    ctx.fill();

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

function colorWithAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return color;
  const value = match[1] ?? "000000";
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function blendHex(from: string, to: string, amount: number): string {
  const parse = (color: string, offset: number): number => Number.parseInt(color.slice(offset, offset + 2), 16);
  const t = Math.max(0, Math.min(1, amount));
  const channels = [1, 3, 5].map(offset => Math.round(
    parse(from, offset) + (parse(to, offset) - parse(from, offset)) * t
  ));
  return `#${channels.map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
}

export const drawShmupStarfield: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    if (world.getResource<string>("ShmupVisualTheme") === "sumi-e") {
      drawSumiECanvasBackdrop.draw(ctx, world);
      return;
    }
    const { width, height, time, biome, clouds, islands, particles } = computeShmupParallaxWorld(world);
    ctx.save();

    // Layer 1: atmospheric sky and biome-specific light source.
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, biome.skyTop);
    skyGradient.addColorStop(0.55, biome.skyMid);
    skyGradient.addColorStop(1, biome.skyLight);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    const glowX = width * biome.glowX;
    const glowY = height * biome.glowY;
    const glowRadius = Math.min(width, height) * biome.glowRadius;
    const atmosphereGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
    atmosphereGlow.addColorStop(0, colorWithAlpha(biome.glowColor, biome.atmosphereStyle === "storm" ? 0.24 : 0.3));
    atmosphereGlow.addColorStop(1, colorWithAlpha(biome.glowColor, 0));
    ctx.fillStyle = atmosphereGlow;
    ctx.fillRect(0, 0, width, height);

    if (biome.atmosphereStyle === "sunrise") {
      ctx.save();
      ctx.strokeStyle = colorWithAlpha(SHMUP_COLOR_TOKENS.gold.sunlight, 0.13);
      ctx.lineWidth = Math.max(2, width * 0.004);
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(glowX, glowY + height * 0.04);
        ctx.lineTo(glowX + i * width * 0.19, height);
        ctx.stroke();
      }
      ctx.restore();
    } else if (biome.atmosphereStyle === "garden" || biome.atmosphereStyle === "sacred") {
      ctx.save();
      const rayColor = biome.rayColor;
      ctx.strokeStyle = colorWithAlpha(rayColor, biome.atmosphereStyle === "garden" ? 0.09 : 0.12);
      ctx.lineWidth = width * 0.018;
      for (let i = 0; i < 7; i += 1) {
        const rayX = width * (0.08 + i * 0.14) + Math.sin(time * 0.18 + i) * width * 0.025;
        ctx.beginPath();
        ctx.moveTo(rayX - width * 0.035, 0);
        ctx.lineTo(rayX + width * 0.07, height);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // A short, deterministic lightning pulse: visual-only, no gameplay RNG.
      const pulse = Math.max(0, Math.sin(time * 1.35)) ** 8;
      if (pulse > 0.015) {
        const boltX = width * (0.58 + 0.16 * Math.sin(time * 0.23));
        ctx.save();
        ctx.strokeStyle = colorWithAlpha(biome.lightningColor, 0.18 + pulse * 0.62);
        ctx.lineWidth = 2 + pulse * 3;
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = biome.glowColor;
        ctx.beginPath();
        ctx.moveTo(boltX, 0);
        ctx.lineTo(boltX - width * 0.045, height * 0.12);
        ctx.lineTo(boltX + width * 0.018, height * 0.19);
        ctx.lineTo(boltX - width * 0.08, height * 0.34);
        ctx.lineTo(boltX - width * 0.025, height * 0.41);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(boltX - width * 0.01, height * 0.2);
        ctx.lineTo(boltX + width * 0.09, height * 0.29);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Layer 2: drifting clouds. The same profile controls opacity in both renderers.
    for (const cloud of clouds) {
      ctx.save();
      ctx.fillStyle = biome.cloudShadow;
      ctx.globalAlpha = biome.cloudOpacity * 0.62;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y + cloud.ry * 0.2, cloud.rx * 1.1, cloud.ry * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = biome.cloudLight;
      ctx.globalAlpha = biome.cloudOpacity;
      ctx.beginPath();
      ctx.arc(cloud.x - cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, 0, Math.PI * 2);
      ctx.arc(cloud.x, cloud.y - cloud.ry * 0.25, cloud.ry * 0.95, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Layer 3: biome-specific floating landforms and silhouettes.
    for (const island of islands) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      if (biome.islandStyle === "crystal") {
        ctx.fillStyle = biome.crystalShadowColor;
        ctx.beginPath();
        ctx.moveTo(island.x, island.y + island.height * 0.24);
        ctx.lineTo(island.x + island.width * 0.18, island.y + island.height * 0.58);
        ctx.lineTo(island.x + island.width * 0.38, island.y + island.height);
        ctx.lineTo(island.x + island.width * 0.72, island.y + island.height * 0.68);
        ctx.lineTo(island.x + island.width, island.y + island.height * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = colorWithAlpha(biome.crystalEdgeColor, 0.7);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = colorWithAlpha(biome.glowColor, 0.72);
        ctx.beginPath();
        ctx.moveTo(island.x + island.width * 0.28, island.y + island.height * 0.42);
        ctx.lineTo(island.x + island.width * 0.38, island.y - island.height * 0.12);
        ctx.lineTo(island.x + island.width * 0.48, island.y + island.height * 0.42);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = biome.architectureColor;
        ctx.beginPath();
        ctx.roundRect(island.x, island.y + island.height * 0.3, island.width, island.height * 0.7, 12);
        ctx.fill();

        ctx.fillStyle = island.color;
        ctx.beginPath();
        ctx.roundRect(island.x - 4, island.y, island.width + 8, island.height * 0.55, 14);
        ctx.fill();

        if (biome.islandStyle === "lush") {
          for (let tree = 0; tree < 3; tree += 1) {
            const treeX = island.x + island.width * (0.22 + tree * 0.28);
            const treeY = island.y + island.height * (0.12 + (tree % 2) * 0.05);
            ctx.fillStyle = tree % 2 === 0 ? SHMUP_COLOR_TOKENS.foliage.deep : SHMUP_COLOR_TOKENS.foliage.mid;
            ctx.beginPath();
            ctx.arc(treeX, treeY, island.height * 0.16, 0, Math.PI * 2);
            ctx.fill();
            if (biome.atmosphereStyle === "garden") {
              ctx.fillStyle = SHMUP_COLOR_TOKENS.blossom;
              ctx.beginPath();
              ctx.arc(treeX + island.height * 0.07, treeY - island.height * 0.04, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        if (island.hasArch || biome.islandStyle === "ruins") {
          ctx.fillStyle = biome.architectureColor;
          const columnWidth = Math.max(6, island.width * 0.075);
          const columnTop = island.y - island.height * 0.28;
          ctx.fillRect(island.x + island.width * 0.3, columnTop, columnWidth, island.height * 0.3);
          ctx.fillRect(island.x + island.width * 0.62, columnTop, columnWidth, island.height * 0.3);
          ctx.fillRect(island.x + island.width * 0.24, columnTop - 5, island.width * 0.52, Math.max(6, island.height * 0.09));
          ctx.fillStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
          ctx.beginPath();
          ctx.arc(island.x + island.width * 0.5, columnTop + island.height * 0.03, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Low-cost edge vignette keeps projectiles and the player readable.
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.32,
      width / 2, height / 2, Math.max(width, height) * 0.76
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, biome.atmosphereStyle === "storm" ? "rgba(3, 10, 24, 0.58)" : "rgba(11, 21, 40, 0.36)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Layer 4: small foreground particles retain their biome-specific silhouette.
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      if (particle.type === "petal") {
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size, particle.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.type === "crystal" || particle.type === "rune") {
        ctx.beginPath();
        ctx.moveTo(0, -particle.size);
        ctx.lineTo(particle.size * 0.65, 0);
        ctx.lineTo(0, particle.size);
        ctx.lineTo(-particle.size * 0.65, 0);
        ctx.closePath();
        ctx.fill();
        if (particle.type === "rune") {
          ctx.strokeStyle = SHMUP_COLOR_TOKENS.gold.sunlight;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }
};
