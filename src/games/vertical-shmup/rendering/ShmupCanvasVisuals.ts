import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SOLAR_GARDEN_PALETTE } from "../../shared/rendering/SolarGardenPalette";
import { drawSolarLeafWing, drawBiomechanicalChitin, drawThreatProjectile } from "../../shared/rendering/SolarGardenMotifs";
import { SOLAR_GARDEN_THEME } from "../../../theme/solarGardenTheme";
import { SOLAR_GARDEN_DEBUG_FLAGS } from "../../../theme/solarGardenDebug";
import { drawDualShellBullet, drawBiomechanicalEye } from "../../shared/rendering/SolarGardenVisuals";

export const PARALLAX_CONFIG = [
  { id: "sky_sun", speedRatio: 0.05, alpha: 1, blur: 0 },
  { id: "far_structures", speedRatio: 0.15, alpha: 0.35, blur: 2 },
  { id: "solar_forest", speedRatio: 0.35, alpha: 0.5, blur: 1 },
  { id: "architecture", speedRatio: 0.6, alpha: 0.7, blur: 0 },
  { id: "gameplay_layer", speedRatio: 1, alpha: 1, blur: 0 },
  { id: "foreground_vfx", speedRatio: 1.25, alpha: 0.25, blur: 0 },
] as const;

/**
 * 6-Layer Solar Garden Parallax Background Drawer
 */
export const drawSolarParallaxBackground: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    if (!SOLAR_GARDEN_DEBUG_FLAGS.parallax) return;

    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") ?? { width: 480, height: 800 };
    const width = screen.width;
    const height = screen.height;
    const elapsed = world.tick * 0.016;

    ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
    ctx.fillRect(0, 0, width, height);

    const sunGrad = ctx.createRadialGradient(width * 0.5, height * 0.25, 10, width * 0.5, height * 0.25, 120);
    sunGrad.addColorStop(0, "rgba(240, 244, 248, 0.9)");
    sunGrad.addColorStop(0.3, "rgba(230, 184, 0, 0.6)");
    sunGrad.addColorStop(1, "rgba(230, 184, 0, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.25, 120, 0, Math.PI * 2);
    ctx.fill();

    const offsetFar = (elapsed * 20) % height;
    ctx.fillStyle = "rgba(45, 69, 52, 0.35)";
    for (let i = 0; i < 4; i++) {
      const px = i * 130 + 20;
      const py = ((i * 180 + offsetFar) % (height + 200)) - 100;
      ctx.fillRect(px, py, 45, 120);
      ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, 45, 120);
    }

    const offsetForest = (elapsed * 50) % height;
    ctx.fillStyle = "rgba(45, 69, 52, 0.5)";
    for (let i = 0; i < 6; i++) {
      const px = i * 90 + 15;
      const py = ((i * 120 + offsetForest) % (height + 150)) - 50;
      ctx.beginPath();
      ctx.arc(px, py, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    const offsetArch = (elapsed * 80) % height;
    ctx.strokeStyle = "rgba(240, 244, 248, 0.25)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      const lineY = (x * 2 + offsetArch) % height;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + 30, lineY + 30);
      ctx.stroke();
    }
  }
};

/**
 * Solar Purification Wave Effect Drawer
 */
export const drawSolarPurificationWave: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    const waveResource = world.getResource<{ active: boolean; elapsed: number }>("PurificationWaveState");
    if (!waveResource || !waveResource.active) return;

    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") ?? { width: 480, height: 800 };
    const width = screen.width;
    const height = screen.height;
    const elapsed = waveResource.elapsed;

    if (elapsed <= 0.15) {
      const desatAlpha = (elapsed / 0.15) * 0.4;
      ctx.fillStyle = `rgba(180, 190, 200, ${desatAlpha.toFixed(2)})`;
      ctx.fillRect(0, 0, width, height);
    }

    if (elapsed > 0.05 && elapsed <= 0.75) {
      const ringProgress = (elapsed - 0.05) / 0.7;
      const ringY = height * (1.1 - ringProgress * 1.2);

      ctx.save();
      const waveGrad = ctx.createLinearGradient(0, ringY - 40, 0, ringY + 40);
      waveGrad.addColorStop(0, "rgba(0, 225, 255, 0)");
      waveGrad.addColorStop(0.5, SOLAR_GARDEN_THEME.SOLAR_GOLD);
      waveGrad.addColorStop(0.8, SOLAR_GARDEN_THEME.SOLAR_WHITE);
      waveGrad.addColorStop(1, "rgba(0, 225, 255, 0)");

      ctx.fillStyle = waveGrad;
      ctx.fillRect(0, ringY - 40, width, 80);

      const sparkCount = 12;
      for (let i = 0; i < sparkCount; i++) {
        const sx = (i * 43) % width;
        const sy = ringY + (i % 3) * 15;
        ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
        ctx.fillRect(sx, sy, 3, 3);
      }
      ctx.restore();
    }
  }
};

/**
 * Vertical Shmup Player — Cenit-01
 */
export const drawShmupPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 20;

    ctx.save();

    drawSolarLeafWing(ctx, size * 1.3, size * 0.6, Math.PI * 0.25);
    drawSolarLeafWing(ctx, size * 1.3, size * 0.6, -Math.PI * 0.25);

    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.lineWidth = 2;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, -size * 1.1);
    ctx.lineTo(size * 0.45, size * 0.6);
    ctx.lineTo(0, size * 0.35);
    ctx.lineTo(-size * 0.45, size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarCyan;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarCyan;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Biomechanical Garden Fauna Enemy
 */
export const drawShmupEnemy: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size ?? 20;

    const pathComp = world.getComponent(entity, "EnemyPath");
    const kind = pathComp?.kind ?? "straight";

    ctx.save();

    if (kind === "arc" || size > 25) {
      ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
      ctx.strokeStyle = SOLAR_GARDEN_THEME.THREAT_ORANGE;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(size * 0.9, size * 0.2);
      ctx.lineTo(size * 0.7, -size * 0.8);
      ctx.lineTo(-size * 0.7, -size * 0.8);
      ctx.lineTo(-size * 0.9, size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = SOLAR_GARDEN_THEME.THREAT_ORANGE;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "sine") {
      ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
      ctx.strokeStyle = SOLAR_GARDEN_THEME.BIO_MAGENTA;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8);
      ctx.lineTo(size * 1.2, -size * 0.2);
      ctx.lineTo(size * 0.2, 0);
      ctx.lineTo(0, size * 0.9);
      ctx.lineTo(-size * 0.2, 0);
      ctx.lineTo(-size * 1.2, -size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_MAGENTA;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.3, size * 0.2, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
      ctx.strokeStyle = SOLAR_GARDEN_THEME.BIO_ACID;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(size * 0.75, -size * 0.5);
      ctx.lineTo(0, -size * 0.2);
      ctx.lineTo(-size * 0.75, -size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_ACID;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

/**
 * Player Bullet — Concentrated Crystalline Cyan / Gold Bolt
 */
export const drawShmupPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size ?? 4;

    ctx.save();
    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_CYAN;
    ctx.shadowBlur = 8;
    ctx.shadowColor = SOLAR_GARDEN_THEME.SOLAR_CYAN;

    ctx.beginPath();
    ctx.moveTo(0, -size * 2.5);
    ctx.lineTo(size * 0.8, size * 1.5);
    ctx.lineTo(0, size * 0.8);
    ctx.lineTo(-size * 0.8, size * 1.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
    ctx.fillRect(-1, -size * 1.8, 2, size * 2.5);

    ctx.restore();
  }
};

/**
 * Solar Bloom Boss — 5-Phase Biomechanical Flower
 */
export const drawSolarBloomBoss: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size ?? 50;

    const health = world.getComponent(entity, "Health");
    const hpRatio = health && health.max > 0 ? health.current / health.max : 1.0;

    ctx.save();

    const isPhase1 = hpRatio > 0.8;
    const isPhase2 = hpRatio <= 0.8 && hpRatio > 0.6;
    const isPhase3 = hpRatio <= 0.6 && hpRatio > 0.4;
    const isPhase4 = hpRatio <= 0.4 && hpRatio > 0.2;
    const isPhase5 = hpRatio <= 0.2;

    if ((isPhase5 || isPhase4) && SOLAR_GARDEN_DEBUG_FLAGS.bossEffects) {
      ctx.strokeStyle = hpRatio <= 0.2 ? SOLAR_GARDEN_THEME.BIO_ACID : SOLAR_GARDEN_THEME.BIO_MAGENTA;
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 12, size * 0.4);
        ctx.quadraticCurveTo(
          i * 16 + Math.sin(world.tick * 0.2 + i) * 10,
          size * 1.2,
          i * 14,
          size * 1.8
        );
        ctx.stroke();
      }
    }

    const petalCount = isPhase1 ? 8 : isPhase2 ? 6 : 4;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i * Math.PI * 2) / petalCount + world.tick * 0.02;
      const px = Math.cos(angle) * (size * (isPhase1 ? 0.7 : 0.9));
      const py = Math.sin(angle) * (size * (isPhase1 ? 0.7 : 0.9));

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);

      ctx.fillStyle = isPhase1 ? SOLAR_GARDEN_THEME.SOLAR_WHITE : SOLAR_GARDEN_THEME.BIO_BLACK;
      ctx.strokeStyle = isPhase1 ? SOLAR_GARDEN_THEME.SOLAR_GOLD : SOLAR_GARDEN_THEME.BIO_MAGENTA;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.4);
      ctx.lineTo(size * 0.2, size * 0.2);
      ctx.lineTo(0, size * 0.4);
      ctx.lineTo(-size * 0.2, size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    if (!isPhase1) {
      ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_MAGENTA;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    drawBiomechanicalEye(ctx, 0, 0, size * 0.35, world.tick * 0.1, hpRatio);

    ctx.restore();
  }
};

/**
 * Hostile Biomechanical Threat Projectile
 */
export const drawShmupEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size ?? 5;

    ctx.save();
    drawDualShellBullet(
      ctx,
      0,
      0,
      size,
      render.color ?? SOLAR_GARDEN_THEME.THREAT_ORANGE,
      2.5,
      0.4
    );
    ctx.restore();
  }
};

/**
 * Vertical Shmup Parallax Background: Solar Garden Overhead View
 */
export const drawShmupBackground: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    const width = 480;
    const height = 854;
    const elapsed = world.tick * 0.016;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, SOLAR_GARDEN_PALETTE.skyDawn);
    skyGrad.addColorStop(1, SOLAR_GARDEN_PALETTE.skyMid);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(61, 90, 69, 0.25)";
    ctx.strokeStyle = "rgba(230, 184, 0, 0.2)";
    ctx.lineWidth = 1;

    const scroll1 = (elapsed * 30) % 120;
    for (let y = -120 + scroll1; y < height + 120; y += 120) {
      for (let x = 30; x < width; x += 120) {
        ctx.beginPath();
        ctx.arc(x, y, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.glassBorder;
    ctx.lineWidth = 1;

    const scroll2 = (elapsed * 70) % 160;
    for (let y = -160 + scroll2; y < height + 160; y += 160) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let i = 0; i < 10; i++) {
      const px = ((i * 97 + elapsed * 20) % width);
      const py = ((i * 131 + elapsed * 90) % height);
      ctx.fillStyle = i % 3 === 0 ? SOLAR_GARDEN_PALETTE.solarGold : SOLAR_GARDEN_PALETTE.bioMagenta;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
