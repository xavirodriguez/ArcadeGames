import type { EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { computeSumiEBackdrop } from "./ShmupVisualHelpers";

/** Sumi-e landscape composition: low-contrast centre, ink-heavy edges, deterministic detail. */
export const drawSumiECanvasBackdrop: EffectDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world) {
    const data = computeSumiEBackdrop(world);
    const { width, height, time, scroll, palette } = data;
    ctx.save();
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.lineWidth = 0.7;
    for (const fiber of data.paperFibers) {
      ctx.strokeStyle = "rgba(95, 100, 102, " + fiber.alpha + ")";
      ctx.beginPath();
      ctx.moveTo(fiber.x, fiber.y);
      ctx.lineTo(fiber.x + fiber.length, fiber.y + Math.sin(fiber.x * 0.03) * 1.5);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(width * 0.72, height * 0.16, Math.min(width, height) * 0.105, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (let band = 0; band < 3; band += 1) {
      const y = ((height * (0.28 + band * 0.24) + scroll * (0.08 + band * 0.025)) % (height + 180)) - 90;
      ctx.save();
      ctx.globalAlpha = 0.25 - band * 0.035;
      ctx.fillStyle = palette.mist;
      ctx.beginPath();
      ctx.ellipse(width * (0.48 + Math.sin(time * 0.12 + band) * 0.08), y, width * 0.46, height * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ridge of data.ridges) {
      ctx.save();
      ctx.globalAlpha = ridge.opacity;
      ctx.fillStyle = palette.inkWash;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(ridge.points[0]!.x, ridge.points[0]!.y);
      for (let i = 1; i < ridge.points.length; i += 1) {
        const previous = ridge.points[i - 1]!;
        const current = ridge.points[i]!;
        ctx.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
      }
      const last = ridge.points[ridge.points.length - 1]!;
      ctx.lineTo(last.x, last.y);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const edge = width * 0.22;
    for (let index = 0; index < 3; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const x = side > 0 ? width * (0.07 + index * 0.035) : width * (0.91 - index * 0.025);
      const y = height * (0.34 + index * 0.21) + ((scroll * 0.18) % (height * 0.12));
      const scale = 0.55 + (index % 2) * 0.22;
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(x - 5 * scale, y, 10 * scale, 25 * scale);
      for (let tier = 0; tier < 3; tier += 1) {
        const roofY = y + tier * 8 * scale;
        const roofW = (22 - tier * 4) * scale;
        ctx.beginPath();
        ctx.moveTo(x - roofW, roofY);
        ctx.lineTo(x, roofY - 5 * scale);
        ctx.lineTo(x + roofW, roofY);
        ctx.lineTo(x + roofW * 0.82, roofY + 2 * scale);
        ctx.lineTo(x - roofW * 0.82, roofY + 2 * scale);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = palette.inkWash;
      ctx.lineWidth = 2 * scale;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.moveTo(x + side * 15 * scale, y + 28 * scale);
      ctx.quadraticCurveTo(x + side * 20 * scale, y + 46 * scale, x + side * 17 * scale, y + 70 * scale);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = palette.ink;
    for (const side of [-1, 1]) {
      const baseX = side < 0 ? 0 : width;
      const direction = side < 0 ? 1 : -1;
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.moveTo(baseX, height);
      ctx.lineTo(baseX, height * 0.78);
      ctx.lineTo(baseX + direction * edge * 0.42, height * 0.84);
      ctx.lineTo(baseX + direction * edge * 0.2, height * 0.9);
      ctx.lineTo(baseX + direction * edge * 0.52, height * 0.95);
      ctx.closePath();
      ctx.fill();
      for (let tree = 0; tree < 4; tree += 1) {
        const x = baseX + direction * width * (0.045 + tree * 0.035);
        const y = height * (0.58 + ((tree * 17 + Math.floor(scroll / 90)) % 4) * 0.085);
        ctx.globalAlpha = 0.62;
        ctx.fillRect(x - 2, y, 4, height - y);
        for (let branch = 0; branch < 4; branch += 1) {
          const by = y + branch * 9;
          ctx.beginPath();
          ctx.moveTo(x, by - 9);
          ctx.lineTo(x + direction * (8 + branch * 2), by + 2);
          ctx.lineTo(x, by);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
    ctx.restore();
  }
};
