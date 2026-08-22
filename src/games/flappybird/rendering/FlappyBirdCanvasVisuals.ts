import { ShapeDrawer, EffectDrawer, TransformComponent } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

// ============================================================================
// BIRD RENDERING WITH 3D RADIAL GRADIENTS, SQUASH-AND-STRETCH & ROTATING WINGS
// ============================================================================

interface BirdRenderState {
  lastVy: number;
  lastIsAlive: boolean;
  lastNearMissTimer: number;
}

const birdStates = new Map<number, BirdRenderState>();

/**
 * Visuals for the bird with volumetric radial gradients, squash-and-stretch,
 * flapping wings, trails, and custom particle spawns.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15, color = "yellow" } = render;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    const birdComp = world.getComponent(entity, "Bird");
    if (!transform || !birdComp) return;

    const health = world.getComponent(entity, "Health");

    // --- DETECT STATE TRANSITIONS ---
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

    // Sync state values
    state.lastVy = vy;
    state.lastIsAlive = birdComp.isAlive;
    state.lastNearMissTimer = birdComp.nearMissTimer;

    // --- HIT SHIVER & FLASHING EFFORTS ---
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
    }

    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      ctx.globalAlpha = (Math.floor(health.invulnerableRemaining / 100) % 2 === 0) ? 0.35 : 1.0;
    }

    ctx.save();

    // --- VELOCITY-BASED SQUASH-AND-STRETCH ---
    const speed = Math.abs(vy);
    const stretch = Math.min(speed / 900, 0.22);
    let scaleX = 1;
    let scaleY = 1;
    if (vy > 0) {
      // Falling: stretch vertically
      scaleX = 1 - stretch;
      scaleY = 1 + stretch;
    } else {
      // Rising: squash vertically
      scaleX = 1 + stretch;
      scaleY = 1 - stretch;
    }
    ctx.scale(scaleX, scaleY);

    // --- AERODYNAMIC GLIDE STREAM TRAILS ---
    if (birdComp.isGliding || (birdComp.isAlive && speed > 220)) {
      ctx.save();
      ctx.strokeStyle = "rgba(235, 245, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(-size * 1.1, -size * 0.3);
      ctx.lineTo(-size * 2.2, -size * 0.3);
      ctx.moveTo(-size * 1.1, size * 0.3);
      ctx.lineTo(-size * 2.2, size * 0.3);
      ctx.stroke();
      ctx.restore();
    }

    // --- 3D SPHERICAL RADIAL GRADIENT BODY ---
    const bodyGrad = ctx.createRadialGradient(
      -size * 0.25,
      -size * 0.25,
      size * 0.15,
      0,
      0,
      size
    );
    if (birdComp.isAlive) {
      bodyGrad.addColorStop(0, "#FFE600"); // Hot spot
      bodyGrad.addColorStop(0.65, color);  // Midtone yellow
      bodyGrad.addColorStop(1, "#D47A00");   // Shadow shade
    } else {
      bodyGrad.addColorStop(0, "#D3D3D3");
      bodyGrad.addColorStop(0.7, "#A9A9A9");
      bodyGrad.addColorStop(1, "#696969");
    }

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // Dark sleek silhouette border
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.stroke();

    // --- EYE WITH HIGHLIGHTED REFLECTION ---
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(size * 0.35, -size * 0.3, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(size * 0.45, -size * 0.3, size * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Tiny shiny eye reflection dot
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(size * 0.42, -size * 0.36, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // --- VOLUMETRIC ORANGE BEAK ---
    const beakGrad = ctx.createLinearGradient(size * 0.7, -size * 0.1, size * 1.3, size * 0.1);
    beakGrad.addColorStop(0, "#FF6A00");
    beakGrad.addColorStop(1, "#E02D00");
    ctx.fillStyle = beakGrad;

    ctx.beginPath();
    ctx.moveTo(size * 0.65, -size * 0.15);
    ctx.lineTo(size * 1.25, 0);
    ctx.lineTo(size * 0.65, size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Beak division line
    ctx.beginPath();
    ctx.moveTo(size * 0.65, size * 0.025);
    ctx.lineTo(size * 1.15, size * 0.025);
    ctx.stroke();

    // --- ROTATING FLAPPING WINGS ---
    const wingFreq = birdComp.isAlive ? (vy < 0 ? 0.35 : 0.18) : 0;
    const wingAngle = birdComp.isAlive ? Math.sin(world.tick * wingFreq) * 0.55 : 0.3;

    ctx.save();
    ctx.translate(-size * 0.25, size * 0.12);
    ctx.rotate(wingAngle);

    const wingGrad = ctx.createLinearGradient(-size * 0.55, 0, size * 0.15, 0);
    wingGrad.addColorStop(0, "#FFFFFF");
    wingGrad.addColorStop(1, "#FFF0AA");
    ctx.fillStyle = wingGrad;

    ctx.beginPath();
    ctx.ellipse(-size * 0.15, 0, size * 0.55, size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Inner feathers details
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.1);
    ctx.lineTo(-size * 0.55, 0);
    ctx.moveTo(-size * 0.2, 0);
    ctx.lineTo(-size * 0.45, size * 0.1);
    ctx.stroke();

    ctx.restore();

    ctx.restore(); // Squash-and-stretch pop

    // --- NEAR MISS FLOATING TEXT OVERLAY ---
    if (birdComp.nearMissTimer > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const alphaVal = birdComp.nearMissTimer / 300;
      ctx.fillStyle = `rgba(255, 215, 0, ${alphaVal})`;
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 12 * alphaVal;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      const floatY = (300 - birdComp.nearMissTimer) * 0.15;
      ctx.fillText("NEAR MISS! +50", transform.x, transform.y - 40 - floatY);
      ctx.restore();
    }

    ctx.globalAlpha = 1.0;
  }
};

// ============================================================================
// METALLIC PIPES WITH HORIZONTAL GRADIENTS, RIVETS & PULSING INDICATORS
// ============================================================================

export const drawFlappyPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
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

    const cylinderGrad = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
    if (color === "green") {
      cylinderGrad.addColorStop(0, "#1E5F3B");
      cylinderGrad.addColorStop(0.2, "#288050");
      cylinderGrad.addColorStop(0.55, "#3AD482");
      cylinderGrad.addColorStop(0.85, "#257348");
      cylinderGrad.addColorStop(1, "#144229");
    } else {
      cylinderGrad.addColorStop(0, "#4A4A4A");
      cylinderGrad.addColorStop(0.3, "#A1A1A1");
      cylinderGrad.addColorStop(0.55, "#FFFFFF");
      cylinderGrad.addColorStop(0.85, "#808080");
      cylinderGrad.addColorStop(1, "#333333");
    }

    ctx.fillStyle = cylinderGrad;
    ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

    const capHeight = 30;
    const capExtraWidth = 10;
    const capWidth = width + capExtraWidth;
    const capHalfWidth = capWidth / 2;
    const capYOffset = isTopPipe ? (pipeY + pipeHeight - capHeight) : pipeY;

    const capGrad = ctx.createLinearGradient(-capHalfWidth, 0, capHalfWidth, 0);
    if (color === "green") {
      capGrad.addColorStop(0, "#195232");
      capGrad.addColorStop(0.2, "#237045");
      capGrad.addColorStop(0.5, "#42EF94");
      capGrad.addColorStop(0.85, "#216E43");
      capGrad.addColorStop(1, "#103822");
    } else {
      capGrad.addColorStop(0, "#333");
      capGrad.addColorStop(0.5, "#FFF");
      capGrad.addColorStop(1, "#222");
    }

    ctx.fillStyle = capGrad;
    ctx.fillRect(-capHalfWidth, capYOffset, capWidth, capHeight);
    ctx.strokeRect(-capHalfWidth, capYOffset, capWidth, capHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    if (isTopPipe) {
      ctx.moveTo(-capHalfWidth + 1, capYOffset + capHeight - 1);
      ctx.lineTo(capHalfWidth - 1, capYOffset + capHeight - 1);
    } else {
      ctx.moveTo(-capHalfWidth + 1, capYOffset + 1);
      ctx.lineTo(capHalfWidth - 1, capYOffset + 1);
    }
    ctx.stroke();

    const rivetCount = 4;
    ctx.save();
    for (let r = 0; r < rivetCount; r++) {
      const rx = -capHalfWidth + 10 + r * ((capWidth - 20) / (rivetCount - 1));
      const ry = capYOffset + capHeight * 0.5;

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(rx - 0.5, ry - 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    const pulseFactor = 0.55 + 0.45 * Math.sin(world.tick * 0.12);
    const indicatorX = 0;
    const indicatorY = isTopPipe ? (capYOffset + capHeight - 3) : (capYOffset + 3);

    ctx.fillStyle = `rgba(255, 40, 40, ${pulseFactor})`;
    ctx.shadowColor = "#FF2828";
    ctx.shadowBlur = pulseFactor * 10;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255, 200, 200, ${pulseFactor})`;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

// ============================================================================
// LAYERED CYBER GROUND WITH DIAGONAL HAZARD SCROLLING LINES
// ============================================================================

export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 400 } = render;
    const width = size;
    const height = 40;

    const dirtGrad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    dirtGrad.addColorStop(0, "#4D2D18");
    dirtGrad.addColorStop(1, "#26150A");
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    const neonGreenGrad = ctx.createLinearGradient(0, -height / 2, 0, -height / 2 + 6);
    neonGreenGrad.addColorStop(0, "#39FF14");
    neonGreenGrad.addColorStop(1, "#1D8F0B");
    ctx.fillStyle = neonGreenGrad;
    ctx.fillRect(-width / 2, -height / 2, width, 6);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(width / 2, -height / 2);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = "rgba(29, 143, 11, 0.25)";
    ctx.lineWidth = 4;
    const stripeOffset = (world.tick * 2.5) % 30;

    ctx.beginPath();
    for (let sx = -width / 2 - 30; sx < width / 2 + 30; sx += 25) {
      ctx.moveTo(sx + stripeOffset, -height / 2 + 6);
      ctx.lineTo(sx + stripeOffset - 15, height / 2);
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-width / 2, height / 2);
    ctx.lineTo(width / 2, height / 2);
    ctx.stroke();
  }
};

// ============================================================================
// SUNSET SCENIC PARALLAX SKY BACKGROUND EFFECT (WITH CRT GRID & VIGNETTES)
// ============================================================================

let bgOffset = 0;
let mountainsOffset = 0;
let hillsOffset = 0;

let cachedSkyGradient: CanvasGradient | null = null;
let cachedVignette: CanvasGradient | null = null;
let lastGradientHeight = 0;

export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world) {
    const gameState = world.getSingleton("FlappyState");
    if (!gameState) return;
    const { width = 400, height = 600 } = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 400, height: 600 };

    if (!gameState.isGameOver) {
      bgOffset = (bgOffset + 0.95) % width;
      mountainsOffset = (mountainsOffset + 0.15) % width;
      hillsOffset = (hillsOffset + 0.45) % width;
    }

    if (!cachedSkyGradient || lastGradientHeight !== height) {
      cachedSkyGradient = ctx.createLinearGradient(0, 0, 0, height);
      cachedSkyGradient.addColorStop(0, "#120136");
      cachedSkyGradient.addColorStop(0.3, "#400082");
      cachedSkyGradient.addColorStop(0.65, "#E84545");
      cachedSkyGradient.addColorStop(0.85, "#F0A500");
      cachedSkyGradient.addColorStop(1, "#E84545");
      lastGradientHeight = height;
    }
    ctx.fillStyle = cachedSkyGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    const sunGrad = ctx.createRadialGradient(width * 0.72, height * 0.65, 0, width * 0.72, height * 0.65, 60);
    sunGrad.addColorStop(0, "rgba(255, 245, 200, 0.75)");
    sunGrad.addColorStop(0.3, "rgba(240, 165, 0, 0.45)");
    sunGrad.addColorStop(1, "rgba(232, 69, 69, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width * 0.72, height * 0.65, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(43, 14, 76, 0.45)";
    ctx.beginPath();

    const mBaseY = height * 0.72;
    const points = [
      0, 20, 45, 75, 110, 140, 185, 230, 275, 320, 360, 400,
      420, 445, 475, 510, 540, 585, 630, 675, 720, 760, 800
    ];
    const heights = [
      0.9, 0.6, 1.2, 0.75, 1.1, 0.5, 0.95, 1.3, 0.7, 1.05, 0.65, 0.8,
      0.9, 0.6, 1.2, 0.75, 1.1, 0.5, 0.95, 1.3, 0.7, 1.05, 0.8
    ];

    ctx.moveTo(0, height);
    for (let i = 0; i < points.length; i++) {
      const px = points[i] - mountainsOffset;
      const py = mBaseY - heights[i] * 45;
      ctx.lineTo(px, py);
    }
    for (let i = 0; i < points.length; i++) {
      const px = (points[i] + width) - mountainsOffset;
      const py = mBaseY - heights[i] * 45;
      ctx.lineTo(px, py);
    }

    ctx.lineTo(width * 2, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(80, 15, 66, 0.68)";
    ctx.beginPath();

    const hBaseY = height * 0.76;
    ctx.moveTo(0, height);

    const hillSteps = 40;
    const stepSize = (width * 2) / hillSteps;
    for (let i = 0; i <= hillSteps; i++) {
      const xPos = i * stepSize - hillsOffset;
      const waveHeight = Math.sin(i * 0.35) * 18 + Math.cos(i * 0.18) * 8;
      ctx.lineTo(xPos, hBaseY - waveHeight);
    }

    ctx.lineTo(width * 2, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(255, 235, 235, 0.28)";
    for (let i = 0; i < 4; i++) {
      const x = (i * 175 - bgOffset + width) % width;
      const y = 60 + (i % 2) * 55;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.arc(x + 18, y - 12, 18, 0, Math.PI * 2);
      ctx.arc(x - 18, y - 8, 15, 0, Math.PI * 2);
      ctx.arc(x + 35, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    for (let ly = 0; ly < height; ly += 3) {
      ctx.fillRect(0, ly, width, 1);
    }

    if (!cachedVignette || lastGradientHeight !== height) {
      cachedVignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.45,
        width / 2,
        height / 2,
        width * 0.78
      );
      cachedVignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      cachedVignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
    }
    ctx.fillStyle = cachedVignette;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  },
};
