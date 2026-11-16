import type { World, CoreComponentRegistry } from "@tiny-aster/core";

export interface ShmupBloomConfig {
  /** Master switch. Default true when resource missing. */
  enabled?: boolean;
  /** Strength of the lighter composite (0–1). Default 0.42. */
  intensity?: number;
  /** Downsample factor for the blur pyramid (2–8). Default 4. */
  downsample?: number;
}

/**
 * Cheap screen-space bloom for Canvas2D:
 * 1) Copy frame to a small offscreen (downsample ≈ blur)
 * 2) Optional second soft pass
 * 3) Composite back with `lighter`
 *
 * Skips when `ShmupBloom.enabled === false` or VFX low-stimulation mode is on.
 */
export function createShmupBloomPostProcess(): {
  draw: (ctx: CanvasRenderingContext2D, world: World<CoreComponentRegistry>) => void;
} {
  let down: HTMLCanvasElement | null = null;
  let blur: HTMLCanvasElement | null = null;

  const ensureCanvas = (ref: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement | null => {
    if (typeof document === "undefined") return null;
    const c = ref ?? document.createElement("canvas");
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c;
  };

  return {
    draw(ctx: CanvasRenderingContext2D, world: World<CoreComponentRegistry>): void {
      const cfg = world.getResource<ShmupBloomConfig>("ShmupBloom");
      if (cfg?.enabled === false) return;

      const vfx = world.getResource<{ lowStimulationMode?: boolean }>("VFXState");
      if (vfx?.lowStimulationMode) return;

      const source = ctx.canvas as HTMLCanvasElement | undefined;
      if (!source || source.width < 8 || source.height < 8) return;

      const intensity = Math.max(0, Math.min(1, cfg?.intensity ?? 0.42));
      if (intensity <= 0.01) return;

      const factor = Math.max(2, Math.min(8, Math.round(cfg?.downsample ?? 4)));
      const dw = Math.max(2, Math.floor(source.width / factor));
      const dh = Math.max(2, Math.floor(source.height / factor));

      down = ensureCanvas(down, dw, dh);
      blur = ensureCanvas(blur, dw, dh);
      if (!down || !blur) return;

      const dctx = down.getContext("2d");
      const bctx = blur.getContext("2d");
      if (!dctx || !bctx) return;

      // Pass 1: downsample (box-filter blur approximation)
      dctx.clearRect(0, 0, dw, dh);
      dctx.imageSmoothingEnabled = true;
      dctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, dw, dh);

      // Pass 2: slight extra soft blur by scaled redraw
      bctx.clearRect(0, 0, dw, dh);
      bctx.imageSmoothingEnabled = true;
      bctx.globalAlpha = 1;
      bctx.drawImage(down, 0, 0, dw, dh, -0.5, -0.5, dw + 1, dh + 1);

      // Composite onto the finished frame (screen space; identity transform expected)
      ctx.save();
      ctx.setTransform?.(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = intensity;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(blur, 0, 0, dw, dh, 0, 0, source.width, source.height);
      ctx.restore();
    }
  };
}
