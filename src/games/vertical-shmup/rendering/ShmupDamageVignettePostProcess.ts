import type { World, CoreComponentRegistry } from "@tiny-aster/core";
import type { DamageVignetteState } from "../juice/ShmupJuiceHelpers";

/**
 * Screen-space red edge vignette + subtle RGB split while damage feedback is active.
 */
export function createShmupDamageVignettePostProcess(): {
  draw: (ctx: CanvasRenderingContext2D, world: World<CoreComponentRegistry>) => void;
} {
  return {
    draw(ctx: CanvasRenderingContext2D, world: World<CoreComponentRegistry>): void {
      const v = world.getResource<DamageVignetteState>("ShmupDamageVignette");
      if (!v || v.remaining <= 0) return;

      const canvas = ctx.canvas as HTMLCanvasElement | undefined;
      if (!canvas || canvas.width < 4) return;

      const t = Math.max(0, Math.min(1, v.remaining / Math.max(1e-4, v.duration)));
      const strength = t * (v.intensity ?? 0.85);

      ctx.save();
      ctx.setTransform?.(1, 0, 0, 1, 0, 0);

      const w = canvas.width;
      const h = canvas.height;
      const edge = Math.max(24, Math.min(w, h) * 0.12);

      // Soft red border via radial-ish edge fills
      const gradTop = ctx.createLinearGradient(0, 0, 0, edge);
      gradTop.addColorStop(0, `rgba(220, 30, 50, ${0.55 * strength})`);
      gradTop.addColorStop(1, "rgba(220, 30, 50, 0)");
      ctx.fillStyle = gradTop;
      ctx.fillRect(0, 0, w, edge);

      const gradBot = ctx.createLinearGradient(0, h, 0, h - edge);
      gradBot.addColorStop(0, `rgba(220, 30, 50, ${0.55 * strength})`);
      gradBot.addColorStop(1, "rgba(220, 30, 50, 0)");
      ctx.fillStyle = gradBot;
      ctx.fillRect(0, h - edge, w, edge);

      const gradL = ctx.createLinearGradient(0, 0, edge, 0);
      gradL.addColorStop(0, `rgba(220, 30, 50, ${0.4 * strength})`);
      gradL.addColorStop(1, "rgba(220, 30, 50, 0)");
      ctx.fillStyle = gradL;
      ctx.fillRect(0, 0, edge, h);

      const gradR = ctx.createLinearGradient(w, 0, w - edge, 0);
      gradR.addColorStop(0, `rgba(220, 30, 50, ${0.4 * strength})`);
      gradR.addColorStop(1, "rgba(220, 30, 50, 0)");
      ctx.fillStyle = gradR;
      ctx.fillRect(w - edge, 0, edge, h);

      // Cheap chromatic: offset red/cyan ghosts of the frame at low alpha
      if (strength > 0.35) {
        const shift = Math.round(2 + 3 * strength);
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.12 * strength;
        ctx.drawImage(canvas, -shift, 0, w, h);
        ctx.globalAlpha = 0.1 * strength;
        ctx.drawImage(canvas, shift, 0, w, h);
      }

      ctx.restore();
    }
  };
}
