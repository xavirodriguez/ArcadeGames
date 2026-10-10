import type { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import {
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig,
  BELT_MOVEMENT_CONFIG_RESOURCE
} from "../belt/BeltMovementTypes";

export const HIT_RUN_DEBUG_OVERLAY_RESOURCE = "HitRunDebugOverlayEnabled";

export const drawHitRunDebugOverlay: EffectDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world) {
    const enabled = world.getResource<boolean>(HIT_RUN_DEBUG_OVERLAY_RESOURCE);
    if (enabled !== true) return;

    const config =
      world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE) ??
      DEFAULT_BELT_MOVEMENT_CONFIG;

    ctx.save();

    // Find camera or viewport width for full-width depth lines
    let canvasWidth = 1200;
    const gameConfig = world.getResource<{ viewportWidth?: number }>("GameConfig");
    if (gameConfig?.viewportWidth) {
      canvasWidth = gameConfig.viewportWidth;
    }

    // 1. Belt depth limits
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);

    // depthMin line
    ctx.strokeStyle = "rgba(0, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.moveTo(0, config.depthMin);
    ctx.lineTo(canvasWidth, config.depthMin);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 255, 255, 0.95)";
    ctx.font = "10px monospace";
    ctx.fillText(`depthMin: ${config.depthMin}`, 10, config.depthMin - 4);

    // depthMax line
    ctx.strokeStyle = "rgba(0, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.moveTo(0, config.depthMax);
    ctx.lineTo(canvasWidth, config.depthMax);
    ctx.stroke();

    ctx.fillText(`depthMax: ${config.depthMax}`, 10, config.depthMax + 12);

    ctx.setLineDash([]);

    // 2. Query all entities with Transform
    const transformEntities = world.query("Transform");
    const len = transformEntities.length;

    for (let i = 0; i < len; i++) {
      const e = transformEntities[i];
      const t = world.getComponent(e, "Transform");
      if (!t) continue;

      const x = t.worldX ?? t.x;
      const y = t.worldY ?? t.y;

      const elevation = world.getComponent(e, "BeltElevation");
      const z = elevation?.z ?? 0;

      // Depth ground line at Transform.y
      ctx.strokeStyle = "rgba(255, 215, 0, 0.9)"; // Gold
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x + 12, y);
      ctx.stroke();

      // Small dot at exact feet center
      ctx.fillStyle = "rgba(255, 215, 0, 1)";
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Elevation Z line (from ground feet to sprite position -z)
      if (Math.abs(z) > 0.1) {
        ctx.strokeStyle = "rgba(120, 220, 255, 0.6)";
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - z);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label: y & z
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "9px monospace";
      ctx.fillText(`y:${y.toFixed(0)} z:${z.toFixed(0)}`, x - 18, y + 10);

      // 3. Draw colliders / hitboxes if present
      const col = world.getComponent(e, "Collider2D");
      if (col && col.enabled !== false && col.shape?.type === "aabb") {
        const hw = col.shape.halfWidth ?? 10;
        const hh = col.shape.halfHeight ?? 10;
        const offX = col.offsetX ?? 0;
        const offY = col.offsetY ?? 0;

        // Center in screen space: x + offX, y + offY - z
        const cx = x + offX;
        const cy = y + offY - z;

        ctx.save();
        const isHitbox =
          col.isTrigger || (world.hasComponent(e, "Tag") && (world.getComponent(e, "Tag")?.tags?.includes("MeleeHitbox")));
        const isHurtbox = world.hasComponent(e, "Hurtbox");

        if (isHitbox) {
          ctx.strokeStyle = "rgba(255, 50, 50, 0.9)"; // Red for attack hitboxes
          ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
        } else if (isHurtbox) {
          ctx.strokeStyle = "rgba(50, 255, 50, 0.9)"; // Green for hurtboxes
          ctx.fillStyle = "rgba(50, 255, 50, 0.12)";
        } else {
          ctx.strokeStyle = "rgba(50, 150, 255, 0.9)"; // Blue for physical colliders
          ctx.fillStyle = "rgba(50, 150, 255, 0.12)";
        }

        ctx.lineWidth = 1.5;
        ctx.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
        ctx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
        ctx.restore();
      }
    }

    ctx.restore();
  }
};
