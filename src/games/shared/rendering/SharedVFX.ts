import { World, EffectDrawer, ShapeDrawer, ComponentRegistry, RenderComponent, TTLComponent, Renderer, RendererUtils } from "@tiny-aster/core";
// Dynamically import Skia safely to support Node-based Jest tests without throwing
let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {
  // Silent fallback in test environments
}

// -------------------------------------------------------------
// Constants
// -------------------------------------------------------------
const STAR_COUNT = 80;
const WARP_LINE_COUNT = 45;
const NEBULA_CLOUD_COUNT = 4;
const MATRIX_COLUMN_COUNT = 30;
const ACCRETION_PARTICLE_COUNT = 15;
const TRAIL_LENGTH = 10;

// -------------------------------------------------------------
// VFX World State Isolation & Structures
// -------------------------------------------------------------
interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
  skColor?: any;
}

interface SpeedLine {
  angle: number;
  radius: number;
  length: number;
  speed: number;
  color: string;
  skColor?: any;
}

interface NebulaCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  skColor?: any;
}

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  length: number;
  intensity: number;
}

interface AccretionParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface VFXWorldState {
  stars: Star[];
  lines: SpeedLine[];
  nebulae: NebulaCloud[];
  matrixColumns: MatrixColumn[];
  accretionParticles: AccretionParticle[];
  trailPoints: TrailPoint[];
  starsInitialized: boolean;
  warpLinesInitialized: boolean;
  nebulaeInitialized: boolean;
  matrixInitialized: boolean;
  vortexInitialized: boolean;
  trailInitialized: boolean;
  timePhase: number; // Incremented exactly once per render tick to be entity-independent
  cachedCRTGradient?: any; // Cached CanvasRadialGradient
  cachedSkiaShader?: any; // Cached Skia Shader
  lastWidth: number;
  lastHeight: number;
  lastCRTWidth?: number;
  lastCRTHeight?: number;
}

const worldStateMap = new WeakMap<World<any>, VFXWorldState>();

function getVFXState(world: World<any>): VFXWorldState {
  let state = worldStateMap.get(world);
  if (!state) {
    state = {
      stars: [],
      lines: [],
      nebulae: [],
      matrixColumns: [],
      accretionParticles: [],
      trailPoints: [],
      starsInitialized: false,
      warpLinesInitialized: false,
      nebulaeInitialized: false,
      matrixInitialized: false,
      vortexInitialized: false,
      trailInitialized: false,
      timePhase: 0,
      lastWidth: 0,
      lastHeight: 0
    };
    worldStateMap.set(world, state);
  }
  return state;
}

// -------------------------------------------------------------
// Initializers
// -------------------------------------------------------------
function initializeStars(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const colors = ["#ffffff", "#aaf0ff", "#ffe0aa", "#ffcccc"];

  state.stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const color = colors[rng.nextInt(0, colors.length)];
    state.stars.push({
      x: rng.nextRange(0, 800),
      y: rng.nextRange(0, 600),
      speed: rng.nextRange(0.2, 1.2),
      size: rng.nextRange(1.0, 2.5),
      twinklePhase: rng.nextRange(0, Math.PI * 2),
      twinkleSpeed: rng.nextRange(0.02, 0.08),
      color,
      skColor: Skia ? Skia.Color(color) : null
    });
  }
  state.starsInitialized = true;
}

function initializeLines(world: World<any>, state: VFXWorldState, maxRadius: number) {
  const rng = world.renderRandom;
  const colors = ["#ffffff", "#b4dcff", "#64b4ff"];

  state.lines = [];
  for (let i = 0; i < WARP_LINE_COUNT; i++) {
    const color = colors[rng.nextInt(0, colors.length)];
    state.lines.push({
      angle: rng.nextRange(0, Math.PI * 2),
      radius: rng.nextRange(10, maxRadius),
      length: rng.nextRange(15, 60),
      speed: rng.nextRange(4, 12),
      color,
      skColor: Skia ? Skia.Color(color) : null
    });
  }
  state.warpLinesInitialized = true;
}

function initializeNebulae(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  const colors = ["#4a0082", "#3a0055", "#002a77", "#4b0055"];

  state.nebulae = [];
  for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
    state.nebulae.push({
      x: rng.nextRange(50, 750),
      y: rng.nextRange(50, 550),
      vx: rng.nextRange(-0.05, 0.05),
      vy: rng.nextRange(-0.05, 0.05),
      radius: rng.nextRange(100, 220),
      color: colors[i % colors.length],
      skColor: Skia ? Skia.Color(colors[i % colors.length]) : null
    });
  }
  state.nebulaeInitialized = true;
}

function initializeMatrix(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  state.matrixColumns = [];
  for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
    state.matrixColumns.push({
      x: (i * 800) / MATRIX_COLUMN_COUNT,
      y: rng.nextRange(-400, 0),
      speed: rng.nextRange(2, 6),
      length: rng.nextRange(10, 30),
      intensity: rng.nextRange(0.4, 0.9)
    });
  }
  state.matrixInitialized = true;
}

function initializeVortex(world: World<any>, state: VFXWorldState) {
  const rng = world.renderRandom;
  state.accretionParticles = [];
  for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
    state.accretionParticles.push({
      angle: rng.nextRange(0, Math.PI * 2),
      radius: rng.nextRange(15, 60),
      speed: rng.nextRange(0.05, 0.15),
      size: rng.nextRange(1, 3)
    });
  }
  state.vortexInitialized = true;
}

// =============================================================
// I. ORIGINAL 5 EFFECTS (CANVAS & SKIA)
// =============================================================

// -------------------------------------------------------------
// 1. RetroCRTScanlinesEffect (Canvas & Skia)
// -------------------------------------------------------------
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:372-378. Considerar extraer a función compartida. Ref: feb356c0
export const RetroCRTScanlinesEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:277-283. Considerar extraer a función compartida. Ref: 2cbbd41e
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    state.timePhase += 0.04;

    ctx.save();

    // 1. Scanline overlay
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }

    // 2. Radial vignette gradient caching
    if (!state.cachedCRTGradient || state.lastCRTWidth !== width || state.lastCRTHeight !== height) {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      const grad = ctx.createRadialGradient(
        centerX, centerY, maxRadius * 0.4,
        centerX, centerY, maxRadius
      );
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0.6)");

      state.cachedCRTGradient = grad;
      state.lastCRTWidth = width;
      state.lastCRTHeight = height;
    }

    ctx.fillStyle = state.cachedCRTGradient;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, width, height);

    // 3. Phosphor flickering
    const randomFlicker = world.renderRandom.next();
    if (randomFlicker > 0.95) {
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.005 + (randomFlicker - 0.95) * 0.15;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
};

export const SkiaRetroCRTScanlinesEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:223-229. Considerar extraer a función compartida. Ref: a687d1d0
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    state.timePhase += 0.04;

    canvas.save();

    const paint = Skia.Paint();

    paint.setColor(Skia.Color("#000000"));
    paint.setAlphaf(0.15);
    for (let y = 0; y < height; y += 4) {
      canvas.drawRect(Skia.XYWHRect(0, y, width, 2), paint);
    }

    if (!state.cachedSkiaShader || state.lastCRTWidth !== width || state.lastCRTHeight !== height) {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      state.cachedSkiaShader = Skia.Shader.MakeRadialGradient(
        Skia.Point(centerX, centerY),
        maxRadius,
        [Skia.Color("rgba(0,0,0,0)"), Skia.Color("rgba(0,0,0,0.6)")],
        [0.4, 1.0],
        Skia.TileMode.Clamp
      );
      state.lastCRTWidth = width;
      state.lastCRTHeight = height;
    }

    paint.setShader(state.cachedSkiaShader);
    paint.setAlphaf(1.0);
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    const randomFlicker = world.renderRandom.next();
    if (randomFlicker > 0.95) {
      const flickerPaint = Skia.Paint();
      flickerPaint.setColor(Skia.Color("#ffffff"));
      flickerPaint.setAlphaf(0.005 + (randomFlicker - 0.95) * 0.15);
      canvas.drawRect(Skia.XYWHRect(0, 0, width, height), flickerPaint);
    }

    canvas.restore();
  }
};

/**
 * Registers all shared VFX shape drawers to a Renderer instance for both Canvas and Skia backends.
 */
export function registerSharedVFX(renderer: Renderer<any, any>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("shield_bubble", EnergyShieldBubbleEffect);
      r.registerShape("shockwave", DebrisShockwaveEffect);
      r.registerShape("thruster_flame", ThrusterPlumeFlameEffect);
      r.registerShape("laser_beam", LaserRailBeamEffect);
      r.registerShape("singularity", SingularityVortexEffect);
      r.registerShape("comet_trail", CometMotionTrailEffect);
      r.registerShape("hologram_glitch", RGBHologramGlitchEffect);
      r.registerShape("floating_text", FloatingTextScoreEffect);
    },
    skia: (r) => {
      r.registerShape("shield_bubble", SkiaEnergyShieldBubbleEffect);
      r.registerShape("shockwave", SkiaDebrisShockwaveEffect);
      r.registerShape("thruster_flame", SkiaThrusterPlumeFlameEffect);
      r.registerShape("laser_beam", SkiaLaserRailBeamEffect);
      r.registerShape("singularity", SkiaSingularityVortexEffect);
      r.registerShape("comet_trail", SkiaCometMotionTrailEffect);
      r.registerShape("hologram_glitch", SkiaRGBHologramGlitchEffect);
      r.registerShape("floating_text", SkiaFloatingTextScoreEffect);
    }
  });
}

/**
 * Shared particle creation helper for pooling and zero-allocation particle instantiation.
 * @public
 */
export function createSharedParticle(
  world: World<any, any, any>,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  pool: { acquire: (world: World<any, any, any>, params: any) => number },
  size = 3,
  ttl = 0.8
): number {
  return pool.acquire(world, { x, y, dx, dy, size, color, ttl });
}

// -------------------------------------------------------------
// 2. ScrollingStarfieldEffect (Canvas & Skia)
// -------------------------------------------------------------
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:222-228. Considerar extraer a función compartida. Ref: 2346d9f5
export const ScrollingStarfieldEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:404-410. Considerar extraer a función compartida. Ref: 5267edd1
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    if (!state.starsInitialized) {
      initializeStars(world, state);
    }

    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:413-422. Considerar extraer a función compartida. Ref: 03953eb3
    ctx.save();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = state.stars[i];
      star.x -= star.speed;
      if (star.x < 0) star.x = width;

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const currentSize = star.size * twinkle;

      ctx.fillStyle = star.color;
      ctx.fillRect(star.x - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize);
    }

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:272-277. Considerar extraer a función compartida. Ref: 9309adbb
export const SkiaScrollingStarfieldEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    if (!state.starsInitialized) {
      initializeStars(world, state);
    }

    canvas.save();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:386-395. Considerar extraer a función compartida. Ref: f0187418
    const paint = Skia.Paint();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = state.stars[i];
      star.x -= star.speed;
      if (star.x < 0) star.x = width;

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const currentSize = star.size * twinkle;

      paint.setColor(star.skColor || Skia.Color("#ffffff"));
      canvas.drawRect(
        Skia.XYWHRect(star.x - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize),
        paint
      );
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 3. HyperdriveWarpSpeedLinesEffect (Canvas & Skia)
// -------------------------------------------------------------
export const HyperdriveWarpSpeedLinesEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:484-493. Considerar extraer a función compartida. Ref: d45cd223
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const state = getVFXState(world);

    if (!state.warpLinesInitialized) {
      initializeLines(world, state, maxRadius);
    }

    ctx.save();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:498-514. Considerar extraer a función compartida. Ref: 29333365
    ctx.lineWidth = 1.5;

    for (let i = 0; i < WARP_LINE_COUNT; i++) {
      const line = state.lines[i];
      line.radius += line.speed;
      if (line.radius > maxRadius) {
        const rng = world.renderRandom;
        line.radius = rng.nextRange(10, 50);
        line.angle = rng.nextRange(0, Math.PI * 2);
        line.length = rng.nextRange(15, 60);
        line.speed = rng.nextRange(4, 12);
      }

      const x1 = centerX + Math.cos(line.angle) * line.radius;
      const y1 = centerY + Math.sin(line.angle) * line.radius;
      const x2 = centerX + Math.cos(line.angle) * (line.radius + line.length);
      const y2 = centerY + Math.sin(line.angle) * (line.radius + line.length);

      ctx.strokeStyle = line.color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaHyperdriveWarpSpeedLinesEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const state = getVFXState(world);

    if (!state.warpLinesInitialized) {
      initializeLines(world, state, maxRadius);
    }

    canvas.save();
    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:459-475. Considerar extraer a función compartida. Ref: ddaf91f3
    paint.setStrokeWidth(1.5);

    for (let i = 0; i < WARP_LINE_COUNT; i++) {
      const line = state.lines[i];
      line.radius += line.speed;
      if (line.radius > maxRadius) {
        const rng = world.renderRandom;
        line.radius = rng.nextRange(10, 50);
        line.angle = rng.nextRange(0, Math.PI * 2);
        line.length = rng.nextRange(15, 60);
        line.speed = rng.nextRange(4, 12);
      }

      const x1 = centerX + Math.cos(line.angle) * line.radius;
      const y1 = centerY + Math.sin(line.angle) * line.radius;
      const x2 = centerX + Math.cos(line.angle) * (line.radius + line.length);
      const y2 = centerY + Math.sin(line.angle) * (line.radius + line.length);

      paint.setColor(line.skColor || Skia.Color("#ffffff"));
      canvas.drawLine(x1, y1, x2, y2, paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 4. EnergyShieldBubbleEffect (Canvas & Skia)
// -------------------------------------------------------------
export const EnergyShieldBubbleEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 35;
    const radius = size * 1.3;
    const timePhase = getVFXState(world).timePhase;

    ctx.save();

    const pulseFactor = 1.0 + 0.06 * Math.sin(timePhase);
    const pulseAlpha = 0.4 + 0.15 * Math.sin(timePhase + Math.PI);

    ctx.strokeStyle = "#00f0ff";
    ctx.globalAlpha = pulseAlpha;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * pulseFactor, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#0096ff";
    ctx.globalAlpha = pulseAlpha * 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.85 * pulseFactor, 0, Math.PI * 2);
    ctx.stroke();

    const rng = world.renderRandom;
    ctx.strokeStyle = "#b4ffff";
    ctx.lineWidth = 2;

    for (let i = 0; i < 3; i++) {
      const arcStart = rng.nextRange(0, Math.PI * 2);
      const arcLen = rng.nextRange(0.2, 0.7);
      ctx.globalAlpha = pulseAlpha * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, radius * pulseFactor, arcStart, arcStart + arcLen);
      ctx.stroke();
    }

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:978-984. Considerar extraer a función compartida. Ref: f91f9998
export const SkiaEnergyShieldBubbleEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 35;
    const radius = size * 1.3;
    const timePhase = getVFXState(world).timePhase;

    canvas.save();

    const pulseFactor = 1.0 + 0.06 * Math.sin(timePhase);
    const pulseAlpha = 0.4 + 0.15 * Math.sin(timePhase + Math.PI);

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);

    paint.setColor(Skia.Color("#00f0ff"));
    paint.setAlphaf(pulseAlpha);
    paint.setStrokeWidth(3);
    canvas.drawCircle(0, 0, radius * pulseFactor, paint);

    paint.setColor(Skia.Color("#0096ff"));
    paint.setAlphaf(pulseAlpha * 0.6);
    paint.setStrokeWidth(1.5);
    canvas.drawCircle(0, 0, radius * 0.85 * pulseFactor, paint);

    const rng = world.renderRandom;
    paint.setColor(Skia.Color("#b4ffff"));
    paint.setStrokeWidth(2);

    for (let i = 0; i < 3; i++) {
      const arcStart = rng.nextRange(0, Math.PI * 2);
      const arcLen = rng.nextRange(0.2, 0.7);
      paint.setAlphaf(pulseAlpha * 0.8);

      const path = Skia.Path.Make();
      path.addArc(
        Skia.XYWHRect(-radius * pulseFactor, -radius * pulseFactor, radius * pulseFactor * 2, radius * pulseFactor * 2),
        (arcStart * 180) / Math.PI,
        (arcLen * 180) / Math.PI
      );
      canvas.drawPath(path, paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 5. DebrisShockwaveEffect (Canvas & Skia)
// -------------------------------------------------------------
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1410-1426. Considerar extraer a función compartida. Ref: 9e2f447d
export const DebrisShockwaveEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:696-714. Considerar extraer a función compartida. Ref: 4acbb34e
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
    let progress = 0.5;

    if (ttl && ttl.timeLeft !== undefined && ttl.remaining !== undefined) {
      const totalLife = ttl.timeLeft || 1.0;
      progress = 1.0 - (ttl.remaining / totalLife);
    } else {
      progress = (getVFXState(world).timePhase % 2) / 2;
    }

    const alpha = 1.0 - progress;
    if (alpha <= 0.01) return;

    const baseSize = render.size || 20;
    const maxRadius = baseSize * 4;
    const currentRadius = maxRadius * progress;

    ctx.save();

    ctx.strokeStyle = "#ff7800";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#ffdc64";
    ctx.globalAlpha = alpha * 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    const rng = world.renderRandom;
    ctx.fillStyle = "#ffb432";
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:733-741. Considerar extraer a función compartida. Ref: 2f09c167
    ctx.globalAlpha = alpha;

    for (let i = 0; i < 8; i++) {
      const angle = rng.nextRange(0, Math.PI * 2);
      const distFactor = rng.nextRange(0.6, 1.4);
      const sparkDist = currentRadius * distFactor;
      const sparkX = Math.cos(angle) * sparkDist;
      const sparkY = Math.sin(angle) * sparkDist;
      const sparkSize = rng.nextRange(1.5, 3.5);

      ctx.fillRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize);
    }

    ctx.restore();
  }
};

export const SkiaDebrisShockwaveEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:627-645. Considerar extraer a función compartida. Ref: 1cf0b2c5
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
    let progress = 0.5;

    if (ttl && ttl.timeLeft !== undefined && ttl.remaining !== undefined) {
      const totalLife = ttl.timeLeft || 1.0;
      progress = 1.0 - (ttl.remaining / totalLife);
    } else {
      progress = (getVFXState(world).timePhase % 2) / 2;
    }

    const alpha = 1.0 - progress;
    if (alpha <= 0.01) return;

    const baseSize = render.size || 20;
    const maxRadius = baseSize * 4;
    const currentRadius = maxRadius * progress;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);

    paint.setColor(Skia.Color("#ff7800"));
    paint.setAlphaf(alpha);
    paint.setStrokeWidth(4);
    canvas.drawCircle(0, 0, currentRadius, paint);

    paint.setColor(Skia.Color("#ffdc64"));
    paint.setAlphaf(alpha * 0.7);
    paint.setStrokeWidth(2);
    canvas.drawCircle(0, 0, currentRadius * 1.2, paint);

    const rng = world.renderRandom;
    const sparkPaint = Skia.Paint();
    sparkPaint.setColor(Skia.Color("#ffb432"));
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:675-683. Considerar extraer a función compartida. Ref: a9552617
    sparkPaint.setAlphaf(alpha);

    for (let i = 0; i < 8; i++) {
      const angle = rng.nextRange(0, Math.PI * 2);
      const distFactor = rng.nextRange(0.6, 1.4);
      const sparkDist = currentRadius * distFactor;
      const sparkX = Math.cos(angle) * sparkDist;
      const sparkY = Math.sin(angle) * sparkDist;
      const sparkSize = rng.nextRange(1.5, 3.5);

      canvas.drawRect(
        Skia.XYWHRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize),
        sparkPaint
      );
    }

    canvas.restore();
  }
};

// =============================================================
// II. 10 NEW ADDITIONAL EFFECTS (CANVAS & SKIA)
// =============================================================

// -------------------------------------------------------------
// 6. DriftingNebulaBackgroundEffect (Canvas & Skia)
// -------------------------------------------------------------
export const DriftingNebulaBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const state = getVFXState(world);
    if (!state.nebulaeInitialized) {
      initializeNebulae(world, state);
    }

    ctx.save();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = state.nebulae[i];
      neb.x += neb.vx;
      neb.y += neb.vy;

      // Concentric soft circles with decaying opacities - NO string / gradient allocations per frame!
      ctx.fillStyle = neb.color;
      ctx.globalAlpha = 0.015;
      for (let r = neb.radius; r > 10; r -= 15) {
        ctx.beginPath();
        ctx.arc(neb.x, neb.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
};

export const SkiaDriftingNebulaBackgroundEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const state = getVFXState(world);
    if (!state.nebulaeInitialized) {
      initializeNebulae(world, state);
    }

    canvas.save();
    const paint = Skia.Paint();

    for (let i = 0; i < NEBULA_CLOUD_COUNT; i++) {
      const neb = state.nebulae[i];
      neb.x += neb.vx;
      neb.y += neb.vy;

      paint.setColor(neb.skColor || Skia.Color("#4a0082"));
      paint.setAlphaf(0.015);
      for (let r = neb.radius; r > 10; r -= 15) {
        canvas.drawCircle(neb.x, neb.y, r, paint);
      }
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 7. MatrixDigitalRainEffect (Canvas & Skia)
// -------------------------------------------------------------
export const MatrixDigitalRainEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:848-854. Considerar extraer a función compartida. Ref: 6a369da9
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { height } = screen;
    const state = getVFXState(world);

    if (!state.matrixInitialized) {
      initializeMatrix(world, state);
    }

    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:857-863. Considerar extraer a función compartida. Ref: 777ba080
    ctx.save();

    for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
      const col = state.matrixColumns[i];
      col.y += col.speed;
      if (col.y > height) {
        col.y = -150;
        col.speed = world.renderRandom.nextRange(2, 6);
      }

      // Draw streaming pixel cubes rather than allocating strings per frame
      ctx.fillStyle = "#00ff33";
      ctx.globalAlpha = col.intensity * 0.15;
      for (let j = 0; j < col.length; j++) {
        ctx.fillRect(col.x, col.y - j * 8, 4, 6);
      }

      // Leading bright tip
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = col.intensity;
      ctx.fillRect(col.x, col.y, 4, 6);
    }

    ctx.restore();
  }
};

export const SkiaMatrixDigitalRainEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { height } = screen;
    const state = getVFXState(world);

    if (!state.matrixInitialized) {
      initializeMatrix(world, state);
    }

    canvas.save();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:831-837. Considerar extraer a función compartida. Ref: 6c495825
    const paint = Skia.Paint();

    for (let i = 0; i < MATRIX_COLUMN_COUNT; i++) {
      const col = state.matrixColumns[i];
      col.y += col.speed;
      if (col.y > height) {
        col.y = -150;
      }

      paint.setColor(Skia.Color("#00ff33"));
      paint.setAlphaf(col.intensity * 0.15);
      for (let j = 0; j < col.length; j++) {
        canvas.drawRect(Skia.XYWHRect(col.x, col.y - j * 8, 4, 6), paint);
      }

      // Bright tip
      paint.setColor(Skia.Color("#ffffff"));
      paint.setAlphaf(col.intensity);
      canvas.drawRect(Skia.XYWHRect(col.x, col.y, 4, 6), paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 8. CRTGlitchShudderEffect (Canvas & Skia)
// -------------------------------------------------------------
export const CRTGlitchShudderEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:914-920. Considerar extraer a función compartida. Ref: 90aca425
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;

    const rng = world.renderRandom;
    if (rng.next() < 0.96) return; // Keep glitches highly responsive & sparse

    ctx.save();

    const glitchLines = rng.nextInt(2, 5);
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:924-928. Considerar extraer a función compartida. Ref: 9fea618b
    ctx.fillStyle = "#ffffff";

    for (let i = 0; i < glitchLines; i++) {
      const y = rng.nextRange(10, height - 10);
      const h = rng.nextRange(1, 4);
      const offset = rng.nextRange(-15, 15);

      ctx.globalAlpha = rng.nextRange(0.2, 0.5);
      ctx.fillRect(offset, y, width, h);
    }

    ctx.restore();
  }
};

export const SkiaCRTGlitchShudderEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;

    const rng = world.renderRandom;
    if (rng.next() < 0.96) return;

    canvas.save();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#ffffff"));

    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:911-916. Considerar extraer a función compartida. Ref: 395935ec
    const glitchLines = rng.nextInt(2, 5);
    for (let i = 0; i < glitchLines; i++) {
      const y = rng.nextRange(10, height - 10);
      const h = rng.nextRange(1, 4);
      const offset = rng.nextRange(-15, 15);

      paint.setAlphaf(rng.nextRange(0.2, 0.5));
      canvas.drawRect(Skia.XYWHRect(offset, y, width, h), paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 9. ThrusterPlumeFlameEffect (Canvas & Skia)
// -------------------------------------------------------------
export const ThrusterPlumeFlameEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 10;
    const timePhase = getVFXState(world).timePhase;

    ctx.save();

    // Plume flickers analytically using deterministic sine waves
    const flicker = 1.0 + 0.15 * Math.sin(timePhase * 5);
    const plumeLength = size * 2.2 * flicker;

    // Inner fiery cone
    ctx.fillStyle = "#ff5500";
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(0, plumeLength);
    ctx.closePath();
    ctx.fill();

    // Outer plasma core
    ctx.fillStyle = "#ffcc00";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-size / 3, 0);
    ctx.lineTo(size / 3, 0);
    ctx.lineTo(0, plumeLength * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:580-586. Considerar extraer a función compartida. Ref: f6d151ad
export const SkiaThrusterPlumeFlameEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 10;
    const timePhase = getVFXState(world).timePhase;

    canvas.save();

    const flicker = 1.0 + 0.15 * Math.sin(timePhase * 5);
    const plumeLength = size * 2.2 * flicker;

    const paint = Skia.Paint();

    // Fiery cone
    paint.setColor(Skia.Color("#ff5500"));
    const pathOuter = Skia.Path.Make();
    pathOuter.moveTo(-size / 2, 0);
    pathOuter.lineTo(size / 2, 0);
    pathOuter.lineTo(0, plumeLength);
    pathOuter.close();
    canvas.drawPath(pathOuter, paint);

    // Inner cone
    paint.setColor(Skia.Color("#ffcc00"));
    paint.setAlphaf(0.7);
    const pathInner = Skia.Path.Make();
    pathInner.moveTo(-size / 3, 0);
    pathInner.lineTo(size / 3, 0);
    pathInner.lineTo(0, plumeLength * 0.65);
    pathInner.close();
    canvas.drawPath(pathInner, paint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 10. LaserRailBeamEffect (Canvas & Skia)
// -------------------------------------------------------------
export const LaserRailBeamEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const length = render.size || 300;
    const timePhase = getVFXState(world).timePhase;

    ctx.save();

    // 1. Thick Glowing Outer Beam
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 10 + 2 * Math.sin(timePhase * 6);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -length);
    ctx.stroke();

    // 2. White Core
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -length);
    ctx.stroke();

    // 3. Electrical Discharges (Deterministic zig-zags)
    const rng = world.renderRandom;
    ctx.strokeStyle = "#b4ffff";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);

    let curY = 0;
    while (curY > -length) {
      curY -= rng.nextRange(15, 30);
      const curX = rng.nextRange(-10, 10);
      ctx.lineTo(curX, curY);
    }
    ctx.stroke();

    ctx.restore();
  }
};

export const SkiaLaserRailBeamEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const length = render.size || 300;
    const timePhase = getVFXState(world).timePhase;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);

    // Thick Outer Glow
    paint.setColor(Skia.Color("#00ffff"));
    paint.setAlphaf(0.5);
    paint.setStrokeWidth(10 + 2 * Math.sin(timePhase * 6));
    canvas.drawLine(0, 0, 0, -length, paint);

    // White Core
    paint.setColor(Skia.Color("#ffffff"));
    paint.setAlphaf(0.9);
    paint.setStrokeWidth(3);
    canvas.drawLine(0, 0, 0, -length, paint);

    // Electrical discharges
    const rng = world.renderRandom;
    paint.setColor(Skia.Color("#b4ffff"));
    paint.setAlphaf(0.8);
    paint.setStrokeWidth(1);

    const path = Skia.Path.Make();
    path.moveTo(0, 0);

    let curY = 0;
    while (curY > -length) {
      curY -= rng.nextRange(15, 30);
      const curX = rng.nextRange(-10, 10);
      path.lineTo(curX, curY);
    }
    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 11. ScreenBorderGlowEffect (Canvas & Skia)
// -------------------------------------------------------------
export const ScreenBorderGlowEffect: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world) {
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const timePhase = getVFXState(world).timePhase;

    ctx.save();

    // Red alert pulse
    ctx.strokeStyle = "#ff0000";
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin(timePhase * 3);
    ctx.lineWidth = 14;

    ctx.strokeRect(7, 7, width - 14, height - 14);

    ctx.restore();
  }
};

export const SkiaScreenBorderGlowEffect: EffectDrawer<any, ComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const timePhase = getVFXState(world).timePhase;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#ff0000"));
    paint.setAlphaf(0.12 + 0.08 * Math.sin(timePhase * 3));
    paint.setStrokeWidth(14);

    canvas.drawRect(Skia.XYWHRect(7, 7, width - 14, height - 14), paint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 12. SingularityVortexEffect (Canvas & Skia)
// -------------------------------------------------------------
export const SingularityVortexEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1217-1225. Considerar extraer a función compartida. Ref: ff4fc95f
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const baseSize = render.size || 30;
    const state = getVFXState(world);

    if (!state.vortexInitialized) {
      initializeVortex(world, state);
    }

    ctx.save();

    // 1. Accretion Disk (Concentric spiraling glowing paths)
    ctx.strokeStyle = "#9900ff";
    ctx.globalAlpha = 0.3;
    for (let r = baseSize; r > 5; r -= 6) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Black Hole Center
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, baseSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Spiraling Matter Particles
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1246-1255. Considerar extraer a función compartida. Ref: 0e31a971
    ctx.fillStyle = "#ff00ff";
    for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
      const p = state.accretionParticles[i];
      p.angle -= p.speed; // Swirl
      p.radius -= 0.2; // Fall in

      if (p.radius < 5) {
        const rng = world.renderRandom;
        p.radius = rng.nextRange(baseSize * 0.8, baseSize * 1.5);
        p.angle = rng.nextRange(0, Math.PI * 2);
      }

      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    }

    ctx.restore();
  }
};

export const SkiaSingularityVortexEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const baseSize = render.size || 30;
    const state = getVFXState(world);

    if (!state.vortexInitialized) {
      initializeVortex(world, state);
    }

    canvas.save();
    const paint = Skia.Paint();

    // Accretion disk rings
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#9900ff"));
    paint.setAlphaf(0.3);
    for (let r = baseSize; r > 5; r -= 6) {
      paint.setStrokeWidth(2);
      canvas.drawCircle(0, 0, r, paint);
    }

    // Black Hole Center
    const centerPaint = Skia.Paint();
    centerPaint.setColor(Skia.Color("#000000"));
    canvas.drawCircle(0, 0, baseSize * 0.4, centerPaint);

    // Particles
    const pPaint = Skia.Paint();
    // TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:1210-1218. Considerar extraer a función compartida. Ref: 375483f3
    pPaint.setColor(Skia.Color("#ff00ff"));

    for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
      const p = state.accretionParticles[i];
      p.angle -= p.speed;
      p.radius -= 0.2;

      if (p.radius < 5) {
        const rng = world.renderRandom;
        p.radius = rng.nextRange(baseSize * 0.8, baseSize * 1.5);
      }

      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      canvas.drawRect(Skia.XYWHRect(x - p.size / 2, y - p.size / 2, p.size, p.size), pPaint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 13. CometMotionTrailEffect (ShapeDrawer)
// -------------------------------------------------------------
export const CometMotionTrailEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 15;
    const timePhase = getVFXState(world).timePhase;

    ctx.save();

    // Renders a tapering neon plume trailing behind using pre-calculated angles
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 1;

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const alpha = 0.5 * (1.0 - i / TRAIL_LENGTH);
      ctx.globalAlpha = alpha;

      const offset = (i + 1) * 3;
      const wiggle = 2 * Math.sin(timePhase * 4 + i);

      ctx.beginPath();
      ctx.arc(wiggle, offset, size * (1.0 - i / TRAIL_LENGTH), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const SkiaCometMotionTrailEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 15;
    const timePhase = getVFXState(world).timePhase;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#00ffcc"));
    paint.setStrokeWidth(1);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const alpha = 0.5 * (1.0 - i / TRAIL_LENGTH);
      paint.setAlphaf(alpha);

      const offset = (i + 1) * 3;
      const wiggle = 2 * Math.sin(timePhase * 4 + i);

      canvas.drawCircle(wiggle, offset, size * (1.0 - i / TRAIL_LENGTH), paint);
    }

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 14. RGBHologramGlitchEffect (ShapeDrawer)
// -------------------------------------------------------------
export const RGBHologramGlitchEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 20;
    const timePhase = getVFXState(world).timePhase;

    ctx.save();

    const glitchOffset = 2 + 1.5 * Math.sin(timePhase * 10);

    // Cyan Ghost Layer
    ctx.strokeStyle = "#00ffff";
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-glitchOffset, 0, size, 0, Math.PI * 2);
    ctx.stroke();

    // Magenta Ghost Layer
    ctx.strokeStyle = "#ff00ff";
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(glitchOffset, 0, size, 0, Math.PI * 2);
    ctx.stroke();

    // Center Primary Core
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
};

export const SkiaRGBHologramGlitchEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 20;
    const timePhase = getVFXState(world).timePhase;

    canvas.save();

    const glitchOffset = 2 + 1.5 * Math.sin(timePhase * 10);

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);

    // Cyan Ghost
    paint.setColor(Skia.Color("#00ffff"));
    paint.setAlphaf(0.4);
    canvas.drawCircle(-glitchOffset, 0, size, paint);

    // Magenta Ghost
    paint.setColor(Skia.Color("#ff00ff"));
    paint.setAlphaf(0.4);
    canvas.drawCircle(glitchOffset, 0, size, paint);

    // White Core
    paint.setColor(Skia.Color("#ffffff"));
    paint.setAlphaf(0.9);
    canvas.drawCircle(0, 0, size * 0.9, paint);

    canvas.restore();
  }
};

// -------------------------------------------------------------
// 15. FloatingTextScoreEffect (ShapeDrawer)
// -------------------------------------------------------------
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:634-650. Considerar extraer a función compartida. Ref: a3bdea7c
export const FloatingTextScoreEffect: ShapeDrawer<CanvasRenderingContext2D, ComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
    let progress = 0.5;

    if (ttl && ttl.timeLeft !== undefined && ttl.remaining !== undefined) {
      const totalLife = ttl.timeLeft || 1.0;
      progress = 1.0 - (ttl.remaining / totalLife);
    } else {
      progress = (getVFXState(world).timePhase % 2) / 2;
    }

    const alpha = 1.0 - progress;
    if (alpha <= 0.01) return;

    ctx.save();

    // Fades and floats upward
    ctx.fillStyle = "#ffd700";
    ctx.globalAlpha = alpha;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";

    // Draw the static text representatively to avoid frame allocations
    ctx.fillText("CRITICAL! +100", 0, -progress * 50);

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/SharedVFX.ts:682-699. Considerar extraer a función compartida. Ref: 0d074f4b
export const SkiaFloatingTextScoreEffect: ShapeDrawer<any, ComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
    let progress = 0.5;

    if (ttl && ttl.timeLeft !== undefined && ttl.remaining !== undefined) {
      const totalLife = ttl.timeLeft || 1.0;
      progress = 1.0 - (ttl.remaining / totalLife);
    } else {
      progress = (getVFXState(world).timePhase % 2) / 2;
    }

    const alpha = 1.0 - progress;
    if (alpha <= 0.01) return;

    canvas.save();

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#ffd700"));
    paint.setAlphaf(alpha);

    // Skia draws text or representative indicator cubes cleanly
    canvas.drawRect(Skia.XYWHRect(-10, -progress * 50, 20, 6), paint);

    canvas.restore();
  }
};
