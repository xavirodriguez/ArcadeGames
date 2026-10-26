import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { SHMUP_COLOR_TOKENS } from "./ShmupColorTokens";
import { SHMUP_SUMI_E_THEME } from "./ShmupVisualHelpers";
import { drawSumiESkiaBackdrop } from "./SumiESkiaBackdrop";
import {
  computeShmupParallaxWorld,
  resolveShmupPlayerDrawContext,
  resolveShmupEnemyDrawContext,
  resolveShmupBulletDrawContext,
} from "./ShmupVisualHelpers";

export const drawSkiaShmupPlayer: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const pCtx = resolveShmupPlayerDrawContext(world, entity);
    if (!pCtx || pCtx.shouldBlink) return;

    const { invulnerable, time, size, primaryColor, moveX, isShooting } = pCtx;
    const paint = getPaint();

    canvas.save();

    // Invulnerability shield aura
    if (invulnerable) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
      paint.setStrokeWidth(2.5);
      canvas.drawCircle(0, 0, size * 1.35, paint);

      // Rotating shield notch ring
      canvas.save();
      canvas.rotate((time * 3) * (180 / Math.PI), 0, 0);
      paint.setStrokeWidth(4);
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        canvas.drawCircle(Math.cos(angle) * size * 1.35, Math.sin(angle) * size * 1.35, 3.5, paint);
      }
      canvas.restore();
    }

    // Outer Energy Separation Halo (Dark outline + cyan energy ring)
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 20, 40, 0.6)"));
    paint.setStrokeWidth(3.5);
    canvas.drawCircle(0, 0, size * 1.1, paint);

    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
    paint.setStrokeWidth(1.8);
    canvas.drawCircle(0, 0, size * 1.1, paint);

    // Banking tilt
    const bankAngle = moveX * 0.22;
    canvas.rotate(bankAngle * (180 / Math.PI), 0, 0);

    // Twin Thruster Plumes
    const flicker = 0.85 + 0.28 * Math.sin(time * 36);
    const plumeLength = size * 0.95 * flicker;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    // Left Plume
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.secondary));
    const leftPlume = Skia.Path.Make();
    leftPlume.moveTo(-size * 0.35, size * 0.45);
    leftPlume.lineTo(-size * 0.15, size * 0.45);
    leftPlume.lineTo(-size * 0.25, size * 0.45 + plumeLength);
    leftPlume.close();
    canvas.drawPath(leftPlume, paint);

    // Right Plume
    const rightPlume = Skia.Path.Make();
    rightPlume.moveTo(size * 0.15, size * 0.45);
    rightPlume.lineTo(size * 0.35, size * 0.45);
    rightPlume.lineTo(size * 0.25, size * 0.45 + plumeLength);
    rightPlume.close();
    canvas.drawPath(rightPlume, paint);

    // Fine cyan exhaust filaments complement the twin plumes.
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(colorWithAlpha(SHMUP_COLOR_TOKENS.player.primary, 0.22 + 0.12 * (0.5 + 0.5 * Math.sin(time * 22)))));
    paint.setStrokeWidth(Math.max(1, size * 0.055));
    canvas.drawLine(-size * 0.25, size * 0.78, -size * 0.25, size * 0.78 + plumeLength * 0.58, paint);
    canvas.drawLine(size * 0.25, size * 0.78, size * 0.25, size * 0.78 + plumeLength * 0.58, paint);

    // Core Plumes
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    const leftCore = Skia.Path.Make();
    leftCore.moveTo(-size * 0.3, size * 0.45);
    leftCore.lineTo(-size * 0.2, size * 0.45);
    leftCore.lineTo(-size * 0.25, size * 0.45 + plumeLength * 0.55);
    leftCore.close();
    canvas.drawPath(leftCore, paint);

    const rightCore = Skia.Path.Make();
    rightCore.moveTo(size * 0.2, size * 0.45);
    rightCore.lineTo(size * 0.3, size * 0.45);
    rightCore.lineTo(size * 0.25, size * 0.45 + plumeLength * 0.55);
    rightCore.close();
    canvas.drawPath(rightCore, paint);

    // Main Fighter Jet Hull
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(primaryColor));

    const jetPath = Skia.Path.Make();
    jetPath.moveTo(0, -size * 1.2);
    jetPath.lineTo(size * 0.25, -size * 0.4);
    jetPath.lineTo(size * 1.05, size * 0.4);
    jetPath.lineTo(size * 0.82, size * 0.72);
    jetPath.lineTo(size * 0.42, size * 0.45);
    jetPath.lineTo(size * 0.22, size * 0.65);
    jetPath.lineTo(0, size * 0.5);
    jetPath.lineTo(-size * 0.22, size * 0.65);
    jetPath.lineTo(-size * 0.42, size * 0.45);
    jetPath.lineTo(-size * 0.82, size * 0.72);
    jetPath.lineTo(-size * 1.05, size * 0.4);
    jetPath.lineTo(-size * 0.25, -size * 0.4);
    jetPath.close();
    canvas.drawPath(jetPath, paint);

    // Twin recessed engine housings connect the hull visually to its exhaust plumes.
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.secondary));
    paint.setStrokeWidth(1.5);
    for (const side of [-1, 1]) {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(5, 24, 52, 0.92)"));
      canvas.drawOval(Skia.XYWHRect(side * size * 0.24 - size * 0.085, size * 0.48 - size * 0.065, size * 0.17, size * 0.13), paint);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.secondary));
      canvas.drawOval(Skia.XYWHRect(side * size * 0.24 - size * 0.085, size * 0.48 - size * 0.065, size * 0.17, size * 0.13), paint);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(side * size * 0.24, size * 0.48, size * 0.026, paint);
    }

    // Layered wing armor matching the Canvas renderer.
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(5, 24, 52, 0.72)"));
    const leftInset = Skia.Path.Make();
    leftInset.moveTo(-size * 0.28, -size * 0.28);
    leftInset.lineTo(-size * 0.88, size * 0.37);
    leftInset.lineTo(-size * 0.7, size * 0.53);
    leftInset.lineTo(-size * 0.38, size * 0.31);
    leftInset.close();
    canvas.drawPath(leftInset, paint);
    const rightInset = Skia.Path.Make();
    rightInset.moveTo(size * 0.28, -size * 0.28);
    rightInset.lineTo(size * 0.88, size * 0.37);
    rightInset.lineTo(size * 0.7, size * 0.53);
    rightInset.lineTo(size * 0.38, size * 0.31);
    rightInset.close();
    canvas.drawPath(rightInset, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.secondary));
    paint.setStrokeWidth(2);
    canvas.drawLine(-size * 0.5, size * 0.08, -size * 0.82, size * 0.36, paint);
    canvas.drawLine(size * 0.5, size * 0.08, size * 0.82, size * 0.36, paint);

    // Inner wing panel lines
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    paint.setStrokeWidth(1.6);
    canvas.drawLine(0, -size * 0.85, size * 0.75, size * 0.38, paint);
    canvas.drawLine(0, -size * 0.85, -size * 0.75, size * 0.38, paint);

    // Cockpit Glass Canopy
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    canvas.drawOval(Skia.XYWHRect(-size * 0.2, -size * 0.57, size * 0.4, size * 0.84), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(255, 255, 255, 0.9)"));
    paint.setStrokeWidth(1.5);
    canvas.drawLine(-size * 0.06, -size * 0.48, size * 0.04, -size * 0.24, paint);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.secondary));
    const crest = Skia.Path.Make();
    crest.moveTo(0, -size * 0.92);
    crest.lineTo(size * 0.09, -size * 0.66);
    crest.lineTo(0, -size * 0.56);
    crest.lineTo(-size * 0.09, -size * 0.66);
    crest.close();
    canvas.drawPath(crest, paint);

    if (isShooting) {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(size * 0.85, -size * 0.05, 4.5, paint);
      canvas.drawCircle(-size * 0.85, -size * 0.05, 4.5, paint);
    }

    canvas.restore();
  }
};

export const drawSkiaShmupEnemy: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const eCtx = resolveShmupEnemyDrawContext(world, entity);
    if (!eCtx) return;

    const { size, enemyColor, time, archetype, isTelegraphing } = eCtx;
    const paint = getPaint();

    canvas.save();

    if (isTelegraphing) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.warning));
      paint.setStrokeWidth(2.5);
      const pulse = 1.12 + 0.18 * Math.sin(time * 25);
      canvas.drawCircle(0, 0, size * pulse, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    // Boss presentation: mirror the animated celestial seal used by Canvas.
    if (archetype === "boss") {
      const pulse = 1 + 0.035 * Math.sin(time * 2.4);
      const orbitRadius = size * 1.34 * pulse;
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("rgba(255, 209, 102, 0.32)"));
      paint.setStrokeWidth(Math.max(2, size * 0.035));
      canvas.drawCircle(0, 0, size * 1.17, paint);

      paint.setColor(Skia.Color("rgba(255, 209, 102, 0.78)"));
      paint.setStrokeWidth(Math.max(2, size * 0.045));
      for (let index = 0; index < 4; index += 1) {
        const startDegrees = (time * 0.42 + index * Math.PI / 2) * (180 / Math.PI);
        canvas.drawArc(
          Skia.XYWHRect(-orbitRadius, -orbitRadius, orbitRadius * 2, orbitRadius * 2),
          startDegrees,
          39.6,
          false,
          paint
        );
      }

      const innerRadius = size * (1.02 + 0.025 * Math.sin(time * 1.8));
      paint.setColor(Skia.Color("rgba(242, 93, 187, 0.48)"));
      paint.setStrokeWidth(Math.max(1.5, size * 0.025));
      canvas.drawArc(
        Skia.XYWHRect(-innerRadius, -innerRadius, innerRadius * 2, innerRadius * 2),
        (-time * 0.3) * (180 / Math.PI),
        207,
        false,
        paint
      );
      paint.setStyle(Skia.PaintStyle.Fill);
    }

    // Match the Canvas renderer with flickering rear engines behind each hull.
    if (archetype !== "support") {
      const plumePulse = 0.82 + 0.18 * Math.sin(time * (archetype === "interceptor" ? 34 : 22));
      const engineOffset = archetype === "armored" ? 0.46 : archetype === "boss" ? 0.42 : 0.23;
      const engineAnchorY = archetype === "boss" ? -0.72 : archetype === "armored" ? -0.64 : -0.55;
      const plumeLength = size * (0.34 + plumePulse * 0.3);
      const plumeWidth = archetype === "boss" ? 0.15 : 0.09;
      const plumeColor = archetype === "armored"
        ? SHMUP_COLOR_TOKENS.warning
        : (world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent);

      for (const side of [-1, 1]) {
        const plume = Skia.Path.Make();
        plume.moveTo(side * (engineOffset - plumeWidth) * size, engineAnchorY * size);
        plume.lineTo(side * (engineOffset + plumeWidth) * size, engineAnchorY * size);
        plume.lineTo(side * engineOffset * size, engineAnchorY * size - plumeLength);
        plume.close();
        paint.setColor(Skia.Color(plumeColor));
        canvas.drawPath(plume, paint);

        const core = Skia.Path.Make();
        core.moveTo(side * (engineOffset - plumeWidth * 0.3) * size, engineAnchorY * size);
        core.lineTo(side * (engineOffset + plumeWidth * 0.3) * size, engineAnchorY * size);
        core.lineTo(side * engineOffset * size, engineAnchorY * size - plumeLength * 0.58);
        core.close();
        paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
        canvas.drawPath(core, paint);
      }
    }

    if (archetype === "scout") {
      paint.setColor(Skia.Color(enemyColor));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.1);
      path.lineTo(size * 0.9, -size * 0.25);
      path.lineTo(size * 0.4, -size * 0.85);
      path.lineTo(0, -size * 0.5);
      path.lineTo(-size * 0.4, -size * 0.85);
      path.lineTo(-size * 0.9, -size * 0.25);
      path.close();
      canvas.drawPath(path, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
      canvas.drawCircle(size * 0.8, -size * 0.2, 3.5, paint);
      canvas.drawCircle(-size * 0.8, -size * 0.2, 3.5, paint);

      paint.setColor(Skia.Color((world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent)));
      canvas.drawCircle(0, 0, size * 0.28, paint);

    } else if (archetype === "interceptor") {
      paint.setColor(Skia.Color(enemyColor));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.25);
      path.lineTo(size * 0.7, -size * 0.45);
      path.lineTo(size * 0.2, -size * 0.85);
      path.lineTo(0, -size * 0.6);
      path.lineTo(-size * 0.2, -size * 0.85);
      path.lineTo(-size * 0.7, -size * 0.45);
      path.close();
      canvas.drawPath(path, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color((world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent)));
      paint.setStrokeWidth(2.0);
      canvas.drawLine(0, size * 0.8, size * 0.55, -size * 0.3, paint);
      canvas.drawLine(0, size * 0.8, -size * 0.55, -size * 0.3, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, -size * 0.1, size * 0.28, paint);

    } else if (archetype === "armored") {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.architecture));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 0.95);
      path.lineTo(size * 1.15, size * 0.25);
      path.lineTo(size * 0.85, -size * 0.85);
      path.lineTo(-size * 0.85, -size * 0.85);
      path.lineTo(-size * 1.15, size * 0.25);
      path.close();
      canvas.drawPath(path, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
      canvas.drawCircle(0, 0, size * 0.38, paint);

    } else if (archetype === "support") {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color((world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent)));
      paint.setStrokeWidth(2.5);
      canvas.drawCircle(0, 0, size * 0.95, paint);

      // Rotating orbital gold nodes
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
      const orbAngle = time * 2.5;
      for (let i = 0; i < 3; i++) {
        const angle = orbAngle + (i * Math.PI * 2) / 3;
        const ox = Math.cos(angle) * size * 0.95;
        const oy = Math.sin(angle) * size * 0.95;
        canvas.drawCircle(ox, oy, 4, paint);
      }

      paint.setColor(Skia.Color(enemyColor));
      canvas.drawCircle(0, 0, size * 0.55, paint);

      paint.setColor(Skia.Color((world.getResource<string>("ShmupVisualTheme") === "sumi-e" ? SHMUP_SUMI_E_THEME.palette.threat : SHMUP_COLOR_TOKENS.enemy.accent)));
      canvas.drawCircle(0, 0, size * 0.28, paint);

    } else {
      paint.setColor(Skia.Color(enemyColor));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.15);
      path.lineTo(size * 1.25, -size * 0.35);
      path.lineTo(size * 0.7, -size * 1.0);
      path.lineTo(-size * 0.7, -size * 1.0);
      path.lineTo(-size * 1.25, -size * 0.35);
      path.close();
      canvas.drawPath(path, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.architecture));
      paint.setStrokeWidth(3);
      canvas.drawPath(path, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      const corePulse = 0.85 + 0.3 * Math.sin(time * 10);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
      canvas.drawCircle(0, 0, size * 0.42 * corePulse, paint);
    }

    // Brief white/cyan impact ring and rays while an enemy hit flash is active.
    const hitFlash = Math.max(0, Math.min(1, (eCtx.render.hitFlashFrames ?? 0) / 5));
    if (hitFlash > 0) {
      canvas.save();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(colorWithAlpha(SHMUP_COLOR_TOKENS.player.primary, hitFlash * 0.38)));
      paint.setStrokeWidth(5 + hitFlash * 1.5);
      canvas.drawCircle(0, 0, size * (1.02 + hitFlash * 0.08), paint);
      paint.setColor(Skia.Color(colorWithAlpha(SHMUP_COLOR_TOKENS.player.core, hitFlash * 0.9)));
      paint.setStrokeWidth(1.5 + hitFlash * 2);
      canvas.drawCircle(0, 0, size * (1.02 + hitFlash * 0.08), paint);
      for (let i = 0; i < 4; i += 1) {
        const angle = time * 1.8 + i * Math.PI / 2;
        const innerRadius = size * 0.72;
        const outerRadius = size * (1.05 + hitFlash * 0.25);
        canvas.drawLine(
          Math.cos(angle) * innerRadius,
          Math.sin(angle) * innerRadius,
          Math.cos(angle) * outerRadius,
          Math.sin(angle) * outerRadius,
          paint
        );
      }
      canvas.restore();
    }

    canvas.restore();
  }
};

export const drawSkiaShmupPlayerBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bCtx = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_COLOR_TOKENS.player.primary);
    if (!bCtx) return;

    const { size, color } = bCtx;
    const paint = getPaint();

    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    // Moving pulse gives the laser a crisp capsule silhouette and pointed leading edge.
    const time = world.tick * 0.016;
    const pulse = 0.9 + 0.1 * Math.sin(time * 26);
    paint.setColor(Skia.Color(colorWithAlpha(color, 0.2)));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.95, -size * 3, size * 1.9, size * 6), size * 0.95, size * 0.95), paint);

    paint.setColor(Skia.Color(color));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.62, -size * 2.5, size * 1.24, size * 5), size * 0.62, size * 0.62), paint);

    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.23, -size * 2.12, size * 0.46, size * 4.2 * pulse), size * 0.23, size * 0.23), paint);
    const leadingEdge = Skia.Path.Make();
    leadingEdge.moveTo(0, -size * 2.8);
    leadingEdge.lineTo(size * 0.35, -size * 1.9);
    leadingEdge.lineTo(-size * 0.35, -size * 1.9);
    leadingEdge.close();
    canvas.drawPath(leadingEdge, paint);

    canvas.restore();
  }
};

export const drawSkiaShmupEnemyBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bCtx = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_COLOR_TOKENS.bullet.warm);
    if (!bCtx) return;

    const { size, color, kind } = bCtx;
    const paint = getPaint();

    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);

    if (kind === "hot") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(color));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.8);
      path.lineTo(size * 0.7, -size * 1.0);
      path.lineTo(0, -size * 1.8);
      path.lineTo(-size * 0.7, -size * 1.0);
      path.close();
      canvas.drawPath(path, paint);

      // Dark rim
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      paint.setStrokeWidth(1.8);
      canvas.drawPath(path, paint);

      // White core
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.4, paint);

    } else if (kind === "special") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(color));
      canvas.drawCircle(0, 0, size * 1.35, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      paint.setStrokeWidth(1.8);
      canvas.drawCircle(0, 0, size * 1.35, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.55, paint);

    } else {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(color));
      canvas.drawCircle(0, 0, size, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      paint.setStrokeWidth(1.8);
      canvas.drawCircle(0, 0, size, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.45, paint);
    }

    canvas.restore();
  }
};

function colorWithAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return color;
  const value = match[1] ?? "000000";
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function blendHex(from: string, to: string, amount: number): string {
  const parse = (color: string, offset: number): number => Number.parseInt(color.slice(offset, offset + 2), 16);
  const t = Math.max(0, Math.min(1, amount));
  const channels = [1, 3, 5].map(offset => Math.round(
    parse(from, offset) + (parse(to, offset) - parse(from, offset)) * t
  ));
  return `#${channels.map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
}

export const drawSkiaShmupStarfield: EffectDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    if (world.getResource<string>("ShmupVisualTheme") === "sumi-e") {
      drawSumiESkiaBackdrop.draw(canvas, world);
      return;
    }
    const { width, height, time, biome, clouds, islands, particles } = computeShmupParallaxWorld(world);
    const paint = getPaint();
    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    // Layer 1: stepped vertical gradient with a restrained biome light bloom.
    const gradientSteps = 32;
    for (let i = 0; i < gradientSteps; i += 1) {
      const t0 = i / gradientSteps;
      const t1 = (i + 1) / gradientSteps;
      const color = t0 < 0.55
        ? blendHex(biome.skyTop, biome.skyMid, t0 / 0.55)
        : blendHex(biome.skyMid, biome.skyLight, (t0 - 0.55) / 0.45);
      paint.setColor(Skia.Color(color));
      canvas.drawRect(Skia.XYWHRect(0, height * t0, width, height * (t1 - t0) + 1), paint);
    }

    const glowX = width * biome.glowX;
    const glowY = height * biome.glowY;
    const glowRadius = Math.min(width, height) * biome.glowRadius;
    for (let ring = 8; ring >= 1; ring -= 1) {
      const ratio = ring / 8;
      const radius = glowRadius * ratio;
      const alpha = (biome.atmosphereStyle === "storm" ? 0.15 : 0.18) * (1 - ratio) + 0.015;
      paint.setColor(Skia.Color(colorWithAlpha(biome.glowColor, alpha)));
      canvas.drawCircle(glowX, glowY, radius, paint);
    }

    if (biome.atmosphereStyle === "sunrise") {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(Math.max(2, width * 0.004));
      paint.setColor(Skia.Color(colorWithAlpha(SHMUP_COLOR_TOKENS.gold.sunlight, 0.13)));
      for (let i = -3; i <= 3; i += 1) {
        canvas.drawLine(glowX, glowY + height * 0.04, glowX + i * width * 0.19, height, paint);
      }
    } else if (biome.atmosphereStyle === "garden" || biome.atmosphereStyle === "sacred") {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(width * 0.018);
      const rayColor = biome.rayColor;
      paint.setColor(Skia.Color(colorWithAlpha(rayColor, biome.atmosphereStyle === "garden" ? 0.09 : 0.12)));
      for (let i = 0; i < 7; i += 1) {
        const rayX = width * (0.08 + i * 0.14) + Math.sin(time * 0.18 + i) * width * 0.025;
        canvas.drawLine(rayX - width * 0.035, 0, rayX + width * 0.07, height, paint);
      }
    } else {
      const pulse = Math.max(0, Math.sin(time * 1.35)) ** 8;
      if (pulse > 0.015) {
        const boltX = width * (0.58 + 0.16 * Math.sin(time * 0.23));
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setStrokeWidth(2 + pulse * 3);
        paint.setColor(Skia.Color(colorWithAlpha(biome.lightningColor, 0.18 + pulse * 0.62)));
        const bolt = Skia.Path.Make();
        bolt.moveTo(boltX, 0);
        bolt.lineTo(boltX - width * 0.045, height * 0.12);
        bolt.lineTo(boltX + width * 0.018, height * 0.19);
        bolt.lineTo(boltX - width * 0.08, height * 0.34);
        bolt.lineTo(boltX - width * 0.025, height * 0.41);
        canvas.drawPath(bolt, paint);
        const branch = Skia.Path.Make();
        branch.moveTo(boltX - width * 0.01, height * 0.2);
        branch.lineTo(boltX + width * 0.09, height * 0.29);
        canvas.drawPath(branch, paint);
      }
    }

    // Layer 2: cloud volume and shadows use the same per-biome opacity as Canvas.
    paint.setStyle(Skia.PaintStyle.Fill);
    for (const cloud of clouds) {
      paint.setColor(Skia.Color(colorWithAlpha(biome.cloudShadow, biome.cloudOpacity * 0.62)));
      canvas.drawOval(Skia.XYWHRect(
        cloud.x - cloud.rx * 1.1,
        cloud.y - cloud.ry * 0.85 + cloud.ry * 0.2,
        cloud.rx * 2.2,
        cloud.ry * 1.7
      ), paint);
      paint.setColor(Skia.Color(colorWithAlpha(biome.cloudLight, biome.cloudOpacity)));
      canvas.drawCircle(cloud.x - cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, paint);
      canvas.drawCircle(cloud.x, cloud.y - cloud.ry * 0.25, cloud.ry * 0.95, paint);
      canvas.drawCircle(cloud.x + cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, paint);
    }

    // Layer 3: garden islands, temple ruins and storm crystals have different silhouettes.
    for (const island of islands) {
      if (biome.islandStyle === "crystal") {
        paint.setColor(Skia.Color(biome.crystalShadowColor));
        const rock = Skia.Path.Make();
        rock.moveTo(island.x, island.y + island.height * 0.24);
        rock.lineTo(island.x + island.width * 0.18, island.y + island.height * 0.58);
        rock.lineTo(island.x + island.width * 0.38, island.y + island.height);
        rock.lineTo(island.x + island.width * 0.72, island.y + island.height * 0.68);
        rock.lineTo(island.x + island.width, island.y + island.height * 0.26);
        rock.close();
        canvas.drawPath(rock, paint);
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setStrokeWidth(2);
        paint.setColor(Skia.Color(colorWithAlpha(biome.crystalEdgeColor, 0.7)));
        canvas.drawPath(rock, paint);
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(colorWithAlpha(biome.glowColor, 0.72)));
        const shard = Skia.Path.Make();
        shard.moveTo(island.x + island.width * 0.28, island.y + island.height * 0.42);
        shard.lineTo(island.x + island.width * 0.38, island.y - island.height * 0.12);
        shard.lineTo(island.x + island.width * 0.48, island.y + island.height * 0.42);
        shard.close();
        canvas.drawPath(shard, paint);
      } else {
        paint.setColor(Skia.Color(biome.architectureColor));
        canvas.drawRect(Skia.XYWHRect(island.x, island.y + island.height * 0.3, island.width, island.height * 0.7), paint);
        paint.setColor(Skia.Color(island.color));
        canvas.drawRect(Skia.XYWHRect(island.x - 4, island.y, island.width + 8, island.height * 0.55), paint);

        if (biome.islandStyle === "lush") {
          for (let tree = 0; tree < 3; tree += 1) {
            const treeX = island.x + island.width * (0.22 + tree * 0.28);
            const treeY = island.y + island.height * (0.12 + (tree % 2) * 0.05);
            paint.setColor(Skia.Color(tree % 2 === 0 ? SHMUP_COLOR_TOKENS.foliage.deep : SHMUP_COLOR_TOKENS.foliage.mid));
            canvas.drawCircle(treeX, treeY, island.height * 0.16, paint);
            if (biome.atmosphereStyle === "garden") {
              paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.blossom));
              canvas.drawCircle(treeX + island.height * 0.07, treeY - island.height * 0.04, 2.5, paint);
            }
          }
        }

        if (island.hasArch || biome.islandStyle === "ruins") {
          paint.setColor(Skia.Color(biome.architectureColor));
          const columnWidth = Math.max(6, island.width * 0.075);
          const columnTop = island.y - island.height * 0.28;
          canvas.drawRect(Skia.XYWHRect(island.x + island.width * 0.3, columnTop, columnWidth, island.height * 0.3), paint);
          canvas.drawRect(Skia.XYWHRect(island.x + island.width * 0.62, columnTop, columnWidth, island.height * 0.3), paint);
          canvas.drawRect(Skia.XYWHRect(island.x + island.width * 0.24, columnTop - 5, island.width * 0.52, Math.max(6, island.height * 0.09)), paint);
          paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
          canvas.drawCircle(island.x + island.width * 0.5, columnTop + island.height * 0.03, 4, paint);
        }
      }
    }

    // Layer 4: capped ambient motifs retain their silhouette and rotation.
    for (const particle of particles) {
      canvas.save();
      canvas.rotate(particle.rotation * (180 / Math.PI), particle.x, particle.y);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(colorWithAlpha(particle.color, particle.opacity)));
      if (particle.type === "petal") {
        canvas.drawOval(Skia.XYWHRect(particle.x - particle.size, particle.y - particle.size * 0.5, particle.size * 2, particle.size), paint);
      } else if (particle.type === "crystal" || particle.type === "rune") {
        const shape = Skia.Path.Make();
        shape.moveTo(particle.x, particle.y - particle.size);
        shape.lineTo(particle.x + particle.size * 0.65, particle.y);
        shape.lineTo(particle.x, particle.y + particle.size);
        shape.lineTo(particle.x - particle.size * 0.65, particle.y);
        shape.close();
        canvas.drawPath(shape, paint);
        if (particle.type === "rune") {
          paint.setStyle(Skia.PaintStyle.Stroke);
          paint.setStrokeWidth(1);
          paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
          canvas.drawPath(shape, paint);
        }
      } else {
        canvas.drawCircle(particle.x, particle.y, particle.size * 0.5, paint);
      }
      canvas.restore();
    }

    canvas.restore();
  }
};
