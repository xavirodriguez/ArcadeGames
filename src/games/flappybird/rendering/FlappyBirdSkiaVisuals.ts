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
// ZERO-ALLOCATION FILE-LEVEL PRE-ALLOCATED VISUAL PARTICLE POOL
// ============================================================================

interface VisualParticle {
  active: boolean;
  type: "feather" | "star" | "smoke";
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
  type: "feather",
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
  type: "feather" | "star" | "smoke",
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

      if (p.type === "feather") {
        p.vx += Math.sin(p.life * 6) * 12 * dt;
        p.vy += 25 * dt;
      } else if (p.type === "smoke") {
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
    }
  }
}

// Normalized Star Path (Size 1.0) cached to ensure absolute zero-allocation in the loop
let normalizedStarPath: any = null;
function getNormalizedStarPath(): any {
  if (!normalizedStarPath && Skia) {
    normalizedStarPath = Skia.Path.Make();
    const spikes = 5;
    const outerRadius = 1.0;
    const innerRadius = 0.4;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    normalizedStarPath.moveTo(0, -outerRadius);
    for (let s = 0; s < spikes; s++) {
      let cx = Math.cos(rot) * outerRadius;
      let cy = Math.sin(rot) * outerRadius;
      normalizedStarPath.lineTo(cx, cy);
      rot += step;

      cx = Math.cos(rot) * innerRadius;
      cy = Math.sin(rot) * innerRadius;
      normalizedStarPath.lineTo(cx, cy);
      rot += step;
    }
    normalizedStarPath.close();
  }
  return normalizedStarPath;
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

    if (p.type === "feather") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(p.color));
      canvas.drawOval(Skia.XYWHRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8), paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("rgba(0, 0, 0, 0.12)"));
      paint.setStrokeWidth(0.5);
      canvas.drawOval(Skia.XYWHRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8), paint);
    } else if (p.type === "star") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(p.color));

      const starPath = getNormalizedStarPath();
      if (starPath) {
        canvas.save();
        canvas.scale(p.size, p.size);
        canvas.drawPath(starPath, paint);
        canvas.restore();
      }
    } else if (p.type === "smoke") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(p.color));
      const currentSize = p.size * (1.0 + (1.0 - ratio) * 0.8);
      canvas.drawCircle(0, 0, currentSize, paint);
    }

    canvas.restore();
  }
}

// ============================================================================
// BIRD RENDERING WITH GRADIENTS, SQUASH-AND-STRETCH & ROTATING WINGS
// ============================================================================

interface BirdRenderState {
  lastVy: number;
  lastIsAlive: boolean;
  lastNearMissTimer: number;
}

const birdStates = new Map<number, BirdRenderState>();

// Caching paths on unique RenderComponent objects to achieve 100% zero allocation
const cachedBeakPaths = new WeakMap<any, any>();

/**
 * Visuals for the bird using React Native Skia.
 * Volumetric radial gradients, squash-and-stretch, rotating wings, and custom particles.
 */
export const drawSkiaFlappyBird: ShapeDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const { size = 15, color = "yellow" } = render;
    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    const birdComp = world.getComponent(entity, "Bird");
    if (!transform || !birdComp) return;

    const health = world.getComponent(entity, "Health");
    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    // --- DETECT STATE TRANSITIONS FOR PARTICLE TRIGGERS ---
    let state = birdStates.get(entity);
    if (!state) {
      state = {
        lastVy: 0,
        lastIsAlive: birdComp.isAlive,
        lastNearMissTimer: birdComp.nearMissTimer,
      };
      birdStates.set(entity, state);
    }

    const vy = birdComp.velocityY;

    // 1. Trigger Jump/Flap particles
    const flapStrength = FLAPPY_CONFIG.FLAP_STRENGTH;
    const hasFlapped = (vy < -150 && state.lastVy >= -150) || (vy === flapStrength && state.lastVy !== flapStrength);
    if (hasFlapped && birdComp.isAlive) {
      const pCount = 3 + world.renderRandom.nextInt(0, 2);
      for (let i = 0; i < pCount; i++) {
        const angleVal = world.renderRandom.nextRange(150, 210) * (Math.PI / 180);
        const speedVal = world.renderRandom.nextRange(30, 60);
        const pVx = Math.cos(angleVal) * speedVal;
        const pVy = Math.sin(angleVal) * speedVal + 20;
        const lifeVal = world.renderRandom.nextRange(0.6, 1.0);
        const sizeVal = world.renderRandom.nextRange(3, 5);
        const randColor = world.renderRandom.next() > 0.5 ? "#FFFFFF" : "#FFF7D6";
        spawnVisualParticle(
          "feather",
          x - size * 0.5,
          y + size * 0.1,
          pVx,
          pVy,
          lifeVal,
          sizeVal,
          randColor,
          world.renderRandom.nextRange(0, Math.PI * 2),
          world.renderRandom.nextRange(-1, 1)
        );
      }
    }

    // 2. Trigger Near Miss particles
    const hasNearMissed = birdComp.nearMissTimer > 0 && state.lastNearMissTimer <= 0;
    if (hasNearMissed && birdComp.isAlive) {
      const pCount = 8 + world.renderRandom.nextInt(0, 5);
      for (let i = 0; i < pCount; i++) {
        const angleVal = world.renderRandom.next() * Math.PI * 2;
        const speedVal = world.renderRandom.nextRange(60, 140);
        const pVx = Math.cos(angleVal) * speedVal;
        const pVy = Math.sin(angleVal) * speedVal;
        const lifeVal = world.renderRandom.nextRange(0.4, 0.8);
        const sizeVal = world.renderRandom.nextRange(4, 7);
        spawnVisualParticle(
          "star",
          x,
          y,
          pVx,
          pVy,
          lifeVal,
          sizeVal,
          "#FFD700",
          world.renderRandom.next() * Math.PI,
          world.renderRandom.nextRange(-3, 3)
        );
      }
    }

    // 3. Trigger Death Explosion
    const hasDied = !birdComp.isAlive && state.lastIsAlive;
    if (hasDied) {
      const sCount = 10 + world.renderRandom.nextInt(0, 5);
      for (let i = 0; i < sCount; i++) {
        const angleVal = world.renderRandom.next() * Math.PI * 2;
        const speedVal = world.renderRandom.nextRange(20, 70);
        const pVx = Math.cos(angleVal) * speedVal;
        const pVy = Math.sin(angleVal) * speedVal;
        const lifeVal = world.renderRandom.nextRange(0.8, 1.3);
        const sizeVal = world.renderRandom.nextRange(10, 18);
        const smokeGrey = world.renderRandom.nextInt(180, 220);
        spawnVisualParticle(
          "smoke",
          x,
          y,
          pVx,
          pVy,
          lifeVal,
          sizeVal,
          `rgba(${smokeGrey}, ${smokeGrey}, ${smokeGrey}, 0.5)`
        );
      }
      const fCount = 15 + world.renderRandom.nextInt(0, 6);
      for (let i = 0; i < fCount; i++) {
        const angleVal = world.renderRandom.next() * Math.PI * 2;
        const speedVal = world.renderRandom.nextRange(50, 150);
        const pVx = Math.cos(angleVal) * speedVal;
        const pVy = Math.sin(angleVal) * speedVal;
        const lifeVal = world.renderRandom.nextRange(0.7, 1.2);
        const sizeVal = world.renderRandom.nextRange(4, 7);
        const randColor = world.renderRandom.next() > 0.4 ? color : "#FFFFFF";
        spawnVisualParticle(
          "feather",
          x,
          y,
          pVx,
          pVy,
          lifeVal,
          sizeVal,
          randColor,
          world.renderRandom.next() * Math.PI,
          world.renderRandom.nextRange(-4, 4)
        );
      }
    }

    state.lastVy = vy;
    state.lastIsAlive = birdComp.isAlive;
    state.lastNearMissTimer = birdComp.nearMissTimer;

    let globalOpacity = 1.0;
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if ((render.hitFlashFrames >> 1) % 2 === 0) {
        globalOpacity = 0.3;
      }
    }

    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      globalOpacity = (Math.floor(health.invulnerableRemaining / 100) % 2 === 0) ? 0.35 : 1.0;
    }

    const paint = getPaint();

    canvas.save();

    // --- VELOCITY-BASED SQUASH-AND-STRETCH ---
    const speed = Math.abs(vy);
    const stretch = Math.min(speed / 900, 0.22);
    let scaleX = 1;
    let scaleY = 1;
    if (vy > 0) {
      scaleX = 1 - stretch;
      scaleY = 1 + stretch;
    } else {
      scaleX = 1 + stretch;
      scaleY = 1 - stretch;
    }
    canvas.scale(scaleX, scaleY);

    // --- AERODYNAMIC GLIDE STREAM TRAILS ---
    if (birdComp.isGliding || (birdComp.isAlive && speed > 220)) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("rgba(235, 245, 255, 0.4)"));
      paint.setStrokeWidth(1.5);
      canvas.drawLine(-size * 1.1, -size * 0.3, -size * 2.2, -size * 0.3, paint);
      canvas.drawLine(-size * 1.1, size * 0.3, -size * 2.2, size * 0.3, paint);
    }

    // --- 3D SPHERICAL RADIAL GRADIENT BODY ---
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setAlphaf(globalOpacity);

    // Recreate radial body shader
    let bodyColors = [Skia.Color("#FFE600"), Skia.Color(color), Skia.Color("#D47A00")];
    if (!birdComp.isAlive) {
      bodyColors = [Skia.Color("#D3D3D3"), Skia.Color("#A9A9A9"), Skia.Color("#696969")];
    }

    const bodyShader = Skia.Shader.MakeRadialGradient(
      Skia.Point(-size * 0.25, -size * 0.25),
      size,
      bodyColors,
      [0, 0.65, 1.0],
      Skia.TileMode.Clamp
    );
    paint.setShader(bodyShader);
    canvas.drawCircle(0, 0, size, paint);

    // Dark sleek outline
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.65)"));
    paint.setStrokeWidth(1.5);
    paint.setAlphaf(globalOpacity);
    canvas.drawCircle(0, 0, size, paint);

    // --- EYE WITH HIGHLIGHTED REFLECTION ---
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FFFFFF"));
    paint.setAlphaf(globalOpacity);
    canvas.drawCircle(size * 0.35, -size * 0.3, size * 0.32, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.55)"));
    paint.setStrokeWidth(0.8);
    canvas.drawCircle(size * 0.35, -size * 0.3, size * 0.32, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#000000"));
    canvas.drawCircle(size * 0.45, -size * 0.3, size * 0.14, paint);

    paint.setColor(Skia.Color("#FFFFFF"));
    canvas.drawCircle(size * 0.42, -size * 0.36, size * 0.05, paint);

    // --- VOLUMETRIC ORANGE BEAK ---
    const beakShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(size * 0.7, -size * 0.1),
      Skia.Point(size * 1.3, size * 0.1),
      [Skia.Color("#FF6A00"), Skia.Color("#E02D00")],
      [0, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(beakShader);
    paint.setAlphaf(globalOpacity);

    // Retrieve or cache static beak path
    let beakPath = cachedBeakPaths.get(render);
    if (!beakPath) {
      beakPath = Skia.Path.Make();
      beakPath.moveTo(size * 0.65, -size * 0.15);
      beakPath.lineTo(size * 1.25, 0);
      beakPath.lineTo(size * 0.65, size * 0.2);
      beakPath.close();
      cachedBeakPaths.set(render, beakPath);
    }
    canvas.drawPath(beakPath, paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.5)"));
    paint.setStrokeWidth(0.8);
    canvas.drawPath(beakPath, paint);

    // Beak division line
    canvas.drawLine(size * 0.65, size * 0.025, size * 1.15, size * 0.025, paint);

    // --- ROTATING FLAPPING WINGS ---
    const wingFreq = birdComp.isAlive ? (vy < 0 ? 0.35 : 0.18) : 0;
    const wingAngle = birdComp.isAlive ? Math.sin(world.tick * wingFreq) * 0.55 : 0.3;

    canvas.save();
    canvas.translate(-size * 0.25, size * 0.12);
    canvas.rotate((wingAngle * 180) / Math.PI, 0, 0);

    const wingShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(-size * 0.55, 0),
      Skia.Point(size * 0.15, 0),
      [Skia.Color("#FFFFFF"), Skia.Color("#FFF0AA")],
      [0, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(wingShader);
    paint.setAlphaf(globalOpacity);
    canvas.drawOval(Skia.XYWHRect(-size * 0.7, -size * 0.32, size * 1.1, size * 0.64), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.65)"));
    paint.setStrokeWidth(1.0);
    canvas.drawOval(Skia.XYWHRect(-size * 0.7, -size * 0.32, size * 1.1, size * 0.64), paint);

    // Inner wing details
    canvas.drawLine(-size * 0.3, -size * 0.1, -size * 0.55, 0, paint);
    canvas.drawLine(-size * 0.2, 0, -size * 0.45, size * 0.1, paint);

    canvas.restore();

    canvas.restore(); // Squash-and-stretch restore

    // --- NEAR MISS INDICATOR CUBE OVERLAY ---
    if (birdComp.nearMissTimer > 0) {
      canvas.save();
      const alphaVal = birdComp.nearMissTimer / 300;
      const floatY = (300 - birdComp.nearMissTimer) * 0.15;

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("#FFD700"));
      paint.setAlphaf(alphaVal);
      canvas.drawRect(Skia.XYWHRect(-12, -40 - floatY, 24, 6), paint);
      canvas.restore();
    }
  }
};

// ============================================================================
// METALLIC PIPES WITH VOLUMETRIC GRADIENTS & PULSING INDICATORS
// ============================================================================

/**
 * Visuals for industrial, high-fidelity pipes using React Native Skia.
 */
export const drawSkiaFlappyPipe: ShapeDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    const pos = world.getComponent(entity, "Transform");
    if (!render || !pos) return;

    const { size = 60, color = "green" } = render;
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

    // --- METALLIC HORIZONTAL GRADIENT FOR THE MAIN CYLINDER ---
    let cylinderColors = [
      Skia.Color("#1E5F3B"),
      Skia.Color("#288050"),
      Skia.Color("#3AD482"),
      Skia.Color("#257348"),
      Skia.Color("#144229"),
    ];
    if (color !== "green") {
      cylinderColors = [
        Skia.Color("#4A4A4A"),
        Skia.Color("#A1A1A1"),
        Skia.Color("#FFFFFF"),
        Skia.Color("#808080"),
        Skia.Color("#333333"),
      ];
    }

    const cylinderShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(-halfWidth, 0),
      Skia.Point(halfWidth, 0),
      cylinderColors,
      [0, 0.2, 0.55, 0.85, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(cylinderShader);
    canvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    // Inner pipe shadow borders
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.4)"));
    paint.setStrokeWidth(1.5);
    canvas.drawRect(Skia.XYWHRect(-halfWidth, pipeY, width, pipeHeight), paint);

    // --- PIPE CAP VISUAL ---
    const capHeight = 30;
    const capExtraWidth = 10;
    const capWidth = width + capExtraWidth;
    const capHalfWidth = capWidth / 2;
    const capYOffset = isTopPipe ? (pipeY + pipeHeight - capHeight) : pipeY;

    let capColors = [
      Skia.Color("#195232"),
      Skia.Color("#237045"),
      Skia.Color("#42EF94"),
      Skia.Color("#216E43"),
      Skia.Color("#103822"),
    ];
    if (color !== "green") {
      capColors = [
        Skia.Color("#333"),
        Skia.Color("#FFF"),
        Skia.Color("#222"),
      ];
    }

    const capShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(-capHalfWidth, 0),
      Skia.Point(capHalfWidth, 0),
      capColors,
      color === "green" ? [0, 0.2, 0.5, 0.85, 1.0] : [0, 0.5, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(capShader);
    canvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.4)"));
    paint.setStrokeWidth(1.5);
    canvas.drawRect(Skia.XYWHRect(-capHalfWidth, capYOffset, capWidth, capHeight), paint);

    // Inner shining bevel
    paint.setColor(Skia.Color("rgba(255, 255, 255, 0.25)"));
    paint.setStrokeWidth(1.0);
    if (isTopPipe) {
      canvas.drawLine(-capHalfWidth + 1, capYOffset + capHeight - 1, capHalfWidth - 1, capYOffset + capHeight - 1, paint);
    } else {
      canvas.drawLine(-capHalfWidth + 1, capYOffset + 1, capHalfWidth - 1, capYOffset + 1, paint);
    }

    // --- DETAILED RIVETS ---
    const rivetCount = 4;
    for (let r = 0; r < rivetCount; r++) {
      const rx = -capHalfWidth + 10 + r * ((capWidth - 20) / (rivetCount - 1));
      const ry = capYOffset + capHeight * 0.5;

      // Pocket
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(0,0,0,0.45)"));
      canvas.drawCircle(rx, ry, 2.5, paint);

      // Screw core
      paint.setColor(Skia.Color("rgba(255,255,255,0.7)"));
      canvas.drawCircle(rx - 0.5, ry - 0.5, 1.2, paint);
    }

    // --- PULSING NEON SAFETY LIGHTS ON THE GAP LIP ---
    const pulseFactor = 0.55 + 0.45 * Math.sin(world.tick * 0.12);
    const indicatorX = 0;
    const indicatorY = isTopPipe ? (capYOffset + capHeight - 3) : (capYOffset + 3);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#FF2828"));
    paint.setAlphaf(pulseFactor);
    canvas.drawCircle(indicatorX, indicatorY, 4, paint);

    paint.setColor(Skia.Color("#FFFFFF"));
    paint.setAlphaf(pulseFactor);
    canvas.drawCircle(indicatorX, indicatorY, 1.5, paint);
  }
};

// ============================================================================
// LAYERED CYBER GROUND WITH DIAGONAL HAZARD SCROLLING LINES
// ============================================================================

/**
 * Visuals for the ground using React Native Skia.
 */
export const drawSkiaFlappyGround: ShapeDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const { size = 400 } = render;
    const width = size;
    const height = 40;

    const paint = getPaint();

    // 1. Core earth blocks with deep brown linear fill
    const dirtShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, -height / 2),
      Skia.Point(0, height / 2),
      [Skia.Color("#4D2D18"), Skia.Color("#26150A")],
      [0, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(dirtShader);
    canvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, height), paint);

    // 2. Neon grass top strip (representing virtual cyber ground limit)
    const neonGreenShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, -height / 2),
      Skia.Point(0, -height / 2 + 6),
      [Skia.Color("#39FF14"), Skia.Color("#1D8F0B")],
      [0, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(neonGreenShader);
    canvas.drawRect(Skia.XYWHRect(-width / 2, -height / 2, width, 6), paint);

    // Bounding line
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(255, 255, 255, 0.75)"));
    paint.setStrokeWidth(1.0);
    canvas.drawLine(-width / 2, -height / 2, width / 2, -height / 2, paint);

    // 3. Scrolling diagonal hazard stripes (representing forward conveyor movement)
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(29, 143, 11, 0.25)"));
    paint.setStrokeWidth(4);
    const stripeOffset = (world.tick * 2.5) % 30;

    for (let sx = -width / 2 - 30; sx < width / 2 + 30; sx += 25) {
      canvas.drawLine(sx + stripeOffset, -height / 2 + 6, sx + stripeOffset - 15, height / 2, paint);
    }

    // Fine dark bottom bounding line
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#000000"));
    paint.setStrokeWidth(1.5);
    canvas.drawLine(-width / 2, height / 2, width / 2, height / 2, paint);
  }
};

// ============================================================================
// SUNSET SCENIC PARALLAX SKY BACKGROUND EFFECT
// ============================================================================

let bgOffset = 0;
let mountainsOffset = 0;
let hillsOffset = 0;

// Pre-allocated in-place global mutable paths to avoid heap allocations in drawing loop
let globalMountainPath: any = null;
let globalHillsPath: any = null;

export const scrollingSkiaBackgroundEffect: EffectDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const gameState = world.getSingleton("FlappyState");
    if (!gameState) return;
    const { width = 400, height = 600 } = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 400, height: 600 };

    const paint = getPaint();

    updateVisualParticles();

    if (!gameState.isGameOver) {
      bgOffset = (bgOffset + 0.95) % width;
      mountainsOffset = (mountainsOffset + 0.15) % width;
      hillsOffset = (hillsOffset + 0.45) % width;
    }

    // ========================================================================
    // LAYER 1: WARM SUNSET TWILIGHT GRADIENT SKY
    // ========================================================================
    const skyShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, 0),
      Skia.Point(0, height),
      [
        Skia.Color("#120136"),
        Skia.Color("#400082"),
        Skia.Color("#E84545"),
        Skia.Color("#F0A500"),
        Skia.Color("#E84545")
      ],
      [0, 0.3, 0.65, 0.85, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(skyShader);
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    // Sunset sun orb
    const sunShader = Skia.Shader.MakeRadialGradient(
      Skia.Point(width * 0.72, height * 0.65),
      60,
      [
        Skia.Color("rgba(255, 245, 200, 0.75)"),
        Skia.Color("rgba(240, 165, 0, 0.45)"),
        Skia.Color("rgba(232, 69, 69, 0)")
      ],
      [0, 0.3, 1.0],
      Skia.TileMode.Clamp
    );
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setShader(sunShader);
    canvas.drawCircle(width * 0.72, height * 0.65, 60, paint);

    // ========================================================================
    // LAYER 2: JAGGED MOUNTAIN SILHOUETTES
    // ========================================================================
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(43, 14, 76, 0.45)"));

    const points = [
      0, 20, 45, 75, 110, 140, 185, 230, 275, 320, 360, 400,
      420, 445, 475, 510, 540, 585, 630, 675, 720, 760, 800
    ];
    const heights = [
      0.9, 0.6, 1.2, 0.75, 1.1, 0.5, 0.95, 1.3, 0.7, 1.05, 0.65, 0.8,
      0.9, 0.6, 1.2, 0.75, 1.1, 0.5, 0.95, 1.3, 0.7, 1.05, 0.8
    ];

    const mBaseY = height * 0.72;
    if (!globalMountainPath && Skia) {
      globalMountainPath = Skia.Path.Make();
    }
    if (globalMountainPath) {
      globalMountainPath.reset();
      globalMountainPath.moveTo(0, height);

      for (let i = 0; i < points.length; i++) {
        const px = points[i] - mountainsOffset;
        const py = mBaseY - heights[i] * 45;
        globalMountainPath.lineTo(px, py);
      }
      for (let i = 0; i < points.length; i++) {
        const px = (points[i] + width) - mountainsOffset;
        const py = mBaseY - heights[i] * 45;
        globalMountainPath.lineTo(px, py);
      }
      globalMountainPath.lineTo(width * 2, height);
      globalMountainPath.close();
      canvas.drawPath(globalMountainPath, paint);
    }

    // ========================================================================
    // LAYER 3: SMOOTH ROLLING HILLS
    // ========================================================================
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(80, 15, 66, 0.68)"));

    const hBaseY = height * 0.76;
    if (!globalHillsPath && Skia) {
      globalHillsPath = Skia.Path.Make();
    }
    if (globalHillsPath) {
      globalHillsPath.reset();
      globalHillsPath.moveTo(0, height);

      const hillSteps = 40;
      const stepSize = (width * 2) / hillSteps;
      for (let i = 0; i <= hillSteps; i++) {
        const xPos = i * stepSize - hillsOffset;
        const waveHeight = Math.sin(i * 0.35) * 18 + Math.cos(i * 0.18) * 8;
        globalHillsPath.lineTo(xPos, hBaseY - waveHeight);
      }
      globalHillsPath.lineTo(width * 2, height);
      globalHillsPath.close();
      canvas.drawPath(globalHillsPath, paint);
    }

    // ========================================================================
    // LAYER 4: VOLUMETRIC SOFT DRIFTING CLOUDS
    // ========================================================================
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(255, 235, 235, 0.28)"));

    for (let i = 0; i < 4; i++) {
      const x = (i * 175 - bgOffset + width) % width;
      const y = 60 + (i % 2) * 55;

      canvas.drawCircle(x, y, 22, paint);
      canvas.drawCircle(x + 18, y - 12, 18, paint);
      canvas.drawCircle(x - 18, y - 8, 15, paint);
      canvas.drawCircle(x + 35, y, 16, paint);
    }

    // ========================================================================
    // UPDATE & DRAW ACTIVE VISUAL PARTICLES IN THE AIR
    // ========================================================================
    drawSkiaVisualParticles(canvas, paint);

    // ========================================================================
    // RETRO CRT GRID OVERLAY & SCANLINE FILTER
    // ========================================================================
    paint.reset();
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.05)"));
    for (let ly = 0; ly < height; ly += 3) {
      canvas.drawRect(Skia.XYWHRect(0, ly, width, 1), paint);
    }

    // Screen Vignette
    paint.reset();
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.38)"));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, 12), paint);
    canvas.drawRect(Skia.XYWHRect(0, height - 12, width, 12), paint);
    canvas.drawRect(Skia.XYWHRect(0, 0, 12, height), paint);
    canvas.drawRect(Skia.XYWHRect(width - 12, 0, 12, height), paint);
  },
};
