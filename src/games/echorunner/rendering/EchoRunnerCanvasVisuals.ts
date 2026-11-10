import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import {
  resolveEchoPlayerDrawContext,
  resolveEchoBackgroundContext,
  resolveEchoRunnerPalette,
} from "./EchoRunnerVisualUtils";
import {
  getEchoRunnerSpriteFrame,
  resolveEchoRunnerSpriteMotion,
  drawRleSpriteFrame,
} from "./EchoRunnerPixelArt";
import {
  drawSpriteCanvas,
  getCurrentFrameRect,
  type SpriteAnimatorComponent
} from "../../shared/sprites";

import { drawCanvasHitFlashCircle } from "../../shared/rendering/PlatformerSharedVisuals";
import { resolveEchoRunnerDeathZoneDrawData, resolveEchoRunnerStateGateDrawData, resolveEchoRunnerStateSwitchDrawData } from "./EchoRunnerInteractionVisualUtils";
import {
  resolveEchoStarsLayout,
  resolveEchoPerspectiveGrid,
  resolveEchoSkylineLayout,
  resolveEchoPillarLayout,
  resolveEchoRuinsLayout,
  resolveEchoFloraLayout,
  resolveEchoMotesLayout,
  resolveEchoPlayerRunTrails,
} from "./EchoRunnerVisualHelpers";

export const drawEchoStateSwitch: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const state = resolveEchoRunnerStateSwitchDrawData(world, entity);
    if (!state) return;

    const { palette, size, color, activated } = state;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = palette.archiveVoidDark;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    const coreSize = activated ? size * 0.26 : size * 0.16;
    ctx.fillRect(-coreSize * 0.5, -coreSize * 0.5, coreSize, coreSize);
    ctx.restore();
  }
};

export const drawEchoStateGate: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const state = resolveEchoRunnerStateGateDrawData(world, entity);
    if (!state) return;

    const { palette, size, width, color, isOpen } = state;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = palette.archiveVoidDark;
    ctx.shadowColor = color;
    ctx.shadowBlur = isOpen ? 4 : 12;

    if (isOpen) {
      ctx.globalAlpha = 0.28;
      ctx.strokeRect(-width * 0.5, -size * 0.5, width, size);
      ctx.beginPath();
      ctx.moveTo(-width * 0.28, -size * 0.36);
      ctx.lineTo(-width * 0.28, size * 0.36);
      ctx.moveTo(width * 0.28, -size * 0.36);
      ctx.lineTo(width * 0.28, size * 0.36);
      ctx.stroke();
    } else {
      ctx.fillRect(-width * 0.5, -size * 0.5, width, size);
      ctx.strokeRect(-width * 0.5, -size * 0.5, width, size);
      for (let bar = -1; bar <= 1; bar++) {
        ctx.beginPath();
        ctx.moveTo(bar * width * 0.22, -size * 0.42);
        ctx.lineTo(bar * width * 0.22, size * 0.42);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

export const drawEchoDeathZone: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const zone = resolveEchoRunnerDeathZoneDrawData(world, entity);
    if (!zone) return;

    const { palette, width, height } = zone;
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = palette.corruptionCrimson;
    ctx.fillRect(-width * 0.5, -height * 0.5, width, height);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = palette.corruptionAmber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -width * 0.5; x < width * 0.5; x += 10) {
      ctx.moveTo(x, height * 0.5);
      ctx.lineTo(Math.min(x + height, width * 0.5), -height * 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }
};

export {
  drawMemoryFragment,
  drawMemoryCore,
  drawCheckpointNode,
  drawPulseAttack,
  drawSentinel,
  drawHopper,
  drawWatcher,
  drawCharger,
} from "../../shared/rendering/PlatformerSharedVisuals";

export const drawEchoBackground: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    if (!ctx || !("fillRect" in ctx)) return;
    const { width, height, elapsed, palette } = resolveEchoBackgroundContext(world);

    // The Archive visual pass: portal glow, parallax ruins and a perspective data plane.
    ctx.fillStyle = palette.archiveVoidDark;
    ctx.fillRect(0, 0, width, height);
    ctx.save();

    const horizonY = height * 0.56;
    const centerX = width * 0.5;
    const driftX = Math.sin(elapsed * 0.12) * width * 0.018;

    // Soft rings suggest the Archive's restoration gateway in the distance.
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = palette.restorationCyanGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX + driftX, horizonY - 18, width * 0.31, Math.max(18, height * 0.075), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = palette.corruptionPurpleGlow;
    ctx.beginPath();
    ctx.ellipse(centerX + driftX, horizonY - 18, width * 0.23, Math.max(12, height * 0.052), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sparse pixel stars keep the upper half calm and preserve contrast for gameplay.
    const stars = resolveEchoStarsLayout(width, horizonY, elapsed, palette);
    for (const star of stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Perspective lines converge at the horizon (batched single path)
    const vanishingX = centerX + driftX;
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = palette.archiveGridLine;
    ctx.lineWidth = 1;

    const grid = resolveEchoPerspectiveGrid(width, height, horizonY, vanishingX);
    if (typeof Path2D !== "undefined") {
      const gridPath = new Path2D();
      for (const line of grid.radialLines) {
        gridPath.moveTo(line.x1, line.y1);
        gridPath.lineTo(line.x2, line.y2);
      }
      for (const hLine of grid.horizontalLines) {
        gridPath.moveTo(0, hLine.y);
        gridPath.lineTo(width, hLine.y);
      }
      ctx.stroke(gridPath);
    } else {
      ctx.beginPath();
      for (const line of grid.radialLines) {
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
      }
      for (const hLine of grid.horizontalLines) {
        ctx.moveTo(0, hLine.y);
        ctx.lineTo(width, hLine.y);
      }
      ctx.stroke();
    }

    // Procedural skyline: deterministic building silhouettes, lit windows and slow parallax.
    const skyline = resolveEchoSkylineLayout(width, horizonY, elapsed);
    for (const b of skyline) {
      ctx.globalAlpha = b.fillAlpha;
      ctx.fillStyle = palette.archiveBorderDark;
      ctx.fillRect(b.x, b.y, b.width, b.height);

      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = palette.restorationCyanGlow;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.width, b.y);
      ctx.stroke();

      ctx.globalAlpha = 0.40;
      ctx.fillStyle = palette.restorationCyanGlow;
      for (const w of b.windows) {
        ctx.fillRect(w.x, w.y, w.width, w.height);
      }

      if (b.hasAntenna) {
        ctx.globalAlpha = 0.38;
        ctx.beginPath();
        ctx.moveTo(b.antennaX, b.y);
        ctx.lineTo(b.antennaX, b.antennaTopY);
        ctx.stroke();
      }
    }

    // Vertical data traces move faster than the skyline to strengthen the parallax.
    const pillars = resolveEchoPillarLayout(width, height, elapsed);
    for (const p of pillars) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = palette.archiveDataStream;
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }

    // Foreground Archive ruins scroll subtly instead of reading as a static overlay.
    const ruins = resolveEchoRuinsLayout(width, height, elapsed);
    for (const r of ruins) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = palette.archiveSlate;
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.fillRect(r.x - 4, r.y, r.width + 8, 4);

      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = palette.restorationCyanGlow;
      ctx.beginPath();
      ctx.moveTo(r.x - 3, r.y + 4);
      ctx.lineTo(r.x + r.width + 3, r.y + 4);
      ctx.stroke();

      if (r.hasRelicGlow) {
        ctx.fillStyle = palette.restorationGoldGlow;
        ctx.fillRect(r.relicX, r.relicY, r.relicWidth, r.relicHeight);
      }
    }

    // Original procedural pixel flora anchors the foreground.
    const flora = resolveEchoFloraLayout(width, height, elapsed, palette);
    for (const f of flora) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = f.color;
      ctx.fillRect(f.x, f.baseY - f.stemHeight, 2, f.stemHeight);
      ctx.fillRect(f.x - 3, f.baseY - f.stemHeight + 4, 4, 3);
      ctx.fillRect(f.x + 1, f.baseY - f.stemHeight + 9, 4, 3);
      if (f.hasBloom) {
        ctx.fillStyle = palette.restorationGold;
        ctx.fillRect(f.bloomX, f.bloomY, 3, 3);
      }
    }

    // Ambient motes drift at different speeds; all positions remain deterministic.
    const motes = resolveEchoMotesLayout(width, height, elapsed, palette);
    for (const m of motes) {
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawEchoPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const playerCtx = resolveEchoPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { render, size, vx, vy, isGrounded, isAttacking, health, palette } = playerCtx;
    const flashState = resolveHitFlash(render, render.color || palette.restorationCyan, 1.0);
    if (flashState.isFlashing) {
      drawCanvasHitFlashCircle(ctx, size * 0.65, palette.restorationWhite);
      return;
    }

    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, {
      mode: "tick",
      tick: world.tick,
      pulseDivisor: 4,
      dimOpacity: 0.3,
    });
    const spriteAnimator = world.getComponent(entity, "SpriteAnimator") as
      | SpriteAnimatorComponent
      | undefined;
    const spriteFrame = spriteAnimator ? getCurrentFrameRect(spriteAnimator) : null;
    if (spriteAnimator && spriteFrame) {
      // Normalize source-frame widths to the existing player collision/render size.
      const scaledAnimator = { ...spriteAnimator, scale: size / spriteFrame.w };
      if (drawSpriteCanvas(ctx, scaledAnimator, 0, 0, {
        anchor: "feet",
        opacity: invState.isInvulnerable ? invState.opacity : 1
      })) {
        return;
      }
    }

    const transform = world.getComponent(entity, "Transform");
    const facingLeft = (transform?.scaleX ?? 1) < 0;
    const motion = resolveEchoRunnerSpriteMotion(vx, vy, isGrounded, isAttacking);
    const frame = getEchoRunnerSpriteFrame(motion, world.tick);
    const pixelSize = size / 16;
    const originX = -size / 2;
    const originY = -size * 0.8;

    ctx.save();
    ctx.globalAlpha = invState.isInvulnerable ? invState.opacity : 1;
    ctx.translate(0, 0);
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    ctx.fillStyle = palette.archiveVoidDark;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.66, size * 0.48, size * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isAttacking) {
      ctx.strokeStyle = palette.restorationCyan;
      ctx.lineWidth = Math.max(1, pixelSize);
      ctx.globalAlpha *= 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.72, -Math.PI * 0.8, Math.PI * 0.8);
      ctx.stroke();
      ctx.globalAlpha = invState.isInvulnerable ? invState.opacity : 1;
    }

    // Motion streaks are only drawn while running to keep idle frames crisp.
    if (motion === "run") {
      const spriteAlpha = ctx.globalAlpha;
      const trails = resolveEchoPlayerRunTrails(size, vx, world.tick, pixelSize, palette);
      for (const t of trails) {
        ctx.globalAlpha = spriteAlpha * t.alphaFactor;
        ctx.strokeStyle = t.color;
        ctx.lineWidth = t.lineWidth;
        ctx.beginPath();
        ctx.moveTo(t.startX, t.startY);
        ctx.lineTo(t.midX, t.midY);
        ctx.lineTo(t.endX, t.endY);
        ctx.stroke();
      }
      ctx.globalAlpha = spriteAlpha;
    }

    drawRleSpriteFrame(frame, palette, (x, y, runLength, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(originX + x * pixelSize, originY + y * pixelSize, runLength * pixelSize, pixelSize);
    });

    ctx.restore();
  }
};
