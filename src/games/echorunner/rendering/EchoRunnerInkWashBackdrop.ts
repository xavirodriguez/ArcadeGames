/**
 * Ink-wash parallax backdrop for Echo Runner.
 *
 * Theme-agnostic: resolves its ink color from whichever Theme is active via
 * resolveThemeColorWithFallback, so it renders correctly under the ink-world concept
 * pack (see src/theme/conceptPacks/inkWorldEchoRunnerConceptPack.ts) without being
 * hardcoded to it. Registered under the "inkwash_parallax" background-layer name;
 * it only actually paints when the active Theme's vfxProfile.backgroundLayers
 * includes that name (see SharedVFXInternal.ts's layer gate) — registering it here
 * does not change Echo Runner's current default ("echo_bg") appearance.
 *
 * cameraX is derived from RunState.elapsedTime, same convention the existing
 * drawEchoBackground skyline already uses — Echo Runner's RunStateResource has no
 * real distance-traveled field, only elapsedTime.
 *
 * Canvas only for now; no Skia counterpart yet.
 */
import { EffectDrawer, CoreComponentRegistry, resolveThemeColorWithFallback } from "@tiny-aster/core";
import {
  computeInkWashLayers,
  drawInkWashLayersCanvas
} from "../../shared/rendering/InkWashParallaxBackdrop";
import { resolveEchoBackgroundContext } from "./EchoRunnerVisualUtils";
import { INK_WORLD_PALETTE } from "../../../theme/inkWorldPalette";

/** Forward scroll speed for the virtual cameraX derived from elapsed time, px/s. */
const VIRTUAL_SCROLL_SPEED = 60;

export const drawEchoInkWashBackdrop: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, elapsed } = resolveEchoBackgroundContext(world);
    const cameraX = elapsed * VIRTUAL_SCROLL_SPEED;

    const inkColor = resolveThemeColorWithFallback(world, INK_WORLD_PALETTE.ink, "ink", "inkOrOutline", "primary");

    ctx.save();
    const geometry = computeInkWashLayers(width, height, cameraX);
    drawInkWashLayersCanvas(ctx, geometry, inkColor);
    ctx.restore();
  }
};
