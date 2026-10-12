import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import type { ShmupConfig } from "../types/ShmupConfigSchema";

export const drawShmupPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const health = world.getComponent(entity, "Health");
    const invulnerable = (health?.invulnerableRemaining ?? 0) > 0;
    const time = world.tick * 0.016;

    // Blink effect when invulnerable
    if (invulnerable && Math.floor(time * 20) % 2 === 0) {
      return;
    }

    const size = render.size ?? 22;
    const primaryColor = render.color ?? "#00e5ff";

    ctx.save();

    // Invulnerability shield aura
    if (invulnerable) {
      ctx.save();
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00ffff";
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Engine Thruster Flame
    const flicker = 0.8 + 0.4 * Math.sin(time * 30);
    const plumeLength = size * 0.9 * flicker;
    ctx.save();
    ctx.fillStyle = "#ffaa00";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffaa00";
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.5);
    ctx.lineTo(size * 0.25, size * 0.5);
    ctx.lineTo(0, size * 0.5 + plumeLength);
    ctx.closePath();
    ctx.fill();

    // Thruster core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, size * 0.5);
    ctx.lineTo(size * 0.15, size * 0.5);
    ctx.lineTo(0, size * 0.5 + plumeLength * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Main Fighter Hull (Arcade Jet Wings)
    ctx.shadowBlur = 12;
    ctx.shadowColor = primaryColor;
    ctx.fillStyle = primaryColor;

    ctx.beginPath();
    // Nose tip
    ctx.moveTo(0, -size * 1.1);
    // Right wingtip
    ctx.lineTo(size * 0.95, size * 0.75);
    // Right wing notch
    ctx.lineTo(size * 0.45, size * 0.45);
    // Tail center
    ctx.lineTo(0, size * 0.65);
    // Left wing notch
    ctx.lineTo(-size * 0.45, size * 0.45);
    // Left wingtip
    ctx.lineTo(-size * 0.95, size * 0.75);
    ctx.closePath();
    ctx.fill();

    // Wing panels / accent lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(size * 0.6, size * 0.5);
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.stroke();

    // Cockpit Glass Canopy
    ctx.fillStyle = "#e0ffff";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 0.22, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawShmupEnemy: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const path = world.getComponent(entity, "EnemyPath");
    const size = render.size ?? 24;
    const enemyColor = render.color ?? "#ff2a6d";
    const time = world.tick * 0.016;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = enemyColor;

    // Engine glow at top
    const pulse = 0.8 + 0.3 * Math.sin(time * 20 + entity);
    ctx.fillStyle = "#ff9900";
    ctx.beginPath();
    ctx.arc(0, -size * 0.5, size * 0.25 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Main Enemy Silhouette
    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.moveTo(0, size * 1.1);
    ctx.lineTo(size * 0.9, -size * 0.2);
    ctx.lineTo(size * 0.4, -size * 0.85);
    ctx.lineTo(0, -size * 0.5);
    ctx.lineTo(-size * 0.4, -size * 0.85);
    ctx.lineTo(-size * 0.9, -size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Cannons on wingtips
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(size * 0.8, -size * 0.2, size * 0.12, size * 0.6);
    ctx.fillRect(-size * 0.92, -size * 0.2, size * 0.12, size * 0.6);

    // Glowing Central Core
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffff00";
    ctx.fillStyle = path?.kind === "sine" ? "#ffe600" : "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawShmupPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 4;
    const color = render.color ?? "#ffe600";

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    // Outer plasma aura
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.75, -size * 2.5, size * 1.5, size * 5);

    // Core laser beam
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-size * 0.35, -size * 2, size * 0.7, size * 4);

    ctx.restore();
  }
};

export const drawShmupEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 5;
    const color = render.color ?? "#ff5a5a";

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    // Hazard plasma orb
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // White energy core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawShmupStarfield: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    const config = world.getResource<ShmupConfig>("GameConfig");
    const width = config?.WORLD_WIDTH ?? 480;
    const height = config?.WORLD_HEIGHT ?? 854;
    const state = world.getSingleton("ShmupGameState");
    const time = world.tick * 0.016;
    const scroll = state?.scrollDistance ?? (time * (config?.SCROLL_SPEED ?? 80));

    const starCount = config?.STAR_COUNT ?? 80;

    ctx.save();
    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < starCount; i++) {
      const seedX = (i * 127.1 + 311.7) % 1;
      const seedY = (i * 269.5 + 183.3) % 1;

      const layer = i % 3;
      const speedMult = layer === 0 ? 0.4 : layer === 1 ? 1.0 : 1.8;
      const starSpeed = (config?.STAR_SPEED ?? 35) * speedMult;

      const rawX = seedX * width;
      const rawY = (seedY * height + scroll * (starSpeed / 35)) % height;
      const y = rawY < 0 ? rawY + height : rawY;

      if (layer === 0) {
        ctx.fillStyle = "rgba(200, 220, 255, 0.35)";
        ctx.fillRect(rawX, y, 1, 1);
      } else if (layer === 1) {
        ctx.fillStyle = "rgba(0, 229, 255, 0.65)";
        ctx.fillRect(rawX, y, 1.5, 2);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(rawX, y, 2, 4);
      }
    }

    ctx.restore();
  }
};
