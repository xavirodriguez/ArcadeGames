/**
 * Hit&Run canvas shape drawers — armed runner + enemy archetypes + bullets.
 */
import type {
  ShapeDrawer,
  CoreComponentRegistry,
  HealthComponent
} from "@tiny-aster/core";
import { HIT_PALETTE } from "./HitAndRunPalette";
import type { HitRunWeaponState } from "../weapons/HitRunWeaponTypes";

function facingFromTransform(scaleX?: number): number {
  return (scaleX ?? 1) >= 0 ? 1 : -1;
}

/** Armed platformer runner with HMG silhouette + muzzle flash. */
export const drawHitRunPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const transform = world.getComponent(entity, "Transform");
    if (!render?.visible || !transform) return;

    const size = render.size || 24;
    const face = facingFromTransform(transform.scaleX);
    const vel = world.getComponent(entity, "Velocity") as { vx?: number; vy?: number } | undefined;
    const grounded = world.getComponent(entity, "PlatformerGroundState") as
      | { isGrounded?: boolean }
      | undefined;
    const weapon = world.getComponent(entity, "HitRunWeapon") as HitRunWeaponState | undefined;
    const health = world.getComponent(entity, "Health") as HealthComponent | undefined;
    const tick = world.tick ?? 0;

    ctx.save();

    if ((render.hitFlashFrames ?? 0) > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (health && (health as { invulnerableRemaining?: number }).invulnerableRemaining) {
      const inv = (health as { invulnerableRemaining?: number }).invulnerableRemaining ?? 0;
      if (inv > 0 && Math.floor(tick / 3) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
    }

    const bob = grounded?.isGrounded ? 0 : Math.sin(tick * 0.35) * 1.5;
    const lean = Math.max(-0.2, Math.min(0.2, (vel?.vx ?? 0) * 0.002));
    ctx.scale(face, 1);
    ctx.translate(0, bob);
    ctx.rotate(lean * face);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.55, size * 0.4, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    const stride = grounded?.isGrounded
      ? Math.sin(tick * 0.4) * size * 0.12
      : size * 0.08;
    ctx.strokeStyle = "#1a1220";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.12, size * 0.15);
    ctx.lineTo(-size * 0.18 - stride, size * 0.48);
    ctx.moveTo(size * 0.12, size * 0.15);
    ctx.lineTo(size * 0.18 + stride, size * 0.48);
    ctx.stroke();

    // Torso
    const bodyGrad = ctx.createLinearGradient(-size * 0.3, -size * 0.35, size * 0.3, size * 0.25);
    bodyGrad.addColorStop(0, "#3d4a5c");
    bodyGrad.addColorStop(0.5, "#5a6a80");
    bodyGrad.addColorStop(1, "#2a3340");
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = HIT_PALETTE.hitRunRed;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.28, -size * 0.28, size * 0.56, size * 0.5, 4);
    } else {
      ctx.rect(-size * 0.28, -size * 0.28, size * 0.56, size * 0.5);
    }
    ctx.fill();
    ctx.stroke();

    // Helmet / head
    ctx.fillStyle = "#1e2430";
    ctx.beginPath();
    ctx.arc(0, -size * 0.42, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = HIT_PALETTE.hitRunYellow;
    ctx.beginPath();
    ctx.ellipse(size * 0.08, -size * 0.44, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // HMG body
    ctx.fillStyle = "#1a1a22";
    ctx.fillRect(size * 0.15, -size * 0.12, size * 0.55, size * 0.14);
    ctx.fillStyle = "#3a3a48";
    ctx.fillRect(size * 0.65, -size * 0.08, size * 0.22, size * 0.06);
    // Barrel tip
    ctx.fillStyle = "#0a0a10";
    ctx.fillRect(size * 0.85, -size * 0.06, size * 0.12, size * 0.03);

    // Muzzle flash
    const flash = weapon?.muzzleFlashRemaining ?? 0;
    if (flash > 0) {
      const a = Math.min(1, flash / 0.06);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#fff7cc";
      ctx.shadowColor = HIT_PALETTE.hitRunYellow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(size * 0.95, 0);
      ctx.lineTo(size * 1.25, -size * 0.12);
      ctx.lineTo(size * 1.15, 0);
      ctx.lineTo(size * 1.25, size * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Accent stripe
    ctx.fillStyle = HIT_PALETTE.hitRunRed;
    ctx.fillRect(-size * 0.22, -size * 0.05, size * 0.12, size * 0.08);

    ctx.restore();
  }
};

function drawEnemyBase(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  hitFlash: boolean
): void {
  if (hitFlash) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
}

export const drawHitRunPopcorn: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render?.visible) return;
    const size = render.size || 10;
    ctx.save();
    if ((render.hitFlashFrames ?? 0) > 0) {
      drawEnemyBase(ctx, size, "#fff", true);
      ctx.restore();
      return;
    }
    drawEnemyBase(ctx, size, render.color || "#f97316", false);
    // Grunt blob + eyes
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0a00";
    ctx.beginPath();
    ctx.arc(-size * 0.12, -size * 0.08, size * 0.1, 0, Math.PI * 2);
    ctx.arc(size * 0.14, -size * 0.08, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = HIT_PALETTE.hitRunYellow;
    ctx.fillRect(-size * 0.2, size * 0.15, size * 0.4, size * 0.08);
    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con hitandrun/rendering/HitRunCanvasVisuals.ts:247-255. Considerar extraer a función compartida. Ref: a1b5eeea
export const drawHitRunWallTrooper: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render?.visible) return;
    const size = render.size || 14;
    ctx.save();
    if ((render.hitFlashFrames ?? 0) > 0) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(-size * 0.4, -size * 0.5, size * 0.8, size);
      ctx.restore();
      return;
    }
    ctx.fillStyle = render.color || "#78716c";
    ctx.strokeStyle = "#a8a29e";
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.4, -size * 0.5, size * 0.8, size);
    ctx.strokeRect(-size * 0.4, -size * 0.5, size * 0.8, size);
    // Shield plate
    ctx.fillStyle = "#44403c";
    ctx.fillRect(-size * 0.45, -size * 0.2, size * 0.2, size * 0.55);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-size * 0.15, -size * 0.35, size * 0.3, size * 0.12);
    ctx.restore();
  }
};

export const drawHitRunHopper: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render?.visible) return;
    const size = render.size || 12;
    const tick = world.tick ?? 0;
    ctx.save();
    if ((render.hitFlashFrames ?? 0) > 0) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const squash = 1 + Math.sin(tick * 0.5) * 0.08;
    ctx.scale(1 / squash, squash);
    ctx.fillStyle = render.color || "#a855f7";
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Spring legs
    ctx.strokeStyle = "#6b21a8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, size * 0.2);
    ctx.quadraticCurveTo(-size * 0.4, size * 0.5, -size * 0.15, size * 0.55);
    ctx.moveTo(size * 0.2, size * 0.2);
    ctx.quadraticCurveTo(size * 0.4, size * 0.5, size * 0.15, size * 0.55);
    ctx.stroke();
    ctx.restore();
  }
};

export const drawHitRunCharger: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render?.visible) return;
    const size = render.size || 14;
    ctx.save();
    if ((render.hitFlashFrames ?? 0) > 0) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(size * 0.6, 0);
      ctx.lineTo(-size * 0.4, -size * 0.4);
      ctx.lineTo(-size * 0.4, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = render.color || "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(size * 0.65, 0);
    ctx.lineTo(-size * 0.45, -size * 0.42);
    ctx.lineTo(-size * 0.25, 0);
    ctx.lineTo(-size * 0.45, size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fca5a5";
    ctx.beginPath();
    ctx.arc(size * 0.15, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

export const drawHitRunElite: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render?.visible) return;
    const size = render.size || 22;
    const tick = world.tick ?? 0;
    ctx.save();
    if ((render.hitFlashFrames ?? 0) > 0) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.15);
    ctx.strokeStyle = `rgba(234, 179, 8, ${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.7 + pulse * 0.1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = render.color || "#eab308";
    ctx.shadowColor = "#eab308";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1200";
    ctx.fillRect(-size * 0.2, -size * 0.12, size * 0.4, size * 0.24);
    ctx.fillStyle = HIT_PALETTE.hitRunRed;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

export const drawHitRunBullet: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render?.visible) return;
    const size = render.size || 3;
    const color = render.color || "#fbbf24";
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    const grad = ctx.createLinearGradient(-size * 2, 0, size * 2, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 2.2, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

export const drawHitRunRocket: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render?.visible) return;
    const size = render.size || 7;
    ctx.save();
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(size * 1.2, 0);
    ctx.lineTo(-size * 0.8, -size * 0.5);
    ctx.lineTo(-size * 0.5, 0);
    ctx.lineTo(-size * 0.8, size * 0.5);
    ctx.closePath();
    ctx.fill();
    // Exhaust
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, 0);
    ctx.lineTo(-size * 1.4, -size * 0.25);
    ctx.lineTo(-size * 1.4, size * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};
