import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
// TODO(refactor): código duplicado detectado (bloque) con asteroids/rendering/AsteroidsSkiaVisuals.ts:4-17. Considerar extraer a función compartida. Ref: ab23c6ab
import { ECHO_PALETTE } from "./EchoRunnerPalette";

import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

export const drawSkiaEchoBackground: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:43-50. Considerar extraer a función compartida. Ref: 124bbcae
    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const width = screenConfig.width;
    const height = screenConfig.height;
    const runState = world.getResource<any>("RunState");
    const elapsed = runState?.elapsedTime || (world.tick * 0.016);

    const paint = getPaint();

    // Solid Archive Void background
    paint.reset();
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveVoidDark));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    // Parallax distant memory grid
    const bgGridSize = 80;
    const bgOffsetX = (elapsed * 5) % bgGridSize;
    const bgOffsetY = (elapsed * 3) % bgGridSize;

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveGridLineSecondary));
    paint.setStrokeWidth(1.0);

    for (let x = bgOffsetX; x < width; x += bgGridSize) {
      canvas.drawLine(x, 0, x, height, paint);
    }
    for (let y = bgOffsetY; y < height; y += bgGridSize) {
      canvas.drawLine(0, y, width, y, paint);
    }

    // Foreground digital matrix grid
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveGridLine));
    const gridSize = 40;
    const offsetX = (elapsed * 15) % gridSize;
    const offsetY = (elapsed * 10) % gridSize;

    for (let x = offsetX; x < width; x += gridSize) {
      canvas.drawLine(x, 0, x, height, paint);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      canvas.drawLine(0, y, width, y, paint);
    }

    // Data Pillars (motifs)
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveDataStream));
    for (let i = 0; i < 4; i++) {
      const px = (i * 210 + elapsed * 20) % width;
      const py = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
      canvas.drawRect(Skia.XYWHRect(px, py, 12 + (i % 2) * 8, 40 + (i % 3) * 30), paint);
    }

    // Ambient circuit dots
    for (let i = 0; i < 6; i++) {
      const px = (i * 143 + elapsed * 8) % width;
      const py = (i * 187 + elapsed * 12) % height;
      paint.setColor(Skia.Color(i % 2 === 0 ? ECHO_PALETTE.restorationCyanGlow : ECHO_PALETTE.corruptionPurpleGlow));
      canvas.drawCircle(px, py, 2 + (i % 3), paint);
    }
  }
};

export const drawSkiaEchoPlayer: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:115-129. Considerar extraer a función compartida. Ref: 29a17ac0
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
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:444-455. Considerar extraer a función compartida. Ref: bc17a39d
    const isInvulnerable = health && health.invulnerableRemaining && health.invulnerableRemaining > 0;
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    const paint = getPaint();
    canvas.save();

    // 1. Hit Flash effect
    if (isHitFlash) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));
      canvas.drawCircle(0, 0, size * 0.65, paint);
      canvas.restore();
      return;
    }

    // 2. Invulnerability translucency
    let alpha = 1.0;
    if (isInvulnerable) {
      // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:147-179. Considerar extraer a función compartida. Ref: bb4edea1
      alpha = 0.4 + 0.5 * Math.sin(world.tick * 0.8);
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

    canvas.translate(0, hoverY);
    canvas.rotate((tiltAngle * 180) / Math.PI, 0, 0);

    // Shadow
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.35)"));
    paint.setAlphaf(alpha);
    canvas.drawOval(Skia.XYWHRect(-size * 0.5, size * 0.7 - hoverY - size * 0.15, size, size * 0.3), paint);

    // Pulse attack aura
    if (isAttacking) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationCyan));
      paint.setStrokeWidth(2.0);
      paint.setAlphaf(alpha);
      canvas.drawCircle(0, 0, size * 0.85, paint);
    }

    // Back Comms Antenna
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.corruptionCrimson));
    paint.setStrokeWidth(1.5);
    paint.setAlphaf(alpha);
    canvas.drawLine(-size * 0.22, -size * 0.5, -size * 0.32, -size * 0.85, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(-size * 0.32, -size * 0.85, 2, paint);

    // Head
    const headPath = Skia.Path.Make();
    headPath.addArc(Skia.XYWHRect(-size * 0.35, -size * 0.75, size * 0.7, size * 0.7), 180, 180);
    headPath.close();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveSlate));
    paint.setAlphaf(alpha);
    canvas.drawPath(headPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.restorationCyan));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(headPath, paint);

    // Visor
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.corruptionCrimson));
    canvas.drawOval(Skia.XYWHRect(size * 0.08 - size * 0.24, -size * 0.45 - size * 0.07, size * 0.48, size * 0.14), paint);

    // Torso
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderDark));
    paint.setAlphaf(alpha);
    canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6), 4, 4), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.restorationCyan));
    paint.setStrokeWidth(2.0);
    canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6), 4, 4), paint);

    // Energy Core
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(isAttacking ? ECHO_PALETTE.restorationWhite : ECHO_PALETTE.restorationCyan));
    canvas.drawCircle(0, size * 0.1, isAttacking ? size * 0.16 : size * 0.12, paint);

    // Front Arm / Cannon
    if (isAttacking) {
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationCyan));
      canvas.drawRect(Skia.XYWHRect(size * 0.1, -size * 0.05, size * 0.4, size * 0.18), paint);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));
      canvas.drawCircle(size * 0.5, size * 0.04, 3, paint);
    }

    // Feet / Legs
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderLight));
    canvas.drawCircle(leftLegX, leftLegY, size * 0.08, paint);
    canvas.drawCircle(rightLegX, rightLegY, size * 0.08, paint);

    // Thruster flame when jumping
    if (!isGrounded && vy < -20) {
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationCyan));
      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.15, leftLegY);
      flamePath.lineTo(0, leftLegY + size * 0.35);
      flamePath.lineTo(size * 0.15, rightLegY);
      flamePath.close();
      canvas.drawPath(flamePath, paint);
    }

    canvas.restore();
  }
};

export const drawSkiaMemoryFragment: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:287-298. Considerar extraer a función compartida. Ref: bc2bb5ae
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 16;
    const elapsed = world.tick * 0.016;
    const hoverOffset = Math.sin(elapsed * 6) * 4;

    const runState = world.getResource<any>("RunState");
    const collectedCount = runState?.collectedTemporalIds?.length || 0;
    const isRestoredProgression = collectedCount >= 5;
    const strokeColor = isRestoredProgression ? ECHO_PALETTE.restorationCyan : ECHO_PALETTE.corruptionPurple;
    const fillColor = isRestoredProgression ? ECHO_PALETTE.restorationCyanGlow : ECHO_PALETTE.corruptionPurpleGlow;

    const paint = getPaint();
    canvas.save();

    canvas.translate(0, hoverOffset);
    canvas.rotate((elapsed * 1.5 * 180) / Math.PI, 0, 0);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));

    const path = Skia.Path.Make();
    path.moveTo(0, -size * 0.6);
    path.lineTo(size * 0.45, 0);
    path.lineTo(0, size * 0.6);
    path.lineTo(-size * 0.45, 0);
    path.close();

    canvas.drawPath(path, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(strokeColor));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(path, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));

    const corePath = Skia.Path.Make();
    corePath.moveTo(0, -size * 0.25);
    corePath.lineTo(size * 0.18, 0);
    corePath.lineTo(0, size * 0.25);
    corePath.lineTo(-size * 0.18, 0);
    corePath.close();

    canvas.drawPath(corePath, paint);

    canvas.restore();
  }
};

export const drawSkiaMemoryCore: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:337-343. Considerar extraer a función compartida. Ref: ca7fc9e3
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 24;
    const elapsed = world.tick * 0.016;
    const hoverOffset = Math.sin(elapsed * 4) * 6;

    const paint = getPaint();
    canvas.save();

    canvas.translate(0, hoverOffset);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.restorationGoldGlow));
    paint.setStrokeWidth(1.5);

    canvas.save();
    canvas.rotate((elapsed * 2 * 180) / Math.PI, 0, 0);
    canvas.drawOval(Skia.XYWHRect(-size * 0.8, -size * 0.3, size * 1.6, size * 0.6), paint);
    canvas.restore();

    canvas.save();
    canvas.rotate((-elapsed * 1.5 * 180) / Math.PI, 0, 0);
    canvas.drawOval(Skia.XYWHRect(-size * 0.8, -size * 0.3, size * 1.6, size * 0.6), paint);
    canvas.restore();

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.corruptionAmber));
    canvas.drawCircle(0, 0, size * 0.45, paint);

    paint.setColor(Skia.Color(ECHO_PALETTE.restorationGold));
    canvas.drawCircle(0, 0, size * 0.25, paint);

    paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));
    canvas.drawCircle(0, 0, size * 0.1, paint);

    canvas.restore();
  }
};

export const drawSkiaCheckpointNode: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:376-381. Considerar extraer a función compartida. Ref: ab5ffc7d
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 32;
    const respawnPoint = world.getComponent(entity, "RespawnPoint" as any) as any;
    const runState = world.getResource<any>("RunState");
    const isActive = runState && respawnPoint && runState.activeCheckpoint === respawnPoint.checkpointId;

    const paint = getPaint();
    canvas.save();

    const statusColor = isActive ? ECHO_PALETTE.archiveNodeActive : ECHO_PALETTE.archiveNodeInactive;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveSlate));
    canvas.drawRect(Skia.XYWHRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderLight));
    paint.setStrokeWidth(2.0);
    canvas.drawRect(Skia.XYWHRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderDark));
    canvas.drawRect(Skia.XYWHRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderLight));
    canvas.drawRect(Skia.XYWHRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(statusColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.18, -size * 0.4, size * 0.36, size * 0.35), paint);

    paint.setColor(Skia.Color(statusColor));
    if (isActive) {
      canvas.drawCircle(0, -size * 0.22, size * 0.08, paint);
    } else {
      canvas.drawRect(Skia.XYWHRect(-size * 0.04, -size * 0.3, size * 0.08, size * 0.16), paint);
    }

    canvas.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:83-88. Considerar extraer a función compartida. Ref: 595eb79b
export const drawSkiaPulseAttack: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 35;

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.restorationCyanGlow));

    const path = Skia.Path.Make();
    path.moveTo(0, 0);
    path.addArc(Skia.XYWHRect(-size, -size, size * 2, size * 2), -63, 126);
    path.close();

    canvas.drawPath(path, paint);

    paint.setColor(Skia.Color("rgba(255, 255, 255, 0.8)"));
    const innerPath = Skia.Path.Make();
    innerPath.moveTo(0, 0);
    innerPath.addArc(Skia.XYWHRect(-size * 0.5, -size * 0.5, size, size), -50, 100);
    innerPath.close();

    canvas.drawPath(innerPath, paint);

    canvas.restore();
  }
};

export const drawSkiaSentinel: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:445-450. Considerar extraer a función compartida. Ref: 7e291e2a
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 22;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:103-115. Considerar extraer a función compartida. Ref: 4ceee354
    const state = sm ? sm.currentState : "Patrol";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));
      canvas.drawCircle(0, 0, size * 0.5, paint);
      canvas.restore();
      return;
    }

    const isAlert = state === "Alert" || state === "Windup";
    const isAttack = state === "Attack";
    const glowColor = isAlert ? ECHO_PALETTE.corruptionAmber : (isAttack ? ECHO_PALETTE.corruptionCrimson : ECHO_PALETTE.corruptionPurple);

    if (isAlert) {
      const pulse = Math.sin(world.tick * 0.5) * 3;
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ECHO_PALETTE.corruptionAmber));

      const chevron = Skia.Path.Make();
      chevron.moveTo(0, -size * 0.8 - pulse);
      chevron.lineTo(size * 0.18, -size * 1.1 - pulse);
      chevron.lineTo(-size * 0.18, -size * 1.1 - pulse);
      chevron.close();
      canvas.drawPath(chevron, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("rgba(249, 115, 22, 0.6)"));
      paint.setStrokeWidth(1.5);
      const ringRadius = size * (0.8 + 0.3 * Math.sin(world.tick * 0.3));
      canvas.drawCircle(0, 0, ringRadius, paint);
    } else if (isAttack) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(ECHO_PALETTE.corruptionCrimson));
      paint.setStrokeWidth(2.0);
      canvas.drawCircle(0, 0, size * 0.85, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderDark));
    canvas.drawCircle(0, 0, size * 0.45, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size * 0.45, paint);

    const eyeColor = isAlert && Math.floor(world.tick / 4) % 2 === 0 ? ECHO_PALETTE.restorationWhite : glowColor;
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(eyeColor));
    canvas.drawCircle(0, -size * 0.05, size * 0.15, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderLight));
    canvas.drawLine(-size * 0.45, size * 0.1, -size * 0.6, size * 0.3, paint);
    canvas.drawLine(size * 0.45, size * 0.1, size * 0.6, size * 0.3, paint);

    canvas.restore();
  }
};

export const drawSkiaHopper: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:529-534. Considerar extraer a función compartida. Ref: 00bc468b
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:617-630. Considerar extraer a función compartida. Ref: 0a8b5a9d
    const size = render.size || 24;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Idle";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));
      canvas.drawRect(Skia.XYWHRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8), paint);
      canvas.restore();
      return;
    }

    const isAlert = state === "Alert" || state === "Windup" || state === "Compress";
    const isAttack = state === "Attack";
    const glowColor = isAttack ? ECHO_PALETTE.restorationCyan : (isAlert ? ECHO_PALETTE.corruptionAmber : "#10b981");

    if (isAlert) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ECHO_PALETTE.corruptionAmber));

      const path = Skia.Path.Make();
      path.moveTo(0, -size * 0.7);
      path.lineTo(-size * 0.2, -size * 0.95);
      path.lineTo(size * 0.2, -size * 0.95);
      path.close();
      canvas.drawPath(path, paint);
    }

    let scaleX = 1;
    let scaleY = 1;
    if (isAlert) {
      scaleX = 1.3;
      scaleY = 0.7;
    } else if (isAttack) {
      scaleX = 0.8;
      scaleY = 1.25;
    }

    canvas.scale(scaleX, scaleY);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);

    const legPath = Skia.Path.Make();
    legPath.moveTo(0, 0);
    legPath.lineTo(-size * 0.15, size * 0.3);
    legPath.lineTo(size * 0.15, size * 0.3);
    legPath.close();

    canvas.drawPath(legPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveSlate));
    canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45), 3, 3), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45), 3, 3), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.1), paint);

    canvas.restore();
  }
};

export const drawSkiaWatcher: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:603-608. Considerar extraer a función compartida. Ref: f5113641
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerSkiaVisuals.ts:534-547. Considerar extraer a función compartida. Ref: 178811f0
    const size = render.size || 26;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Idle";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));
      canvas.drawCircle(0, 0, size * 0.4, paint);
      canvas.restore();
      return;
    }

    const isAlert = state === "Alert" || state === "Windup";
    const isAttack = state === "Attack";
    const glowColor = isAttack ? ECHO_PALETTE.corruptionCrimson : (isAlert ? ECHO_PALETTE.corruptionAmber : "#3b82f6");

    if (isAlert || isAttack) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(isAttack ? ECHO_PALETTE.corruptionCrimsonGlow : "rgba(249, 115, 22, 0.15)"));

      const conePath = Skia.Path.Make();
      conePath.moveTo(0, -size * 0.05);
      conePath.addArc(Skia.XYWHRect(-size * 2.2, -size * 2.25, size * 4.4, size * 4.4), -36, 72);
      conePath.close();

      canvas.drawPath(conePath, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveBorderDark));

    const bracketPath = Skia.Path.Make();
    bracketPath.addArc(Skia.XYWHRect(-size * 0.3, 0, size * 0.6, size * 0.6), 180, 180);
    bracketPath.close();

    canvas.drawPath(bracketPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(bracketPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveSlate));
    canvas.drawCircle(0, -size * 0.05, size * 0.32, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawCircle(0, -size * 0.05, size * 0.32, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(isAlert || isAttack ? glowColor : "rgba(59, 130, 246, 0.4)"));
    canvas.drawCircle(0, -size * 0.05, size * 0.18, paint);

    paint.setColor(Skia.Color(isAlert && Math.floor(world.tick / 3) % 2 === 0 ? ECHO_PALETTE.restorationWhite : "#60a5fa"));
    canvas.drawCircle(0, -size * 0.05, size * 0.08, paint);

    canvas.restore();
  }
};

export const drawSkiaCharger: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:671-676. Considerar extraer a función compartida. Ref: d787ce3d
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 28;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Idle";
    const isHitFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationWhite));
      canvas.drawRect(Skia.XYWHRect(-size * 0.5, -size * 0.3, size, size * 0.7), paint);
      // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:685-692. Considerar extraer a función compartida. Ref: e32a5cc2
      canvas.restore();
      return;
    }

    const isStunned = state === "Recovery" || state === "Stunned";
    const isAlert = state === "Alert" || state === "Windup";
    const isAttack = state === "Attack";
    const glowColor = isStunned ? ECHO_PALETTE.restorationGold : (isAlert ? ECHO_PALETTE.corruptionAmber : ECHO_PALETTE.corruptionCrimson);

    if (isAlert) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(ECHO_PALETTE.corruptionAmber));
      paint.setStrokeWidth(1.5);

      const pulse = (world.tick % 8) * 2;
      canvas.drawLine(size * 0.5 + pulse, -size * 0.1, size * 0.7 + pulse, 0, paint);
      canvas.drawLine(size * 0.7 + pulse, 0, size * 0.5 + pulse, size * 0.1, paint);
    } else if (isAttack) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(ECHO_PALETTE.corruptionCrimsonGlow));
      paint.setStrokeWidth(2.0);

      canvas.drawLine(-size * 0.6, -size * 0.2, -size * 0.9, -size * 0.2, paint);
      canvas.drawLine(-size * 0.5, size * 0.1, -size * 0.85, size * 0.1, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ECHO_PALETTE.archiveSlate));

    const bodyPath = Skia.Path.Make();
    bodyPath.moveTo(-size * 0.5, -size * 0.3);
    bodyPath.lineTo(size * 0.5, -size * 0.3);
    bodyPath.lineTo(size * 0.4, size * 0.4);
    bodyPath.lineTo(-size * 0.4, size * 0.4);
    bodyPath.close();

    canvas.drawPath(bodyPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(bodyPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.25, -size * 0.1, size * 0.1, size * 0.3), paint);
    canvas.drawRect(Skia.XYWHRect(size * 0.15, -size * 0.1, size * 0.1, size * 0.3), paint);

    if (isStunned) {
      const elapsed = world.tick * 0.1;
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(ECHO_PALETTE.restorationGold));
      // TODO(refactor): código duplicado detectado (bloque) con echorunner/rendering/EchoRunnerCanvasVisuals.ts:739-744. Considerar extraer a función compartida. Ref: 642dd361
      paint.setStrokeWidth(1.5);
      for (let i = 0; i < 3; i++) {
        const angle = elapsed + (i * Math.PI * 2) / 3;
        const sx = Math.cos(angle) * (size * 0.6);
        const sy = Math.sin(angle) * (size * 0.2) - size * 0.5;
        canvas.drawCircle(sx, sy, 2, paint);
      }
    }

    canvas.restore();
  }
};
