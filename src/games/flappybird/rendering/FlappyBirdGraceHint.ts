import { EffectDrawer } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { colors } from "../../../theme/colors";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { hexToRgba } from "../../shared/rendering/CosmicPalette";

const HINT_TEXT = "¡Pulsa para volar!";

function shouldShowGraceHint(world: {
  getSingleton: (name: "FlappyState") => { graceTimeRemaining?: number; isGameOver?: boolean } | undefined;
}): boolean {
  const state = world.getSingleton("FlappyState");
  return !!state && (state.graceTimeRemaining ?? 0) > 0 && !state.isGameOver;
}

/**
 * Canvas2D background effect that shows a grace-period hint while the bird is floating.
 * @public
 */
export const drawFlappyBirdGraceHint: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world) {
    if (!shouldShowGraceHint(world)) {
      return;
    }

    const config = world.getResource<{ worldWidth?: number }>("GameConfig");
    const x = (config?.worldWidth ?? 400) / 2;
    const y = 120;

    ctx.save();
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = hexToRgba(colors.cyan, 0.95);
    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 10;
    ctx.fillText(HINT_TEXT, x, y);
    ctx.restore();
  },
};

/**
 * Skia background effect that shows a grace-period hint while the bird is floating.
 * @public
 */
export const drawSkiaFlappyBirdGraceHint: EffectDrawer<unknown, FlappyBirdComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia || !shouldShowGraceHint(world)) {
      return;
    }

    const config = world.getResource<{ worldWidth?: number }>("GameConfig");
    const x = (config?.worldWidth ?? 400) / 2;
    const y = 120;

    const skCanvas = canvas as {
      save: () => void;
      restore: () => void;
      drawText?: (text: string, x: number, y: number, paint: unknown, font?: unknown) => void;
    };

    if (typeof skCanvas.drawText !== "function") {
      return;
    }

    skCanvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(hexToRgba(colors.cyan, 0.95)));

    const font = typeof Skia.Font === "function" ? Skia.Font(null, 18) : undefined;
    if (font) {
      skCanvas.drawText(HINT_TEXT, x - 90, y, paint, font);
    } else {
      skCanvas.drawText(HINT_TEXT, x - 90, y, paint);
    }
    skCanvas.restore();
  },
};
