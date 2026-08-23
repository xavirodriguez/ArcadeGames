import { ShapeDrawer, EffectDrawer, TransformComponent } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

// ============================================================================
// "NEON VOID" CANVAS VISUALS — HARD SCI-FI INDUSTRIAL ART DIRECTION
// ============================================================================

interface InterceptorRenderState {
  lastVy: number;
  lastIsAlive: boolean;
  lastNearMissTimer: number;
}

const shipStates = new Map<number, InterceptorRenderState>();

/**
 * Player Ship ("Interceptor") shape drawer.
 * Arrowhead spearhead silhouette, titanium hull, cyan cockpit, thermonuclear thruster flame.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15 } = render;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    const birdComp = world.getComponent(entity, "Bird");
    if (!transform || !birdComp) return;

    const health = world.getComponent(entity, "Health");

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

    state.lastVy = vy;
    state.lastIsAlive = isAlive;
    state.lastNearMissTimer = birdComp.nearMissTimer;

    let globalOpacity = 1.0;
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
    }

    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      globalOpacity = (Math.floor(health.invulnerableRemaining / 100) % 2 === 0) ? 0.35 : 1.0;
    }

    ctx.save();
    ctx.globalAlpha = globalOpacity;

    // --- VELOCITY SQUASH AND STRETCH ---
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
    ctx.scale(scaleX, scaleY);

    // --- RGB CHROMATIC ABERRATION SPLIT ON DEATH ---
    const isDyingGlitch = render.hitFlashFrames && render.hitFlashFrames > 0;
    if (isDyingGlitch) {
      ctx.save();
      ctx.translate(-3, -1);
      ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
      drawArrowheadPath(ctx, size);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(3, 1);
      ctx.fillStyle = "rgba(0, 243, 255, 0.6)";
      drawArrowheadPath(ctx, size);
      ctx.fill();
      ctx.restore();
    }

    // --- CYAN LIGHT TRAIL ---
    if (isAlive) {
      ctx.save();
      ctx.strokeStyle = "rgba(0, 243, 255, 0.35)";
      ctx.lineWidth = 2.0;
      ctx.shadowColor = "#00F3FF";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, 0);
      ctx.lineTo(-size * 1.8 - Math.min(speed * 0.1, 15), 0);
      ctx.stroke();
      ctx.restore();
    }

    // --- THERMONUCLEAR REACTIVE THRUSTER FLAME ---
    if (isAlive) {
      const isBoosting = vy < 0;
      const flicker = 0.85 + 0.15 * Math.sin(world.tick * 0.8);
      const flameLength = (isBoosting ? size * 1.6 : size * 0.75) * flicker;
      const flameWidth = (isBoosting ? size * 0.55 : size * 0.3) * flicker;

      const flameGrad = ctx.createLinearGradient(-size * 0.55, 0, -size * 0.55 - flameLength, 0);
      flameGrad.addColorStop(0, "#FFFFFF");   // White thermonuclear core
      flameGrad.addColorStop(0.35, "#FFC000"); // Hot yellow-orange
      flameGrad.addColorStop(1.0, "#FF3300");  // Thermonuclear red tip

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, -flameWidth * 0.5);
      ctx.lineTo(-size * 0.55 - flameLength, 0);
      ctx.lineTo(-size * 0.55, flameWidth * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // --- TITANIUM HULL GRADIENT ---
    const hullGrad = ctx.createLinearGradient(-size * 0.7, 0, size * 1.2, 0);
    if (isAlive) {
      hullGrad.addColorStop(0, "#5A6173"); // Dark titanium tail
      hullGrad.addColorStop(0.5, "#8B93A5"); // Mid-tone titanium
      hullGrad.addColorStop(1.0, "#D3D9E2"); // Light metallic nose
    } else {
      hullGrad.addColorStop(0, "#3A3F4B"); // Lead gray dead state
      hullGrad.addColorStop(0.6, "#5A6173");
      hullGrad.addColorStop(1.0, "#696969");
    }

    ctx.fillStyle = hullGrad;
    drawArrowheadPath(ctx, size);
    ctx.fill();

    // Dark armor plate seam border
    ctx.strokeStyle = "#1A1D24";
    ctx.lineWidth = 1.2;
    drawArrowheadPath(ctx, size);
    ctx.stroke();

    // Structural panel detail line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(size * 0.8, 0);
    ctx.lineTo(-size * 0.2, 0);
    ctx.stroke();

    // --- ELLIPTICAL CYAN COCKPIT (ONLY CYAN SATURATED ELEMENT ON SCREEN) ---
    ctx.save();
    ctx.fillStyle = "#00F3FF";
    ctx.shadowColor = "#00F3FF";
    ctx.shadowBlur = isAlive ? 6 : 0;

    ctx.beginPath();
    ctx.ellipse(size * 0.15, -size * 0.05, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(size * 0.15, -size * 0.05, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Off-center white highlight reflection dot (no eyes/pupils)
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(size * 0.25, -size * 0.09, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Squash-and-stretch pop

    // --- TACTICAL NEAR MISS OVERLAY ---
    if (birdComp.nearMissTimer > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const alphaVal = birdComp.nearMissTimer / 0.3;
      ctx.fillStyle = `rgba(0, 243, 255, ${alphaVal})`;
      ctx.shadowColor = "#00F3FF";
      ctx.shadowBlur = 10 * alphaVal;
      ctx.font = "bold 13px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      const floatY = (0.3 - birdComp.nearMissTimer) * 40;
      ctx.fillText("NEAR_MISS +50", transform.x, transform.y - 35 - floatY);
      ctx.restore();
    }
  }
};

function drawArrowheadPath(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(size * 1.2, 0);                   // Prow (nose tip)
  ctx.lineTo(-size * 0.7, -size * 0.85);       // Top fin tip
  ctx.lineTo(-size * 0.4, -size * 0.35);       // Top wing notch
  ctx.lineTo(-size * 0.55, 0);                 // Rear engine notch center
  ctx.lineTo(-size * 0.4, size * 0.35);        // Bottom wing notch
  ctx.lineTo(-size * 0.7, size * 0.85);        // Bottom fin tip
  ctx.closePath();
}

// ============================================================================
// CONTAINMENT TOWERS (OBSTACLES) — INDUSTRIAL METALLIC PILLARS & RED BEACONS
// ============================================================================

export const drawFlappyPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
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

    // --- METALLIC PILLAR BODY (#2A2A35) ---
    const pillarGrad = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
    pillarGrad.addColorStop(0, "#1A1A22");
    pillarGrad.addColorStop(0.25, "#2A2A35");
    pillarGrad.addColorStop(0.5, "#3F3F50");
    pillarGrad.addColorStop(0.75, "#2A2A35");
    pillarGrad.addColorStop(1.0, "#121218");

    ctx.fillStyle = pillarGrad;
    ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

    // Dark vertical armor panel seams
    ctx.strokeStyle = "#121218";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-halfWidth + width * 0.3, pipeY);
    ctx.lineTo(-halfWidth + width * 0.3, pipeY + pipeHeight);
    ctx.moveTo(-halfWidth + width * 0.7, pipeY);
    ctx.lineTo(-halfWidth + width * 0.7, pipeY + pipeHeight);
    ctx.stroke();

    // --- REINFORCED DOCKING COLLAR AT THE GAP MOUTH ---
    const capHeight = 28;
    const capExtraWidth = 12;
    const capWidth = width + capExtraWidth;
    const capHalfWidth = capWidth / 2;
    const capYOffset = isTopPipe ? (pipeY + pipeHeight - capHeight) : pipeY;

    const collarGrad = ctx.createLinearGradient(-capHalfWidth, 0, capHalfWidth, 0);
    collarGrad.addColorStop(0, "#22222D");
    collarGrad.addColorStop(0.3, "#3A3A4A");
    collarGrad.addColorStop(0.55, "#525266");
    collarGrad.addColorStop(0.8, "#3A3A4A");
    collarGrad.addColorStop(1.0, "#181822");

    ctx.fillStyle = collarGrad;
    ctx.fillRect(-capHalfWidth, capYOffset, capWidth, capHeight);
    ctx.strokeStyle = "#121218";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-capHalfWidth, capYOffset, capWidth, capHeight);

    // Collar bevel line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
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

    // Industrial Rivets along collar
    const rivetCount = 4;
    for (let r = 0; r < rivetCount; r++) {
      const rx = -capHalfWidth + 8 + r * ((capWidth - 16) / (rivetCount - 1));
      const ry = capYOffset + capHeight * 0.5;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(rx - 0.5, ry - 0.5, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- STROBOSCOPIC RED WARNING BEACONS (#FF0000) ---
    const beaconPulse = 0.35 + 0.65 * Math.abs(Math.sin(world.tick * 0.2));
    const beaconY = isTopPipe ? (capYOffset + capHeight - 4) : (capYOffset + 4);

    ctx.save();
    ctx.fillStyle = `rgba(255, 0, 0, ${beaconPulse})`;
    ctx.shadowColor = "#FF0000";
    ctx.shadowBlur = beaconPulse * 12;

    // Beacons on left and right edges of the docking lip
    ctx.beginPath();
    ctx.arc(-capHalfWidth + 8, beaconY, 3.5, 0, Math.PI * 2);
    ctx.arc(capHalfWidth - 8, beaconY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(-capHalfWidth + 8, beaconY, 1.2, 0, Math.PI * 2);
    ctx.arc(capHalfWidth - 8, beaconY, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

// ============================================================================
// STATION HULL GROUND — INDUSTRIAL METALLIC BASE WITH CAUTION STRIPES
// ============================================================================

export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 400 } = render;
    const width = size;
    const height = 40;

    // Dark industrial metal base
    const baseGrad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    baseGrad.addColorStop(0, "#22222C");
    baseGrad.addColorStop(1, "#0D0D12");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Yellow / Black hazard warning caution rim at the top
    const hazardHeight = 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-width / 2, -height / 2, width, hazardHeight);
    ctx.clip();

    ctx.fillStyle = "#FFCC00"; // Yellow caution
    ctx.fillRect(-width / 2, -height / 2, width, hazardHeight);

    // Black diagonal stripes scrolling with camera
    ctx.fillStyle = "#111116";
    const stripeWidth = 12;
    const stripeOffset = (world.tick * 3) % (stripeWidth * 2);

    for (let sx = -width / 2 - stripeWidth * 2; sx < width / 2 + stripeWidth * 2; sx += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(sx + stripeOffset, -height / 2);
      ctx.lineTo(sx + stripeOffset + stripeWidth, -height / 2);
      ctx.lineTo(sx + stripeOffset, -height / 2 + hazardHeight);
      ctx.lineTo(sx + stripeOffset - stripeWidth, -height / 2 + hazardHeight);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Top bounding metal seam
    ctx.strokeStyle = "#5A6173";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(width / 2, -height / 2);
    ctx.stroke();

    // Bottom dark bounding line
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-width / 2, height / 2);
    ctx.lineTo(width / 2, height / 2);
    ctx.stroke();
  }
};

// ============================================================================
// THE DEEP VOID PARALLAX BACKGROUND (#050510) WITH WARP & MEGASTRUCTURE
// ============================================================================

interface Star {
  x: number;
  y: number;
  size: number;
  layer: number; // 0 = distant white, 1 = near pale violet
  alpha: number;
}

let staticStars: Star[] | null = null;

function initStarfield(width: number, height: number): Star[] {
  const stars: Star[] = [];
  // Layer 0: Distant slow white stars (60 count)
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: (i * 37 + 13) % width,
      y: (i * 83 + 29) % height,
      size: 0.8 + (i % 3) * 0.4,
      layer: 0,
      alpha: 0.4 + (i % 5) * 0.12,
    });
  }
  // Layer 1: Near faster pale white-blue stars (40 count)
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: (i * 53 + 7) % width,
      y: (i * 97 + 41) % height,
      size: 1.2 + (i % 3) * 0.6,
      layer: 1,
      alpha: 0.6 + (i % 4) * 0.1,
    });
  }
  return stars;
}

export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world) {
    const gameState = world.getSingleton("FlappyState");
    if (!gameState) return;
    const { width = 400, height = 600 } = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 400, height: 600 };

    if (!staticStars) {
      staticStars = initStarfield(width, height);
    }

    // --- DEEP VOID BASE (#050510) ---
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, width, height);

    // Hypervelocity combo factor calculation
    let warpFactor = 1.0;
    const comboEntities = world.query("Combo");
    if (comboEntities.length > 0) {
      const combo = world.getComponent(comboEntities[0], "Combo") as any;
      if (combo && combo.multiplier > 1) {
        warpFactor = 1.0 + (combo.multiplier - 1) * 0.35;
      }
    }

    // --- PARALLAX STARFIELD LAYERS ---
    const tick = world.tick;
    for (let i = 0; i < staticStars.length; i++) {
      const star = staticStars[i];
      let speed = star.layer === 0 ? 0.2 : 0.8 * warpFactor;
      let starX = (star.x - tick * speed) % width;
      if (starX < 0) starX += width;

      ctx.save();
      ctx.globalAlpha = star.alpha;

      if (star.layer === 0) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(starX, star.y, star.size, star.size);
      } else {
        // Pale white-blue / violet non-saturated star
        ctx.fillStyle = "#E0E5FF";
        if (warpFactor > 1.2) {
          // Hypervelocity speed-line stretch
          const lineLength = Math.min(star.size * 3 * warpFactor, 12);
          ctx.fillRect(starX, star.y, lineLength, star.size * 0.8);
        } else {
          ctx.fillRect(starX, star.y, star.size, star.size);
        }
      }
      ctx.restore();
    }

    // --- OCCASIONAL ISOLATED ABANDONED MEGASTRUCTURE SILHOUETTE ---
    const megaCycle = 1600; // Scrolls once every ~1600 ticks
    const megaProgress = (tick % megaCycle) / megaCycle;
    if (megaProgress < 0.6) {
      const megaX = width - (megaProgress / 0.6) * (width + 250);
      const megaY = height * 0.35;

      ctx.save();
      ctx.fillStyle = "rgba(15, 18, 28, 0.65)"; // Dark void silhouette
      ctx.beginPath();

      // Main station hub core
      ctx.arc(megaX, megaY, 40, 0, Math.PI * 2);
      ctx.fill();

      // Extended solar/antenna arrays
      ctx.fillRect(megaX - 90, megaY - 4, 180, 8);
      ctx.fillRect(megaX - 85, megaY - 25, 6, 50);
      ctx.fillRect(megaX + 80, megaY - 25, 6, 50);
      ctx.fillRect(megaX - 4, megaY - 80, 8, 160);

      // Faint beacon on station tip
      const megaBeacon = 0.2 + 0.3 * Math.sin(tick * 0.05);
      ctx.fillStyle = `rgba(255, 0, 0, ${megaBeacon})`;
      ctx.beginPath();
      ctx.arc(megaX, megaY - 80, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // --- CRT SCANLINES & SCREEN VIGNETTE ---
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
    for (let ly = 0; ly < height; ly += 3) {
      ctx.fillRect(0, ly, width, 1);
    }

    // Subtle dark edge vignette
    const vignGrad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.4,
      width / 2, height / 2, width * 0.8
    );
    vignGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignGrad.addColorStop(1, "rgba(0, 0, 0, 0.45)");
    ctx.fillStyle = vignGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  },
};
