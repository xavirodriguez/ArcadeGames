import type { EffectDrawer } from "@tiny-aster/core";
import { CanvasDrawAdapter, SkiaDrawAdapter } from "../../shared/rendering/DrawAdapter";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { drawWaveAnnouncement } from "../presentation/ShmupWaveAnnouncement";

export const drawShmupWaveAnnouncementCanvas: EffectDrawer<
  CanvasRenderingContext2D,
  ShmupComponentRegistry
> = {
  draw(ctx, world) {
    drawWaveAnnouncement(new CanvasDrawAdapter(ctx), world);
  }
};

export const drawShmupWaveAnnouncementSkia: EffectDrawer<unknown, ShmupComponentRegistry> = {
  draw(ctx, world) {
    drawWaveAnnouncement(new SkiaDrawAdapter(ctx), world);
  }
};
