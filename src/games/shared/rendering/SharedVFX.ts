import { World, EffectDrawer, ShapeDrawer, CoreComponentRegistry, RenderComponent, TTLComponent } from "@tiny-aster/core";
// Dynamically import Skia safely to support Node-based Jest tests without throwing
let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {
  // Silent fallback in test environments
}

// -------------------------------------------------------------
// VFX World State Isolation
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

interface VFXWorldState {
  stars: Star[];
  lines: SpeedLine[];
  starsInitialized: boolean;
  warpLinesInitialized: boolean;
  timePhase: number; // Incremented exactly once per render tick to be entity-independent
  cachedCRTGradient?: any; // Cached CanvasRadialGradient
  cachedSkiaShader?: any; // Cached Skia Shader
  lastWidth: number;
  lastHeight: number;
}

const worldStateMap = new WeakMap<World<any>, VFXWorldState>();

function getVFXState(world: World<any>): VFXWorldState {
  let state = worldStateMap.get(world);
  if (!state) {
    state = {
      stars: [],
      lines: [],
      starsInitialized: false,
      warpLinesInitialized: false,
      timePhase: 0,
      lastWidth: 0,
      lastHeight: 0
    };
    worldStateMap.set(world, state);
  }
  return state;
}

// -------------------------------------------------------------
// 1. RetroCRTScanlinesEffect (Canvas & Skia)
// -------------------------------------------------------------

/**
 * HTML5 Canvas CRT effect overlay.
 * Uses zero string allocations and handles local world state isolation.
 */
export const RetroCRTScanlinesEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    // Drive animation phase exactly once per frame
    state.timePhase += 0.04;

    ctx.save();

    // 1. Scanline overlay
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }

    // 2. Radial vignette gradient caching
    if (!state.cachedCRTGradient || state.lastWidth !== width || state.lastHeight !== height) {
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
      state.lastWidth = width;
      state.lastHeight = height;
    }

    ctx.fillStyle = state.cachedCRTGradient;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, width, height);

    // 3. Phosphor flickering (Seeded from renderRandom)
    const randomFlicker = world.renderRandom.next();
    if (randomFlicker > 0.95) {
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.005 + (randomFlicker - 0.95) * 0.15;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
};

/**
 * React Native Skia CRT effect overlay.
 */
export const SkiaRetroCRTScanlinesEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    state.timePhase += 0.04;

    canvas.save();

    const paint = Skia.Paint();

    // 1. Draw scanlines
    paint.setColor(Skia.Color("#000000"));
    paint.setAlphaf(0.15);
    for (let y = 0; y < height; y += 4) {
      canvas.drawRect(Skia.XYWHRect(0, y, width, 2), paint);
    }

    // 2. Radial vignette gradient caching
    if (!state.cachedSkiaShader || state.lastWidth !== width || state.lastHeight !== height) {
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
      state.lastWidth = width;
      state.lastHeight = height;
    }

    paint.setShader(state.cachedSkiaShader);
    paint.setAlphaf(1.0);
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    // 3. Phosphor flickering
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

// -------------------------------------------------------------
// 2. ScrollingStarfieldEffect (Canvas & Skia)
// -------------------------------------------------------------
const STAR_COUNT = 80;

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

export const ScrollingStarfieldEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    if (!state.starsInitialized) {
      initializeStars(world, state);
    }

    ctx.save();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = state.stars[i];

      // Update positions
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = width;
      }

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const currentSize = star.size * twinkle;

      ctx.fillStyle = star.color;
      ctx.fillRect(star.x - currentSize / 2, star.y - currentSize / 2, currentSize, currentSize);
    }

    ctx.restore();
  }
};

export const SkiaScrollingStarfieldEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;
    const state = getVFXState(world);

    if (!state.starsInitialized) {
      initializeStars(world, state);
    }

    canvas.save();

    const paint = Skia.Paint();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = state.stars[i];

      star.x -= star.speed;
      if (star.x < 0) {
        star.x = width;
      }

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
const WARP_LINE_COUNT = 45;

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

export const HyperdriveWarpSpeedLinesEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
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

export const SkiaHyperdriveWarpSpeedLinesEffect: EffectDrawer<any, CoreComponentRegistry> = {
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

export const EnergyShieldBubbleEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size || 35;
    const radius = size * 1.3;

    // Use analytical phase driven entirely by isolated world-time or performance clock to be independent of entities!
    const timePhase = getVFXState(world).timePhase;

    ctx.save();

    const pulseFactor = 1.0 + 0.06 * Math.sin(timePhase);
    const pulseAlpha = 0.4 + 0.15 * Math.sin(timePhase + Math.PI);

    // Outer Neon Ring
    ctx.strokeStyle = "#00f0ff";
    ctx.globalAlpha = pulseAlpha;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * pulseFactor, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Glowing Ring
    ctx.strokeStyle = "#0096ff";
    ctx.globalAlpha = pulseAlpha * 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.85 * pulseFactor, 0, Math.PI * 2);
    ctx.stroke();

    // Energy Arcs (Seeded from renderRandom)
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

export const SkiaEnergyShieldBubbleEffect: ShapeDrawer<any, CoreComponentRegistry> = {
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

    // Outer Ring
    paint.setColor(Skia.Color("#00f0ff"));
    paint.setAlphaf(pulseAlpha);
    paint.setStrokeWidth(3);
    canvas.drawCircle(0, 0, radius * pulseFactor, paint);

    // Inner Ring
    paint.setColor(Skia.Color("#0096ff"));
    paint.setAlphaf(pulseAlpha * 0.6);
    paint.setStrokeWidth(1.5);
    canvas.drawCircle(0, 0, radius * 0.85 * pulseFactor, paint);

    // Energy Arcs
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

export const DebrisShockwaveEffect: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    // Use entity's TTLComponent for perfect one-shot visual progression!
    const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
    let progress = 0.5;

    if (ttl && ttl.timeLeft !== undefined && ttl.remaining !== undefined) {
      const totalLife = ttl.timeLeft || 1.0;
      progress = 1.0 - (ttl.remaining / totalLife);
    } else {
      // Fallback: use isolated world timePhase
      const timePhase = getVFXState(world).timePhase;
      progress = (timePhase % 2) / 2;
    }

    const alpha = 1.0 - progress;
    if (alpha <= 0.01) return;

    const baseSize = render.size || 20;
    const maxRadius = baseSize * 4;
    const currentRadius = maxRadius * progress;

    ctx.save();

    // 1. Secondary plasma blast ring (Zero dynamic strings!)
    ctx.strokeStyle = "#ff7800";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Outer shockwave ring
    ctx.strokeStyle = "#ffdc64";
    ctx.globalAlpha = alpha * 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Radiating Debris sparks (Seeded from renderRandom)
    const rng = world.renderRandom;
    ctx.fillStyle = "#ffb432";
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

export const SkiaDebrisShockwaveEffect: ShapeDrawer<any, CoreComponentRegistry> = {
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
      const timePhase = getVFXState(world).timePhase;
      progress = (timePhase % 2) / 2;
    }

    const alpha = 1.0 - progress;
    if (alpha <= 0.01) return;

    const baseSize = render.size || 20;
    const maxRadius = baseSize * 4;
    const currentRadius = maxRadius * progress;

    canvas.save();

    const paint = Skia.Paint();
    paint.setStyle(Skia.PaintStyle.Stroke);

    // Inner Blast Ring
    paint.setColor(Skia.Color("#ff7800"));
    paint.setAlphaf(alpha);
    paint.setStrokeWidth(4);
    canvas.drawCircle(0, 0, currentRadius, paint);

    // Outer Blast Ring
    paint.setColor(Skia.Color("#ffdc64"));
    paint.setAlphaf(alpha * 0.7);
    paint.setStrokeWidth(2);
    canvas.drawCircle(0, 0, currentRadius * 1.2, paint);

    // Sparks
    const rng = world.renderRandom;
    const sparkPaint = Skia.Paint();
    sparkPaint.setColor(Skia.Color("#ffb432"));
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
