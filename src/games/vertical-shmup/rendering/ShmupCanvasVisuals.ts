import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { SOLAR_GARDEN_PALETTE } from "../../shared/rendering/SolarGardenPalette";
import { drawSolarLeafWing, drawBiomechanicalChitin, drawThreatProjectile } from "../../shared/rendering/SolarGardenMotifs";

/**
 * Cenit-01 Solar Maintenance/Defense Player Ship
 * Porcelain white body, leaf-shaped wings, gold solar trim, cyan energy core.
 */
export const drawShmupPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 20;

    ctx.save();

    // Leaf-shaped Wings
    drawSolarLeafWing(ctx, size * 1.3, size * 0.6, Math.PI * 0.25);
    drawSolarLeafWing(ctx, size * 1.3, size * 0.6, -Math.PI * 0.25);

    // Porcelain Central Hull
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

    // Glowing Cyan Energy Core
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
 * Segmented chitin shell, biomechanical wings, glowing organ core.
 */
export const drawShmupEnemy: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 20;

    ctx.save();
    drawBiomechanicalChitin(ctx, size * 0.75, false);
    ctx.restore();
  }
};

/**
 * Player Solar Purification Bolt
 */
export const drawShmupPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 4;

    ctx.save();
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarCyan;
    ctx.shadowBlur = 10;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarCyan;

    ctx.fillRect(-size / 2, -size * 2.5, size, size * 5);

    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
    ctx.fillRect(-size / 4, -size * 2, size / 2, size * 4);
    ctx.restore();
  }
};

/**
 * Hostile Biomechanical Threat Projectile
 * High-contrast threat orange / magenta with dark outline for maximum gameplay readability.
 */
export const drawShmupEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 5;

    ctx.save();
    drawThreatProjectile(ctx, size, SOLAR_GARDEN_PALETTE.threatOrange);
    ctx.restore();
  }
};

/**
 * Boss Visual: "The Solar Bloom"
 * Biomechanical floral boss overhanging the Solar Garden.
 */
export const drawSolarBloomBoss: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 60;
    const tick = world.tick;

    ctx.save();

    // Outer Petals / Chitin Shell
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i * Math.PI * 2) / petalCount + tick * 0.01;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -size * 0.6);
      drawBiomechanicalChitin(ctx, size * 0.35, i % 2 === 0);
      ctx.restore();
    }

    // Exposed Glowing Core
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.bioMagenta;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.bioMagenta;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Inner Active Core
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.bioAcid;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

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

    // Layer 0: Sky Atmosphere
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, SOLAR_GARDEN_PALETTE.skyDawn);
    skyGrad.addColorStop(1, SOLAR_GARDEN_PALETTE.skyMid);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Distant Garden & Porcelain Canopy (0.15x)
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

    // Layer 2: Ceramic Architecture Grid & Solar Structures (0.35x)
    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.glassBorder;
    ctx.lineWidth = 1;

    const scroll2 = (elapsed * 70) % 160;
    for (let y = -160 + scroll2; y < height + 160; y += 160) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Layer 3: Floating Pollen & Solar Particles (1.2x)
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
