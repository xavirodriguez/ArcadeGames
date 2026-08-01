import { ShapeDrawer, EffectDrawer, HealthComponent, TransformComponent } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdState, BirdComponent, PipeComponent, FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

// ==========================================
// File-Level Presentation Particle System
// ==========================================

interface VisualParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  maxSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: "feather" | "sparkle" | "smoke";
  rotation: number;
  rotSpeed: number;
}

const PARTICLE_LIMIT = 150;
const particlePool: VisualParticle[] = Array.from({ length: PARTICLE_LIMIT }, () => ({
  active: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  color: "",
  size: 0,
  maxSize: 0,
  alpha: 1,
  life: 0,
  maxLife: 0,
  type: "feather",
  rotation: 0,
  rotSpeed: 0
}));

function findInactiveParticle(): VisualParticle | null {
  for (let i = 0; i < PARTICLE_LIMIT; i++) {
    if (!particlePool[i].active) return particlePool[i];
  }
  return null;
}

function spawnFeathers(x: number, y: number, count: number, rand: any) {
  for (let i = 0; i < count; i++) {
    const p = findInactiveParticle();
    if (!p) break;
    p.active = true;
    p.x = x - 5;
    p.y = y + 5;
    p.vx = -50 - rand.next() * 60;
    p.vy = -15 + (rand.next() - 0.5) * 40;
    p.color = "rgba(255, 255, 255, 0.85)";
    p.size = 3 + rand.next() * 4;
    p.maxSize = p.size;
    p.alpha = 1.0;
    p.life = 0;
    p.maxLife = 35 + rand.next() * 25;
    p.type = "feather";
    p.rotation = rand.next() * Math.PI * 2;
    p.rotSpeed = (rand.next() - 0.5) * 0.08;
  }
}

function spawnSparkles(x: number, y: number, count: number, rand: any) {
  for (let i = 0; i < count; i++) {
    const p = findInactiveParticle();
    if (!p) break;
    p.active = true;
    p.x = x + (rand.next() - 0.5) * 15;
    p.y = y + (rand.next() - 0.5) * 15;
    p.vx = -60 - rand.next() * 40;
    p.vy = (rand.next() - 0.5) * 40;
    p.color = rand.next() < 0.5 ? "#FFD700" : "#FFA500"; // Gold or orange
    p.size = 2 + rand.next() * 3;
    p.maxSize = p.size;
    p.alpha = 1.0;
    p.life = 0;
    p.maxLife = 20 + rand.next() * 20;
    p.type = "sparkle";
    p.rotation = rand.next() * Math.PI * 2;
    p.rotSpeed = (rand.next() - 0.5) * 0.15;
  }
}

function spawnDeathExplosion(x: number, y: number, rand: any) {
  // Feathers
  for (let i = 0; i < 15; i++) {
    const p = findInactiveParticle();
    if (!p) break;
    p.active = true;
    p.x = x;
    p.y = y;
    const angle = rand.next() * Math.PI * 2;
    const speed = 40 + rand.next() * 120;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.color = rand.next() < 0.7 ? "#FFD700" : "#FFFFFF";
    p.size = 3 + rand.next() * 4;
    p.maxSize = p.size;
    p.alpha = 1.0;
    p.life = 0;
    p.maxLife = 40 + rand.next() * 30;
    p.type = "feather";
    p.rotation = rand.next() * Math.PI * 2;
    p.rotSpeed = (rand.next() - 0.5) * 0.25;
  }
  // Smoke puffs
  for (let i = 0; i < 12; i++) {
    const p = findInactiveParticle();
    if (!p) break;
    p.active = true;
    p.x = x + (rand.next() - 0.5) * 10;
    p.y = y + (rand.next() - 0.5) * 10;
    const angle = rand.next() * Math.PI * 2;
    const speed = 15 + rand.next() * 50;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.color = "rgba(220, 220, 220, 0.45)";
    p.size = 6 + rand.next() * 8;
    p.maxSize = p.size;
    p.alpha = 0.6;
    p.life = 0;
    p.maxLife = 25 + rand.next() * 20;
    p.type = "smoke";
    p.rotation = rand.next() * Math.PI * 2;
    p.rotSpeed = (rand.next() - 0.5) * 0.05;
  }
}

function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (let i = 0; i < PARTICLE_LIMIT; i++) {
    const p = particlePool[i];
    if (!p.active) continue;

    // Update particle physics
    p.x += p.vx * 0.016;
    p.y += p.vy * 0.016;
    p.rotation += p.rotSpeed;

    if (p.type === "feather") {
      p.vy += 60 * 0.016; // Slight gravity
      p.vx *= 0.96;       // Air friction
    } else if (p.type === "smoke") {
      p.vy -= 10 * 0.016; // Smoke rises slightly
      p.vx *= 0.95;
      p.vy *= 0.95;
    } else {
      p.vx *= 0.97;
      p.vy *= 0.97;
    }

    p.life++;
    const progress = p.life / p.maxLife;

    if (progress >= 1.0) {
      p.active = false;
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.type === "feather") {
      ctx.globalAlpha = (1 - progress) * p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-p.size * 1.4, 0);
      ctx.lineTo(p.size * 1.4, 0);
      ctx.stroke();
    } else if (p.type === "sparkle") {
      ctx.globalAlpha = (1 - progress) * p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      const rOuter = p.size;
      const rInner = rOuter * 0.25;
      for (let s = 0; s < 8; s++) {
        const angle = s * Math.PI / 4;
        const r = s % 2 === 0 ? rOuter : rInner;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else if (p.type === "smoke") {
      ctx.globalAlpha = (1 - progress) * p.alpha * 0.45;
      ctx.fillStyle = p.color;
      const currentSize = p.size + progress * 12;
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

// ==========================================
// Gradients and Styles Cache
// ==========================================

const gradientCache = new Map<string, CanvasGradient>();

function getBirdGradient(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const key = `bird_${size}_${color}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, size * 0.1, 0, 0, size);
    grad.addColorStop(0, "#FFFBB3");
    grad.addColorStop(0.35, color);
    grad.addColorStop(0.8, "#d49213");
    grad.addColorStop(1.0, "#734e05");
    gradientCache.set(key, grad);
  }
  return grad;
}

function getWingGradient(ctx: CanvasRenderingContext2D, size: number) {
  const key = `wing_${size}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createLinearGradient(-size * 0.4, -size * 0.2, size * 0.4, size * 0.2);
    grad.addColorStop(0, "#FFFFFF");
    grad.addColorStop(0.5, "#E8E8E8");
    grad.addColorStop(1, "#A0A0A0");
    gradientCache.set(key, grad);
  }
  return grad;
}

function getBeakGradient(ctx: CanvasRenderingContext2D, size: number) {
  const key = `beak_${size}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createLinearGradient(size * 0.7, 0, size * 1.2, 0);
    grad.addColorStop(0, "#FFA500");
    grad.addColorStop(1, "#FF4500");
    gradientCache.set(key, grad);
  }
  return grad;
}

function getPipeGradient(ctx: CanvasRenderingContext2D, width: number, color: string) {
  const key = `pipe_${width}_${color}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    const half = width / 2;
    grad = ctx.createLinearGradient(-half, 0, half, 0);
    if (color === "green" || color === "#2ecc71") {
      grad.addColorStop(0, "#0b2b16");
      grad.addColorStop(0.2, "#4efc98");
      grad.addColorStop(0.45, "#228b45");
      grad.addColorStop(0.8, "#145c2c");
      grad.addColorStop(1.0, "#082614");
    } else {
      grad.addColorStop(0, "rgba(0,0,0,0.65)");
      grad.addColorStop(0.2, color);
      grad.addColorStop(0.55, "rgba(0,0,0,0.15)");
      grad.addColorStop(0.85, "rgba(0,0,0,0.45)");
      grad.addColorStop(1.0, "rgba(0,0,0,0.75)");
    }
    gradientCache.set(key, grad);
  }
  return grad;
}

function getPipeCapGradient(ctx: CanvasRenderingContext2D, width: number, color: string) {
  const key = `pipe_cap_${width}_${color}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    const half = width / 2;
    grad = ctx.createLinearGradient(-half, 0, half, 0);
    if (color === "green" || color === "#2ecc71") {
      grad.addColorStop(0, "#0f3d1f");
      grad.addColorStop(0.22, "#68ffa7");
      grad.addColorStop(0.5, "#2ecc71");
      grad.addColorStop(0.8, "#196e38");
      grad.addColorStop(1.0, "#0c3a1c");
    } else {
      grad.addColorStop(0, "rgba(0,0,0,0.5)");
      grad.addColorStop(0.2, color);
      grad.addColorStop(0.5, "rgba(0,0,0,0.1)");
      grad.addColorStop(0.8, "rgba(0,0,0,0.35)");
      grad.addColorStop(1.0, "rgba(0,0,0,0.6)");
    }
    gradientCache.set(key, grad);
  }
  return grad;
}

// ==========================================
// Stateful Transition Trackers
// ==========================================

let lastVelocityY = 0;
let lastAlive = true;

// ==========================================
// Custom Shape Drawers
// ==========================================

/**
 * Visuals for the bird.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 15, color = "yellow" } = render;

    const birdComp = world.getComponent(entity, "Bird");
    const pos = world.getComponent(entity, "Transform");

    const isAlive = birdComp ? birdComp.isAlive : true;

    // Reset trackers if game restarted
    if (birdComp && birdComp.isAlive && !lastAlive) {
      lastAlive = true;
      lastVelocityY = 0;
    }

    // 1. Particle Spawning logic based on state transitions
    if (pos && isAlive) {
      // Jump/Flap detection (sudden upward acceleration)
      if (birdComp && birdComp.velocityY < -150 && lastVelocityY >= -150) {
        spawnFeathers(pos.x, pos.y, 4, world.renderRandom);
      }
      // Near miss sparkle trail
      if (birdComp && birdComp.nearMissTimer > 0) {
        if (world.renderRandom.next() < 0.4) {
          spawnSparkles(pos.x, pos.y, 1, world.renderRandom);
        }
      }
    } else if (pos && !isAlive && lastAlive) {
      spawnDeathExplosion(pos.x, pos.y, world.renderRandom);
    }

    // Update trackers for the next frame
    if (birdComp) {
      lastVelocityY = birdComp.velocityY;
    }
    lastAlive = isAlive;

    // 2. Gliding wind lines (drawn behind the bird)
    if (birdComp?.isGliding && isAlive) {
      ctx.save();
      ctx.strokeStyle = "rgba(180, 235, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      const time = (Date.now() / 120);
      for (let i = -1; i <= 1; i++) {
        const offset = i * size * 0.35;
        const wave = Math.sin(time + i * 2.5) * 5;
        ctx.beginPath();
        ctx.moveTo(-size * 0.9, offset);
        ctx.bezierCurveTo(
          -size * 1.6, offset + wave,
          -size * 2.3, offset - wave,
          -size * 3.4, offset + wave * 0.4
        );
        ctx.stroke();
      }

      // Add small wind sparkles
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      const rand = world.renderRandom;
      for (let p = 0; p < 3; p++) {
        const px = -size * (1.1 + rand.next() * 1.6);
        const py = (rand.next() - 0.5) * size * 0.9;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + rand.next() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();

    // 3. Dynamic Squash & Stretch
    if (birdComp && isAlive) {
      const velY = birdComp.velocityY;
      // Stretch along direction of motion (X is forward)
      const stretchX = 1 + Math.min(0.2, Math.abs(velY) * 0.0003);
      const stretchY = 1 - Math.min(0.18, Math.abs(velY) * 0.00025);
      ctx.scale(stretchX, stretchY);
    }

    // Global Alpha / Flashing
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(render.hitFlashFrames / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
    }

    const health = world.getComponent(entity, "Health");
    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      ctx.globalAlpha = (Math.floor(health.invulnerableRemaining / 0.1) % 2 === 0) ? 0.3 : 1.0;
    }

    // 4. Draw Bird Body with 3D Spherical Gradient
    ctx.fillStyle = isAlive ? getBirdGradient(ctx, size, color) : "#8a8a8a";
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 5. Draw Beak with rich Linear Gradient
    ctx.fillStyle = isAlive ? getBeakGradient(ctx, size) : "#666666";
    ctx.beginPath();
    ctx.moveTo(size * 0.7, -size * 0.15);
    ctx.lineTo(size * 1.3, 0);
    ctx.lineTo(size * 0.7, size * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. Draw Wing
    const tick = (world as any).tick !== undefined ? (world as any).tick : (Date.now() / 16);
    const flapSpeed = birdComp && birdComp.velocityY < 0 ? 0.5 : 0.2;
    const wingSweep = isAlive ? Math.sin(tick * flapSpeed) * 0.35 : 0.8; // Wing droops when dead

    ctx.save();
    ctx.translate(-size * 0.15, size * 0.1);
    ctx.rotate(wingSweep);
    ctx.fillStyle = isAlive ? getWingGradient(ctx, size) : "#777777";
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 7. Draw Eye with gloss highlight
    ctx.fillStyle = isAlive ? "white" : "#444444";
    ctx.beginPath();
    ctx.arc(size * 0.4, -size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.beginPath();
    // Dead eye is an 'X'
    if (isAlive) {
      ctx.arc(size * 0.5, -size * 0.3, size * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Eye gloss sparkle
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(size * 0.45, -size * 0.35, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#222222";
      const ex = size * 0.45;
      const ey = -size * 0.3;
      const r = size * 0.12;
      ctx.beginPath();
      ctx.moveTo(ex - r, ey - r);
      ctx.lineTo(ex + r, ey + r);
      ctx.moveTo(ex - r, ey + r);
      ctx.lineTo(ex + r, ey - r);
      ctx.stroke();
    }

    ctx.restore(); // Restore Squash & Stretch

    // 8. Draw Pulsing Shield if Invulnerable
    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0 && isAlive) {
      ctx.save();
      ctx.strokeStyle = "#00FFFF";
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.0;

      const scalePulse = 1.3 + Math.sin(Date.now() / 150) * 0.08;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, size * scalePulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Floating Near Miss text
    if (birdComp && birdComp.nearMissTimer > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const alpha = birdComp.nearMissTimer / 300;
      const floatUp = (1 - alpha) * 22;

      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.textAlign = "center";

      // Shadow border
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
      ctx.lineWidth = 4;
      ctx.strokeText("NEAR MISS! +50", pos!.x, pos!.y - 45 - floatUp);

      // Gold fill
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fillText("NEAR MISS! +50", pos!.x, pos!.y - 45 - floatUp);
      ctx.restore();
    }

    // 10. Update and Draw active presentation particles
    updateAndDrawParticles(ctx);
  }
};

/**
 * Visuals for a pipe segment.
 */
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

    // Draw volumetric 3D cylinder metallic pipe base
    ctx.fillStyle = getPipeGradient(ctx, width, color);
    ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

    // Decorative joint panels/horizontal details
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(-halfWidth, pipeY + pipeHeight * 0.3, width, 2);
    ctx.fillRect(-halfWidth, pipeY + pipeHeight * 0.7, width, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(-halfWidth, pipeY + pipeHeight * 0.3 + 2, width, 1);
    ctx.fillRect(-halfWidth, pipeY + pipeHeight * 0.7 + 2, width, 1);

    // Shaded side borders
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

    // Draw Pipe Cap (Rim facing the gap)
    const capHeight = 30;
    const capExtraWidth = 10;
    const capWidth = width + capExtraWidth;
    const halfCapWidth = capWidth / 2;

    let capY: number;
    if (isTopPipe) {
      capY = pipeY + pipeHeight - capHeight;
    } else {
      capY = pipeY;
    }

    ctx.save();
    // Cap metallic fill
    ctx.fillStyle = getPipeCapGradient(ctx, capWidth, color);
    ctx.fillRect(-halfCapWidth, capY, capWidth, capHeight);

    // Draw 3D rivets
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.lineWidth = 1;
    const rivetCount = 4;
    const rivetSpacing = capWidth / (rivetCount + 1);
    for (let r = 1; r <= rivetCount; r++) {
      const rx = -halfCapWidth + r * rivetSpacing;
      const ry = capY + capHeight / 2;

      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glint highlight
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(rx - 0.8, ry - 0.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    }

    // Neon safety/warning stripe glowing at the absolute gap edge
    const warningPulse = Math.sin(Date.now() / 130) * 0.35 + 0.65;
    ctx.fillStyle = `rgba(255, 60, 60, ${warningPulse})`;
    ctx.shadowColor = "rgba(255, 60, 60, 0.8)";
    ctx.shadowBlur = 8;

    if (isTopPipe) {
      ctx.fillRect(-halfCapWidth, capY + capHeight - 4, capWidth, 4);
    } else {
      ctx.fillRect(-halfCapWidth, capY, capWidth, 4);
    }

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-halfCapWidth, capY, capWidth, capHeight);
    ctx.restore();
  }
};

/**
 * Visuals for the ground.
 */
export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 400, color = "#d2b48c" } = render;
    const width = size;
    const height = 40;

    // Volumetric rich soil gradient
    const soilGrad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    soilGrad.addColorStop(0, "#4a2d14");
    soilGrad.addColorStop(0.35, "#3d230f");
    soilGrad.addColorStop(1, "#1c0f05");
    ctx.fillStyle = soilGrad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Volumetric grass gradient
    const grassGrad = ctx.createLinearGradient(0, -height / 2, 0, -height / 2 + 8);
    grassGrad.addColorStop(0, "#30e378");
    grassGrad.addColorStop(1, "#189445");
    ctx.fillStyle = grassGrad;
    ctx.fillRect(-width / 2, -height / 2, width, 8);

    // Triangular stylized grass border teeth
    ctx.fillStyle = "#189445";
    ctx.beginPath();
    const toothWidth = 8;
    const halfH = -height / 2 + 8;
    ctx.moveTo(-width / 2, halfH);
    for (let gx = -width / 2; gx <= width / 2; gx += toothWidth) {
      ctx.lineTo(gx + toothWidth / 2, halfH + 4);
      ctx.lineTo(gx + toothWidth, halfH);
    }
    ctx.fill();

    // Deterministic soil pebbles/specks using world.renderRandom
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    const rand = world.renderRandom;
    for (let d = 0; d < 12; d++) {
      const sx = -width / 2 + ((entity * d + 47) % Math.floor(width));
      const sy = -height / 2 + 12 + ((entity * d * 29 + 83) % Math.floor(height - 18));
      ctx.fillRect(sx, sy, 3, 2);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
  }
};

/**
 * Scrolling atmospheric cyberpunk sunset background effect with multi-layered parallax.
 */
let bgOffset = 0;
let cachedSkyGradient: CanvasGradient | null = null;
let lastGradientHeight = 0;

export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world) {
    const gameState = world.getSingleton("FlappyState");
    if (!gameState) return;
    const { width = 400, height = 600 } = world.getResource<{ width: number, height: number }>("ScreenConfig") || { width: 400, height: 600 };

    // 1. Beautiful Sunset Sky Gradient
    if (!cachedSkyGradient || lastGradientHeight !== height) {
      cachedSkyGradient = ctx.createLinearGradient(0, 0, 0, height);
      cachedSkyGradient.addColorStop(0, "#0a0314");    // Deep dark cosmos violet
      cachedSkyGradient.addColorStop(0.35, "#21093b"); // Deep royal violet
      cachedSkyGradient.addColorStop(0.7, "#5c1b63");  // Sunset magenta
      cachedSkyGradient.addColorStop(0.92, "#ad3253"); // Rose plum glow
      cachedSkyGradient.addColorStop(1.0, "#f27963");  // Neon warm peach horizon
      lastGradientHeight = height;
    }
    ctx.fillStyle = cachedSkyGradient;
    ctx.fillRect(0, 0, width, height);

    // Slow scrolling ticker
    if (!gameState.isGameOver) {
      bgOffset = (bgOffset + 0.45) % 10000;
    }

    // 2. Giant Glowing Retro Sun (Drawn near the horizon)
    const sunX = width * 0.75;
    const sunY = height * 0.65;
    const sunR = 55;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
    sunGrad.addColorStop(0, "#ffffe6");
    sunGrad.addColorStop(0.3, "#ffaa00");
    sunGrad.addColorStop(0.8, "#ff0066");
    sunGrad.addColorStop(1.0, "rgba(255, 0, 102, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Far-Distant Mountains Parallax Silhouette (Speed: 15% scroll rate)
    ctx.fillStyle = "rgba(43, 15, 59, 0.65)";
    ctx.beginPath();
    ctx.moveTo(0, height);
    const step = 20;
    for (let sx = 0; sx <= width; sx += step) {
      const worldX = sx + bgOffset * 0.15;
      const sy = height * 0.62 + Math.sin(worldX * 0.0035) * 45 + Math.cos(worldX * 0.009) * 15;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 4. Mid-Distant Hills Parallax Silhouette (Speed: 40% scroll rate)
    ctx.fillStyle = "rgba(22, 5, 31, 0.82)";
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let sx = 0; sx <= width; sx += step) {
      const worldX = sx + bgOffset * 0.4;
      const sy = height * 0.68 + Math.cos(worldX * 0.007) * 35 + Math.sin(worldX * 0.016) * 12;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 5. Soft Atmospheric Clouds (Between layers, floating)
    ctx.fillStyle = "rgba(255, 255, 255, 0.11)";
    const cloudOffset = bgOffset * 0.25;
    for (let i = 0; i < 4; i++) {
      const x = ((i * 170 - cloudOffset + width + 50) % (width + 100)) - 50;
      const y = 80 + (i % 2) * 55;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.arc(x + 18, y - 12, 16, 0, Math.PI * 2);
      ctx.arc(x + 36, y, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Retro CRT scanlines overlay
    ctx.strokeStyle = "rgba(0, 0, 0, 0.045)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let sy = 0; sy < height; sy += 4) {
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    // 7. Ambient Vignette Overlay (Darkening the corners for extreme contrast and readability)
    const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, height * 0.45, width / 2, height / 2, height * 0.95);
    vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignetteGrad.addColorStop(1, "rgba(0, 0, 0, 0.52)");
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);
  }
};
