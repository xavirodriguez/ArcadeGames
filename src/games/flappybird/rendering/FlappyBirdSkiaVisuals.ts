import { ShapeDrawer, EffectDrawer, TransformComponent } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {}

let cachedPaint: any = null;
function getPaint(): any {
  if (!cachedPaint && Skia) {
    cachedPaint = Skia.Paint();
  }
  return cachedPaint;
}

// ============================================================================
// ZERO-ALLOCATION PRE-ALLOCATED VISUAL PARTICLE POOL (NEON VOID SPARKS & SHARDS)
// ============================================================================

interface VisualParticle {
  active: boolean;
  type: "spark" | "shard" | "star";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  angle: number;
  angularVelocity: number;
}

const PARTICLE_POOL_SIZE = 150;
const PARTICLE_POOL: VisualParticle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
  active: false,
  type: "spark",
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  life: 0,
  maxLife: 0,
  size: 0,
  color: "",
  angle: 0,
  angularVelocity: 0,
}));

function spawnVisualParticle(
  type: "spark" | "shard" | "star",
  x: number,
  y: number,
  vx: number,
  vy: number,
  maxLife: number,
  size: number,
  color: string,
  angle = 0,
  angularVelocity = 0
): void {
  for (let i = 0; i < PARTICLE_POOL.length; i++) {
    const p = PARTICLE_POOL[i];
    if (!p.active) {
      p.active = true;
      p.type = type;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.size = size;
      p.color = color;
      p.angle = angle;
      p.angularVelocity = angularVelocity;
      break;
    }
  }
}

function updateVisualParticles(): void {
  const dt = 0.016; // Stable target 60FPS tick
  for (let i = 0; i < PARTICLE_POOL.length; i++) {
    const p = PARTICLE_POOL[i];
    if (p.active) {
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.angularVelocity * dt;

      if (p.type === "spark") {
        p.vx *= 0.96;
        p.vy *= 0.96;
      } else if (p.type === "shard") {
        p.vy += 45 * dt; // Gravity drop on hull debris
      }
    }
  }
}

let diamondSparkPath: any = null;
function getDiamondSparkPath(): any {
  if (!diamondSparkPath && Skia) {
    diamondSparkPath = Skia.Path.Make();
    diamondSparkPath.moveTo(2.5, 0);
    diamondSparkPath.lineTo(0, -0.6);
    diamondSparkPath.lineTo(-2.5, 0);
    diamondSparkPath.lineTo(0, 0.6);
    diamondSparkPath.close();
  }
  return diamondSparkPath;
}

let shardPolyPath: any = null;
function getShardPolyPath(): any {
  if (!shardPolyPath && Skia) {
    shardPolyPath = Skia.Path.Make();
    shardPolyPath.moveTo(1.2, -0.8);
    shardPolyPath.lineTo(0.4, 1.1);
    shardPolyPath.lineTo(-1.1, 0.3);
    shardPolyPath.lineTo(-0.6, -1.0);
    shardPolyPath.close();
  }
  return shardPolyPath;
}

function drawSkiaVisualParticles(canvas: any, paint: any): void {
  for (let i = 0; i < PARTICLE_POOL.length; i++) {
    const p = PARTICLE_POOL[i];
    if (!p.active) continue;

    const ratio = p.life / p.maxLife;
    canvas.save();
    canvas.translate(p.x, p.y);
    canvas.rotate((p.angle * 180) / Math.PI, 0, 0);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setAlphaf(ratio);

    if (p.type === "spark") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(p.color));
      const sparkPath = getDiamondSparkPath();
      if (sparkPath) {
        canvas.save();
        canvas.scale(p.size, p.size);
        canvas.drawPath(sparkPath, paint);
        canvas.restore();
      }
    } else if (p.type === "shard") {
      // Titanium hull fragment with red-hot edge
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("#5A6173")); // Titanium hull color
      const shardPath = getShardPolyPath();
      if (shardPath) {
        canvas.save();
        canvas.scale(p.size, p.size);
        canvas.drawPath(shardPath, paint);

        // Red-hot glowing edge
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setColor(Skia.Color("#FF3300"));
        paint.setStrokeWidth(0.6);
        canvas.drawPath(shardPath, paint);
        canvas.restore();
      }
    } else if (p.type === "star") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(p.color));
      canvas.drawRect(Skia.XYWHRect(-p.size / 2, -p.size / 2, p.size, p.size), paint);
    }

    canvas.restore();
  }
}

// ============================================================================
// PLAYER SHIP ("INTERCEPTOR") RENDERING WITH TITANIUM HULL & CYAN COCKPIT
// ============================================================================

interface InterceptorRenderState {
  lastVy: number;
  lastIsAlive: boolean;
  lastNearMissTimer: number;
}

const shipStates = new Map<number, InterceptorRenderState>();

let cachedArrowheadPath: any = null;
function getArrowheadPath(size: number): any {
  if (!cachedArrowheadPath && Skia) {
    cachedArrowheadPath = Skia.Path.Make();
    cachedArrowheadPath.moveTo(size * 1.2, 0);
    cachedArrowheadPath.lineTo(-size * 0.7, -size * 0.85);
    cachedArrowheadPath.lineTo(-size * 0.4, -size * 0.35);
    cachedArrowheadPath.lineTo(-size * 0.55, 0);
    cachedArrowheadPath.lineTo(-size * 0.4, size * 0.35);
    cachedArrowheadPath.lineTo(-size * 0.7, size * 0.85);
    cachedArrowheadPath.close();
  }
  return cachedArrowheadPath;
}

export const drawSkiaFlappyBird: ShapeDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const { size = 15 } = render;
    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    const birdComp = world.getComponent(entity, "Bird");
    if (!transform || !birdComp) return;

    const health = world.getComponent(entity, "Health");
    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    let state = shipStates.get(entity);
    if (!state) {
      state = {
        lastVy: 0,
        lastIsAlive: birdComp.isAlive,
        lastNearMissTimer: birdComp.nearMissTimer,
      };
      shipStates.set(entity, state);
    }

    const vy = birdComp.velocityY;
    const isAlive = birdComp.isAlive;

    // --- TRIGGER SPARKS ON BOOST THRUST ---
    const flapStrength = FLAPPY_CONFIG.FLAP_STRENGTH;
    const hasFlapped = (vy < -150 && state.lastVy >= -150) || (vy === flapStrength && state.lastVy !== flapStrength);
    if (hasFlapped && isAlive) {
      const pCount = 4 + world.renderRandom.nextInt(0, 3);
      for (let i = 0; i < pCount; i++) {
        const angleVal = world.renderRandom.nextRange(160, 200) * (Math.PI / 180);
        const speedVal = world.renderRandom.nextRange(80, 160);
        const pVx = Math.cos(angleVal) * speedVal;
        const pVy = Math.sin(angleVal) * speedVal;
        const lifeVal = world.renderRandom.nextRange(0.2, 0.45);
        const sizeVal = world.renderRandom.nextRange(2, 4);
        const randColor = world.renderRandom.next() > 0.5 ? "#FFFFFF" : "#FFC000";
        spawnVisualParticle("spark", x - size * 0.5, y, pVx, pVy, lifeVal, sizeVal, randColor, angleVal);
      }
    }

    // --- TRIGGER SHARDS & SPARKS ON DEATH ---
    const hasDied = !isAlive && state.lastIsAlive;
    if (hasDied) {
      const sCount = 8 + world.renderRandom.nextInt(0, 4);
      for (let i = 0; i < sCount; i++) {
        const angleVal = world.renderRandom.next() * Math.PI * 2;
        const speedVal = world.renderRandom.nextRange(40, 120);
        const pVx = Math.cos(angleVal) * speedVal;
        const pVy = Math.sin(angleVal) * speedVal;
        const lifeVal = world.renderRandom.nextRange(0.6, 1.1);
        const sizeVal = world.renderRandom.nextRange(3, 6);
        spawnVisualParticle("shard", x, y, pVx, pVy, lifeVal, sizeVal, "#5A6173", angleVal, world.renderRandom.nextRange(-4, 4));
      }
      for (let i = 0; i < 12; i++) {
        const angleVal = world.renderRandom.next() * Math.PI * 2;
        const speedVal = world.renderRandom.nextRange(80, 200);
        const pVx = Math.cos(angleVal) * speedVal;
        const pVy = Math.sin(angleVal) * speedVal;
        const lifeVal = world.renderRandom.nextRange(0.25, 0.5);
        const sizeVal = world.renderRandom.nextRange(2, 5);
        spawnVisualParticle("spark", x, y, pVx, pVy, lifeVal, sizeVal, "#FF3300", angleVal);
      }
    }

    state.lastVy = vy;
    state.lastIsAlive = isAlive;
    state.lastNearMissTimer = birdComp.nearMissTimer;

    let globalOpacity = 1.0;
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if ((render.hitFlashFrames >> 1) % 2 === 0) {
        globalOpacity = 0.35;
      }
    }

    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      globalOpacity = (Math.floor(health.invulnerableRemaining / 100) % 2 === 0) ? 0.35 : 1.0;
    }

    const paint = getPaint();

    canvas.save();

    // Velocity Squash-and-Stretch
    const speed = Math.abs(vy);
    const stretch = Math.min(speed / 900, 0.18);
    let scaleX = 1;
    let scaleY = 1;
    if (vy > 0) {
      scaleX = 1 - stretch * 0.8;
      scaleY = 1 + stretch;
    } else {
      scaleX = 1 + stretch;
      scaleY = 1 - stretch * 0.8;
    }
    canvas.scale(scaleX, scaleY);

    // --- CYAN LIGHT TRAIL ---
    if (isAlive) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("rgba(0, 243, 255, 0.35)"));
      paint.setStrokeWidth(2.0);
      canvas.drawLine(-size * 0.55, 0, -size * 1.8 - Math.min(speed * 0.1, 15), 0, paint);
    }

    // --- THERMONUCLEAR REACTIVE THRUSTER FLAME ---
    if (isAlive) {
      const isBoosting = vy < 0;
      const flicker = 0.85 + 0.15 * Math.sin(world.tick * 0.8);
      const flameLength = (isBoosting ? size * 1.6 : size * 0.75) * flicker;
      const flameWidth = (isBoosting ? size * 0.55 : size * 0.3) * flicker;

      const flameShader = Skia.Shader.MakeLinearGradient(
        Skia.Point(-size * 0.55, 0),
        Skia.Point(-size * 0.55 - flameLength, 0),
        [Skia.Color("#FFFFFF"), Skia.Color("#FFC000"), Skia.Color("#FF3300")],
        [0, 0.35, 1.0],
        Skia.TileMode.Clamp
      );
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setShader(flameShader);
      paint.setAlphaf(globalOpacity);

      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.55, -flameWidth * 0.5);
      flamePath.lineTo(-size * 0.55 - flameLength, 0);
      flamePath.lineTo(-size * 0.55, flameWidth * 0.5);
      flamePath.close();
      canvas.drawPath(flamePath, paint);
    }

    // --- TITANIUM HULL GRADIENT SHADER ---
    let hullColors = [Skia.Color("#5A6173"), Skia.Color("#8B93A5"), Skia.Color("#D3D9E2")];
    if (!isAlive) {
      hullColors = [Skia.Color("#3A3F4B"), Skia.Color("#5A6173"), Skia.Color("#696969")];
    }

    const hullShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(-size * 0.7, 0),
      Skia.Point(size * 1.2, 0),
      hullColors,
      [0, 0.5, 1.0],
      Skia.TileMode.Clamp
    );

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(hullShader);
    paint.setAlphaf(globalOpacity);

    const arrowheadPath = getArrowheadPath(size);
    if (arrowheadPath) {
      canvas.drawPath(arrowheadPath, paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("#1A1D24"));
      paint.setStrokeWidth(1.2);
      paint.setAlphaf(globalOpacity);
      canvas.drawPath(arrowheadPath, paint);
    }

    // --- ELLIPTICAL CYAN COCKPIT ---
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#00F3FF"));
    paint.setAlphaf(globalOpacity);
    canvas.drawOval(Skia.XYWHRect(-size * 0.2, -size * 0.23, size * 0.7, size * 0.36), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.7)"));
    paint.setStrokeWidth(0.8);
    canvas.drawOval(Skia.XYWHRect(-size * 0.2, -size * 0.23, size * 0.7, size * 0.36), paint);

    // Reflection dot
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FFFFFF"));
    canvas.drawCircle(size * 0.25, -size * 0.09, size * 0.06, paint);

    canvas.restore();
  }
};

// ============================================================================
// CONTAINMENT TOWERS (OBSTACLES) — INDUSTRIAL METALLIC PILLARS & RED BEACONS
// ============================================================================

export const drawSkiaFlappyPipe: ShapeDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    const pos = world.getComponent(entity, "Transform");
    if (!render || !pos) return;

    const { size = 60 } = render;
    const width = size;
    const halfWidth = width / 2;

    const pipe = world.getComponent(entity, "Pipe");
    if (!pipe) return;

    const halfGap = pipe.gapSize / 2;
    const isTopPipe = pos.y < pipe.gapY;

    let pipeY: number;
    let pipeHeight: number;

    if (isTopPipe) {
      pipeY = -pos.y;
      pipeHeight = pipe.gapY - halfGap;
    } else {
      pipeY = (pipe.gapY + halfGap) - pos.y;
      pipeHeight = FLAPPY_CONFIG.SCREEN_HEIGHT - (pipe.gapY + halfGap);
    }

    const paint = getPaint();

    // Metallic Pillar Body Shader (#2A2A35)
    const pillarShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(-halfWidth, 0),
      Skia.Point(halfWidth, 0),
      [
        Skia.Color("#1A1A22"),
        Skia.Color("#2A2A35"),
        Skia.Color("#3F3F50"),
        Skia.Color("#2A2A35"),
        Skia.Color("#121218")
      ],
      [0, 0.25, 0.5, 0.75, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(pillarShader);
    canvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#121218"));
    paint.setStrokeWidth(1.5);
    canvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    // Docking Collar Cap at gap mouth
    const capHeight = 28;
    const capExtraWidth = 12;
    const capWidth = width + capExtraWidth;
    const capHalfWidth = capWidth / 2;
    const capYOffset = isTopPipe ? (pipeY + pipeHeight - capHeight) : pipeY;

    const collarShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(-capHalfWidth, 0),
      Skia.Point(capHalfWidth, 0),
      [
        Skia.Color("#22222D"),
        Skia.Color("#3A3A4A"),
        Skia.Color("#525266"),
        Skia.Color("#3A3A4A"),
        Skia.Color("#181822")
      ],
      [0, 0.3, 0.55, 0.8, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(collarShader);
    canvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#121218"));
    paint.setStrokeWidth(1.5);
    canvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    // Stroboscopic Red Warning Beacons (#FF0000) strictly bound to world.tick
    const beaconPulse = 0.35 + 0.65 * Math.abs(Math.sin(world.tick * 0.2));
    const beaconY = isTopPipe ? (capYOffset + capHeight - 4) : (capYOffset + 4);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FF0000"));
    paint.setAlphaf(beaconPulse);
    canvas.drawCircle(-capHalfWidth + 8, beaconY, 3.5, paint);
    canvas.drawCircle(capHalfWidth - 8, beaconY, 3.5, paint);

    paint.setColor(Skia.Color("#FFFFFF"));
    paint.setAlphaf(beaconPulse);
    canvas.drawCircle(-capHalfWidth + 8, beaconY, 1.2, paint);
    canvas.drawCircle(capHalfWidth - 8, beaconY, 1.2, paint);
  }
};

// ============================================================================
// STATION HULL GROUND — INDUSTRIAL METALLIC BASE WITH CAUTION STRIPES
// ============================================================================

export const drawSkiaFlappyGround: ShapeDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const { size = 400 } = render;
    const width = size;
    const height = 40;

    const paint = getPaint();

    // Dark industrial metal base
    const baseShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, -height / 2),
      Skia.Point(0, height / 2),
      [Skia.Color("#22222C"), Skia.Color("#0D0D12")],
      [0, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(baseShader);
    canvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, height), paint);

    // Yellow / Black caution stripe top rim
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FFCC00"));
    canvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, 8), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#111116"));
    paint.setStrokeWidth(4);
    const stripeOffset = (world.tick * 3) % 24;

    for (let sx = -width / 2 - 24; sx < width / 2 + 24; sx += 20) {
      canvas.drawLine(sx + stripeOffset, -height / 2, sx + stripeOffset - 10, -height / 2 + 8, paint);
    }

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#5A6173"));
    paint.setStrokeWidth(1.0);
    canvas.drawLine(-width / 2, -height / 2, width / 2, -height / 2, paint);
  }
};

// ============================================================================
// THE DEEP VOID PARALLAX BACKGROUND (#050510)
// ============================================================================

export const scrollingSkiaBackgroundEffect: EffectDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const gameState = world.getSingleton("FlappyState");
    if (!gameState) return;
    const { width = 400, height = 600 } = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 400, height: 600 };

    const paint = getPaint();

    updateVisualParticles();

    // Deep Void Space Base (#050510)
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#050510"));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    // Hypervelocity combo factor calculation
    let warpFactor = 1.0;
    const comboEntities = world.query("Combo");
    if (comboEntities.length > 0) {
      const combo = world.getComponent(comboEntities[0], "Combo") as any;
      if (combo && combo.multiplier > 1) {
        warpFactor = 1.0 + (combo.multiplier - 1) * 0.35;
      }
    }

    // Stars Parallax Layers
    const tick = world.tick;
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);

    // Layer 0: Distant White Stars
    paint.setColor(Skia.Color("#FFFFFF"));
    paint.setAlphaf(0.5);
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 37 + 13) - tick * 0.2) % width;
      const x = sx < 0 ? sx + width : sx;
      const y = (i * 83 + 29) % height;
      canvas.drawRect(Skia.XYWHRect(x, y, 1.2, 1.2), paint);
    }

    // Layer 1: Near Pale White-Blue Stars
    paint.setColor(Skia.Color("#E0E5FF"));
    paint.setAlphaf(0.75);
    for (let i = 0; i < 25; i++) {
      const sx = ((i * 53 + 7) - tick * 0.8 * warpFactor) % width;
      const x = sx < 0 ? sx + width : sx;
      const y = (i * 97 + 41) % height;
      const pLen = warpFactor > 1.2 ? Math.min(3 * warpFactor, 10) : 1.8;
      canvas.drawRect(Skia.XYWHRect(x, y, pLen, 1.5), paint);
    }

    // Draw active sparks & shards
    drawSkiaVisualParticles(canvas, paint);

    // CRT Scanlines Overlay
    paint.reset();
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.06)"));
    for (let ly = 0; ly < height; ly += 3) {
      canvas.drawRect(Skia.XYWHRect(0, ly, width, 1), paint);
    }
  },
};
