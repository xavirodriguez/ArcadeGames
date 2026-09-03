import { ShapeDrawer, EffectDrawer, World, CoreComponentRegistry } from "@tiny-aster/core";
import { ECHO_PALETTE } from "./EchoRunnerPalette";

const gradientCache = new Map<number, CanvasGradient>();
let lastCtx: CanvasRenderingContext2D | null = null;

function getMemoryCoreGradient(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  const key = 1000 + size;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.5);
    grad.addColorStop(0, ECHO_PALETTE.restorationWhite);
    grad.addColorStop(0.35, ECHO_PALETTE.restorationGold);
    grad.addColorStop(1, ECHO_PALETTE.corruptionAmber);
    gradientCache.set(key, grad);
  }
  return grad;
}

function getPulseAttackGradient(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  const key = 2000 + size;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.4, ECHO_PALETTE.restorationCyanGlow);
    grad.addColorStop(1, "rgba(0, 240, 255, 0)");
    gradientCache.set(key, grad);
  }
  return grad;
}

export const drawEchoBackground: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:20-26. Considerar extraer a función compartida. Ref: 124bbcae
    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const width = screenConfig.width;
    const height = screenConfig.height;
    const runState = world.getResource<any>("RunState");
    const elapsed = runState?.elapsedTime || (world.tick * 0.016);

    // Deep Archive Void Background
    ctx.fillStyle = ECHO_PALETTE.archiveVoidDark;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Parallax Distant Memory Grid (slow scroll)
    ctx.strokeStyle = ECHO_PALETTE.archiveGridLineSecondary;
    ctx.lineWidth = 1;

    const bgGridSize = 80;
    const bgOffsetX = (elapsed * 5) % bgGridSize;
    const bgOffsetY = (elapsed * 3) % bgGridSize;

    for (let x = bgOffsetX; x < width; x += bgGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = bgOffsetY; y < height; y += bgGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Layer 2: Foreground Digital Matrix Grid
    ctx.strokeStyle = ECHO_PALETTE.archiveGridLine;
    const gridSize = 40;
    const offsetX = (elapsed * 15) % gridSize;
    const offsetY = (elapsed * 10) % gridSize;

    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Layer 3: Memory Stream Data Pillars (Vertical floating data motifs)
    ctx.fillStyle = ECHO_PALETTE.archiveDataStream;
    for (let i = 0; i < 4; i++) {
      const px = ((i * 210 + elapsed * 20) % width);
      const py = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
      ctx.fillRect(px, py, 12 + (i % 2) * 8, 40 + (i % 3) * 30);
    }

    // Ambient particles (corrupted purple vs restored cyan data bits)
    for (let i = 0; i < 6; i++) {
      const px = ((i * 143 + elapsed * 8) % width);
      const py = ((i * 187 + elapsed * 12) % height);
      ctx.fillStyle = i % 2 === 0 ? ECHO_PALETTE.restorationCyanGlow : ECHO_PALETTE.corruptionPurpleGlow;
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

// TODO(refactor): código duplicado detectado (bloque) con platformer/rendering/PlatformerCanvasVisuals.ts:4-10. Considerar extraer a función compartida. Ref: 16b8cacf
export const drawEchoPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:89-104. Considerar extraer a función compartida. Ref: 29a17ac0
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 20;

    const vel = world.getComponent(entity, "Velocity");
    const groundState = world.getComponent(entity, "PlatformerGroundState" as any) as any;
    const input = world.getComponent(entity, "PlatformerInput" as any) as any;
    const health = world.getComponent(entity, "Health" as any) as any;

    const vx = vel ? vel.vx : 0;
    const vy = vel ? vel.vy : 0;
    const isGrounded = groundState ? groundState.isGrounded : true;
    const isAttacking = input && input.pulseCooldown !== undefined && input.pulseCooldown > 0.25;
    const isInvulnerable = health && health.invulnerableRemaining && health.invulnerableRemaining > 0;
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    ctx.save();

    // 1. Hit Flash effect (bright white flash)
    if (isHitFlash) {
      ctx.fillStyle = ECHO_PALETTE.restorationWhite;
      ctx.shadowColor = ECHO_PALETTE.corruptionCrimson;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 2. Invulnerability translucency flickering
    if (isInvulnerable) {
      // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:124-156. Considerar extraer a función compartida. Ref: bb4edea1
      ctx.globalAlpha = 0.4 + 0.5 * Math.sin(world.tick * 0.8);
    }

    // 3. Pose calculations
    let tiltAngle = 0;
    let hoverY = 0;
    let leftLegX = -size * 0.15;
    let leftLegY = size * 0.5;
    let rightLegX = size * 0.15;
    let rightLegY = size * 0.5;

    if (!isGrounded) {
      if (vy < -20) {
        tiltAngle = -0.12;
        leftLegY = size * 0.35;
        rightLegY = size * 0.35;
      } else {
        tiltAngle = 0.08;
        leftLegX = -size * 0.22;
        rightLegX = size * 0.22;
        leftLegY = size * 0.45;
        rightLegY = size * 0.45;
      }
    } else if (Math.abs(vx) > 15) {
      tiltAngle = Math.min(Math.max(vx * 0.0008, -0.2), 0.2);
      const stride = Math.sin(world.tick * 0.4);
      leftLegX = -size * 0.15 + stride * 4;
      leftLegY = size * 0.5 - Math.abs(stride) * 2;
      rightLegX = size * 0.15 - stride * 4;
      rightLegY = size * 0.5 - Math.abs(stride) * 2;
    } else {
      hoverY = Math.sin(world.tick * 0.12) * 1.5;
    }

    ctx.translate(0, hoverY);
    ctx.rotate(tiltAngle);

    // Ground Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.7 - hoverY, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulse attack aura if firing
    if (isAttacking) {
      ctx.strokeStyle = ECHO_PALETTE.restorationCyan;
      ctx.lineWidth = 2;
      ctx.shadowColor = ECHO_PALETTE.restorationCyan;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Main Body Glow
    ctx.shadowColor = ECHO_PALETTE.restorationCyan;
    ctx.shadowBlur = 10;

    // --- Back Asymmetric Antenna (Back of head) ---
    ctx.strokeStyle = ECHO_PALETTE.corruptionCrimson;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.5);
    ctx.lineTo(-size * 0.32, -size * 0.85);
    ctx.stroke();

    ctx.fillStyle = ECHO_PALETTE.corruptionCrimson;
    ctx.beginPath();
    ctx.arc(-size * 0.32, -size * 0.85, 2, 0, Math.PI * 2);
    ctx.fill();

    // --- Head ---
    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = ECHO_PALETTE.restorationCyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.4, size * 0.35, Math.PI, 0);
    ctx.lineTo(0, -size * 0.4);
    ctx.fill();
    ctx.stroke();

    // --- Visor (Asymmetric extending forward +X) ---
    ctx.shadowColor = ECHO_PALETTE.corruptionCrimson;
    ctx.fillStyle = ECHO_PALETTE.corruptionCrimson;
    ctx.beginPath();
    ctx.ellipse(size * 0.08, -size * 0.45, size * 0.24, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Torso ---
    ctx.shadowColor = ECHO_PALETTE.restorationCyan;
    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6, 4);
    } else {
      ctx.rect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6);
    }
    ctx.fill();
    ctx.stroke();

    // --- Energy Core ---
    ctx.fillStyle = isAttacking ? ECHO_PALETTE.restorationWhite : ECHO_PALETTE.restorationCyan;
    ctx.beginPath();
    ctx.arc(0, size * 0.1, isAttacking ? size * 0.16 : size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // --- Front Arm / Cannon ---
    if (isAttacking) {
      ctx.fillStyle = ECHO_PALETTE.restorationCyan;
      ctx.fillRect(size * 0.1, -size * 0.05, size * 0.4, size * 0.18);
      ctx.fillStyle = ECHO_PALETTE.restorationWhite;
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.04, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Thruster Feet / Legs ---
    ctx.fillStyle = ECHO_PALETTE.archiveBorderLight;
    ctx.beginPath();
    ctx.arc(leftLegX, leftLegY, size * 0.08, 0, Math.PI * 2);
    ctx.arc(rightLegX, rightLegY, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Thruster flame particles when jumping/rising
    if (!isGrounded && vy < -20) {
      ctx.fillStyle = ECHO_PALETTE.restorationCyan;
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, leftLegY);
      ctx.lineTo(0, leftLegY + size * 0.35);
      ctx.lineTo(size * 0.15, rightLegY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawMemoryFragment: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:257-267. Considerar extraer a función compartida. Ref: bc2bb5ae
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 16;
    const elapsed = world.tick * 0.016;
    const hoverOffset = Math.sin(elapsed * 6) * 4;

    const runState = world.getResource<any>("RunState");
    const collectedCount = runState?.collectedTemporalIds?.length || 0;
    // Shift color from corrupted purple towards restored cyan as fragment count increases
    const isRestoredProgression = collectedCount >= 5;
    const strokeColor = isRestoredProgression ? ECHO_PALETTE.restorationCyan : ECHO_PALETTE.corruptionPurple;
    const fillColor = isRestoredProgression ? ECHO_PALETTE.restorationCyanGlow : ECHO_PALETTE.corruptionPurpleGlow;

    ctx.save();
    ctx.translate(0, hoverOffset);
    ctx.rotate(elapsed * 1.5);

    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 8;

    // Glowing diamond
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(0, size * 0.6);
    ctx.lineTo(-size * 0.45, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner core
    ctx.fillStyle = ECHO_PALETTE.restorationWhite;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.lineTo(size * 0.18, 0);
    ctx.lineTo(0, size * 0.25);
    ctx.lineTo(-size * 0.18, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:527-532. Considerar extraer a función compartida. Ref: 591adf1a
export const drawMemoryCore: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:320-326. Considerar extraer a función compartida. Ref: ca7fc9e3
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 24;
    const elapsed = world.tick * 0.016;
    const hoverOffset = Math.sin(elapsed * 4) * 6;

    ctx.save();
    ctx.translate(0, hoverOffset);

    // Glow
    ctx.shadowColor = ECHO_PALETTE.restorationGold;
    ctx.shadowBlur = 15;

    // Orbiting ring 1
    ctx.strokeStyle = ECHO_PALETTE.restorationGoldGlow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.3, elapsed * 2, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting ring 2
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.3, -elapsed * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Main Sphere
    const gradient = getMemoryCoreGradient(ctx, size);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con platformer/rendering/PlatformerCanvasVisuals.ts:42-48. Considerar extraer a función compartida. Ref: cd20434f
export const drawCheckpointNode: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:365-370. Considerar extraer a función compartida. Ref: ab5ffc7d
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 32;
    const respawnPoint = world.getComponent(entity, "RespawnPoint" as any) as any;
    const runState = world.getResource<any>("RunState");
    const isActive = runState && respawnPoint && runState.activeCheckpoint === respawnPoint.checkpointId;

    ctx.save();

    const statusColor = isActive ? ECHO_PALETTE.archiveNodeActive : ECHO_PALETTE.archiveNodeInactive;
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 10;

    // Base
    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = ECHO_PALETTE.archiveBorderLight;
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);
    ctx.strokeRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);

    // Pillar
    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.fillRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);
    ctx.strokeRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);

    // Screen
    ctx.fillStyle = statusColor;
    ctx.fillRect(-size * 0.18, -size * 0.4, size * 0.36, size * 0.35);

    // Core symbol
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    if (isActive) {
      ctx.arc(0, -size * 0.22, size * 0.08, 0, Math.PI * 2);
    } else {
      ctx.fillRect(-size * 0.04, -size * 0.3, size * 0.08, size * 0.16);
    }
    ctx.fill();

    ctx.restore();
  }
};

export const drawPulseAttack: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 35;

    ctx.save();

    ctx.shadowColor = ECHO_PALETTE.restorationCyan;
    ctx.shadowBlur = 12;

    const grad = getPulseAttackGradient(ctx, size);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

export const drawSentinel: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:440-445. Considerar extraer a función compartida. Ref: 7e291e2a
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 22;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:607-615. Considerar extraer a función compartida. Ref: 43c99c04
    const state = sm ? sm.currentState : "Patrol";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    ctx.save();

    if (isHitFlash) {
      ctx.fillStyle = ECHO_PALETTE.restorationWhite;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const isAlert = state === "Alert" || state === "Windup";
    const isAttack = state === "Attack";
    const glowColor = isAlert ? ECHO_PALETTE.corruptionAmber : (isAttack ? ECHO_PALETTE.corruptionCrimson : ECHO_PALETTE.corruptionPurple);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    // TELEGRAPHING OVERLAY
    if (isAlert) {
      const pulse = Math.sin(world.tick * 0.5) * 3;
      ctx.fillStyle = ECHO_PALETTE.corruptionAmber;
      ctx.strokeStyle = ECHO_PALETTE.restorationGold;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8 - pulse);
      ctx.lineTo(size * 0.18, -size * 1.1 - pulse);
      ctx.lineTo(-size * 0.18, -size * 1.1 - pulse);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = ECHO_PALETTE.corruptionAmber;
      ctx.lineWidth = 1.5;
      const ringRadius = size * (0.8 + 0.3 * Math.sin(world.tick * 0.3));
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (isAttack) {
      ctx.strokeStyle = ECHO_PALETTE.corruptionCrimson;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer casing
    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sensor Eye
    ctx.fillStyle = isAlert && Math.floor(world.tick / 4) % 2 === 0 ? ECHO_PALETTE.restorationWhite : glowColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Anti-grav hover spikes
    ctx.strokeStyle = ECHO_PALETTE.archiveBorderLight;
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.1);
    ctx.lineTo(-size * 0.6, size * 0.3);
    ctx.moveTo(size * 0.45, size * 0.1);
    ctx.lineTo(size * 0.6, size * 0.3);
    ctx.stroke();

    ctx.restore();
  }
};

export const drawHopper: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:520-525. Considerar extraer a función compartida. Ref: 00bc468b
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:618-627. Considerar extraer a función compartida. Ref: c321974c
    const size = render.size || 24;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Idle";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    ctx.save();

    if (isHitFlash) {
      ctx.fillStyle = ECHO_PALETTE.restorationWhite;
      ctx.fillRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
      ctx.restore();
      return;
    }

    const isAlert = state === "Alert" || state === "Windup" || state === "Compress";
    const isAttack = state === "Attack";
    const glowColor = isAttack ? ECHO_PALETTE.restorationCyan : (isAlert ? ECHO_PALETTE.corruptionAmber : "#10b981");
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    if (isAlert) {
      ctx.fillStyle = ECHO_PALETTE.corruptionAmber;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(-size * 0.2, -size * 0.95);
      ctx.lineTo(size * 0.2, -size * 0.95);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    let scaleX = 1;
    let scaleY = 1;

    if (isAlert) {
      scaleX = 1.3;
      scaleY = 0.7;
    } else if (isAttack) {
      scaleX = 0.8;
      scaleY = 1.25;
    }

    ctx.scale(scaleX, scaleY);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.15, size * 0.3);
    ctx.lineTo(size * 0.15, size * 0.3);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45, 3);
    } else {
      ctx.rect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = glowColor;
    ctx.fillRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.1);

    ctx.restore();
  }
};

export const drawWatcher: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:531-540. Considerar extraer a función compartida. Ref: 6ebf197f
    const size = render.size || 26;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:460-468. Considerar extraer a función compartida. Ref: b04f7395
    const state = sm ? sm.currentState : "Idle";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    ctx.save();

    if (isHitFlash) {
      ctx.fillStyle = ECHO_PALETTE.restorationWhite;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const isAlert = state === "Alert" || state === "Windup";
    const isAttack = state === "Attack";
    const glowColor = isAttack ? ECHO_PALETTE.corruptionCrimson : (isAlert ? ECHO_PALETTE.corruptionAmber : "#3b82f6");

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    if (isAlert || isAttack) {
      ctx.fillStyle = isAttack ? ECHO_PALETTE.corruptionCrimsonGlow : "rgba(249, 115, 22, 0.15)";
      ctx.strokeStyle = isAttack ? ECHO_PALETTE.corruptionCrimson : ECHO_PALETTE.corruptionAmber;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.05);
      ctx.arc(0, -size * 0.05, size * 2.2, -Math.PI * 0.2, Math.PI * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, size * 0.3, size * 0.3, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAlert || isAttack ? glowColor : "rgba(59, 130, 246, 0.4)";
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isAlert && Math.floor(world.tick / 3) % 2 === 0 ? ECHO_PALETTE.restorationWhite : "#60a5fa";
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawCharger: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:679-684. Considerar extraer a función compartida. Ref: d787ce3d
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 28;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Idle";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    ctx.save();

    if (isHitFlash) {
      ctx.fillStyle = ECHO_PALETTE.restorationWhite;
      ctx.beginPath();
      ctx.rect(-size * 0.5, -size * 0.3, size, size * 0.7);
      ctx.fill();
      // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:695-702. Considerar extraer a función compartida. Ref: e32a5cc2
      ctx.restore();
      return;
    }

    const isStunned = state === "Recovery" || state === "Stunned";
    const isAlert = state === "Alert" || state === "Windup";
    const isAttack = state === "Attack";
    const glowColor = isStunned ? ECHO_PALETTE.restorationGold : (isAlert ? ECHO_PALETTE.corruptionAmber : ECHO_PALETTE.corruptionCrimson);

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    if (isAlert) {
      ctx.fillStyle = ECHO_PALETTE.corruptionAmber;
      ctx.strokeStyle = ECHO_PALETTE.restorationGold;
      ctx.lineWidth = 1.5;

      const pulse = (world.tick % 8) * 2;
      ctx.beginPath();
      ctx.moveTo(size * 0.5 + pulse, -size * 0.1);
      ctx.lineTo(size * 0.7 + pulse, 0);
      ctx.lineTo(size * 0.5 + pulse, size * 0.1);
      ctx.stroke();
    } else if (isAttack) {
      ctx.strokeStyle = ECHO_PALETTE.corruptionCrimsonGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.2);
      ctx.lineTo(-size * 0.9, -size * 0.2);
      ctx.moveTo(-size * 0.5, size * 0.1);
      ctx.lineTo(-size * 0.85, size * 0.1);
      ctx.stroke();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.4, size * 0.4);
    ctx.lineTo(-size * 0.4, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = glowColor;
    ctx.fillRect(-size * 0.25, -size * 0.1, size * 0.1, size * 0.3);
    ctx.fillRect(size * 0.15, -size * 0.1, size * 0.1, size * 0.3);

    if (isStunned) {
      const elapsed = world.tick * 0.1;
      ctx.strokeStyle = ECHO_PALETTE.restorationGold;
      // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:753-758. Considerar extraer a función compartida. Ref: 642dd361
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const angle = elapsed + (i * Math.PI * 2) / 3;
        const sx = Math.cos(angle) * (size * 0.6);
        const sy = Math.sin(angle) * (size * 0.2) - size * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
};
