import { ShapeDrawer, EffectDrawer, RenderComponent, World, CoreComponentRegistry } from "@tiny-aster/core";
import { colors } from "../../../theme/colors";

const gradientCache = new Map<number, CanvasGradient>();
let lastCtx: CanvasRenderingContext2D | null = null;

function getMemoryCoreGradient(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  // Use numeric hash key: 1000 + size
  const key = 1000 + size;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.5);
    grad.addColorStop(0, colors.white);
    grad.addColorStop(0.3, colors.yellow);
    grad.addColorStop(1, colors.amber);
    gradientCache.set(key, grad);
  }
  return grad;
}

function getPulseAttackGradient(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  // Use numeric hash key: 2000 + size
  const key = 2000 + size;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    grad.addColorStop(0.4, "rgba(0, 240, 255, 0.6)");
    grad.addColorStop(1, "rgba(0, 240, 255, 0)");
    gradientCache.set(key, grad);
  }
  return grad;
}

export const drawEchoBackground: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const width = screenConfig.width;
    const height = screenConfig.height;
    const runState = world.getResource<any>("RunState");
    const elapsed = runState?.elapsedTime || (world.tick * 0.016);

    ctx.fillStyle = colors.backgroundDark;
    ctx.fillRect(0, 0, width, height);

    // Digital matrix background lines
    ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
    ctx.lineWidth = 1;

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

    // Draw some ambient technological circuits/particles
    ctx.fillStyle = "rgba(255, 0, 85, 0.08)";
    for (let i = 0; i < 5; i++) {
      const px = ((i * 173 + elapsed * 5) % width);
      const py = ((i * 291 + elapsed * 8) % height);
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

export const drawEchoPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 20;

    // If invulnerable, blink
    const health = world.getComponent(entity, "Health" as any) as any;
    if (health && health.invulnerableRemaining && health.invulnerableRemaining > 0) {
      if (Math.floor(world.tick / 4) % 2 === 0) {
        return;
      }
    }

    ctx.save();

    // Draw cyber android "Echo"
    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.7, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulse glow effect
    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 10;

    // Main metallic body
    ctx.fillStyle = colors.textSecondary;
    ctx.strokeStyle = colors.cyan;
    ctx.lineWidth = 2;

    // Head
    ctx.beginPath();
    ctx.arc(0, -size * 0.4, size * 0.35, Math.PI, 0);
    ctx.lineTo(0, -size * 0.4);
    ctx.fill();
    ctx.stroke();

    // Glow visor (eye)
    ctx.shadowColor = colors.pink;
    ctx.fillStyle = colors.pink;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.45, size * 0.2, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = colors.cyan;
    // Torso
    ctx.fillStyle = colors.borderDark;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6, 4);
    } else {
      ctx.rect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6);
    }
    ctx.fill();
    ctx.stroke();

    // Energy Core (chest glow)
    ctx.fillStyle = colors.cyan;
    ctx.beginPath();
    ctx.arc(0, size * 0.1, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Legs/thruster base
    ctx.fillStyle = colors.backgroundSlate;
    ctx.beginPath();
    ctx.arc(-size * 0.15, size * 0.5, size * 0.08, 0, Math.PI * 2);
    ctx.arc(size * 0.15, size * 0.5, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawMemoryFragment: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 16;
    const elapsed = world.tick * 0.016;
    const hoverOffset = Math.sin(elapsed * 6) * 4;

    ctx.save();
    ctx.translate(0, hoverOffset);
    ctx.rotate(elapsed * 1.5);

    ctx.shadowColor = colors.purple;
    ctx.shadowBlur = 8;

    // Draw glowing diamond
    ctx.fillStyle = "rgba(168, 85, 247, 0.4)";
    ctx.strokeStyle = colors.violet;
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
    ctx.fillStyle = colors.white;
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

export const drawMemoryCore: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 24;
    const elapsed = world.tick * 0.016;
    const hoverOffset = Math.sin(elapsed * 4) * 6;

    ctx.save();
    ctx.translate(0, hoverOffset);

    // Glow
    ctx.shadowColor = colors.amber;
    ctx.shadowBlur = 15;

    // Orbiting ring 1
    ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
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

export const drawCheckpointNode: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 32;
    const respawnPoint = world.getComponent(entity, "RespawnPoint" as any) as any;
    const runState = world.getResource<any>("RunState");
    const isActive = runState && respawnPoint && runState.activeCheckpoint === respawnPoint.checkpointId;

    ctx.save();

    ctx.shadowColor = isActive ? colors.green : colors.red;
    ctx.shadowBlur = 10;

    // Base
    ctx.fillStyle = colors.slate;
    ctx.strokeStyle = colors.borderLight;
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);
    ctx.strokeRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);

    // Pillar
    ctx.fillStyle = colors.borderDark;
    ctx.fillRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);
    ctx.strokeRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);

    // Screen
    ctx.fillStyle = isActive ? colors.green : colors.red; // Green vs Red
    ctx.fillRect(-size * 0.18, -size * 0.4, size * 0.36, size * 0.35);

    // Core/Data symbol
    ctx.fillStyle = isActive ? colors.green : colors.red;
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

    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 12;

    // Radial shockwave arc ahead
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
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 22;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Patrol";

    ctx.save();

    // Alert blinking
    const isAlert = state === "Alert" || state === "Windup";
    const glowColor = isAlert ? colors.orange : (state === "Attack" ? colors.red : colors.purple);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    // Outer casing
    ctx.fillStyle = colors.borderDark;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sensor Eye
    ctx.fillStyle = isAlert && Math.floor(world.tick / 5) % 2 === 0 ? colors.white : glowColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Anti-grav hover spikes/prongs
    ctx.strokeStyle = colors.borderLight;
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
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 24;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Idle";

    ctx.save();

    const glowColor = state === "Attack" ? colors.cyan : colors.green;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    ctx.fillStyle = colors.slate;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    // Squashed/stretched body based on state
    let scaleX = 1;
    let scaleY = 1;

    if (state === "Windup" || state === "Compress") {
      scaleX = 1.3;
      scaleY = 0.7;
    } else if (state === "Attack") {
      scaleX = 0.8;
      scaleY = 1.25;
    }

    ctx.scale(scaleX, scaleY);

    // Leg mechanism (spring)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.15, size * 0.3);
    ctx.lineTo(size * 0.15, size * 0.3);
    ctx.closePath();
    ctx.stroke();

    // Head unit
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45, 3);
    } else {
      ctx.rect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45);
    }
    ctx.fill();
    ctx.stroke();

    // Glowing indicator visor
    ctx.fillStyle = glowColor;
    ctx.fillRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.1);

    ctx.restore();
  }
};

export const drawWatcher: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 26;

    ctx.save();

    ctx.shadowColor = colors.blue;
    ctx.shadowBlur = 10;

    // Mount turret bracket
    ctx.fillStyle = colors.borderDark;
    ctx.strokeStyle = colors.blue;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, size * 0.3, size * 0.3, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Lens sphere
    ctx.fillStyle = colors.backgroundSlate;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Concentric lens scanner rings
    ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.blueLight;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawCharger: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 28;
    const sm = world.getComponent(entity, "StateMachine" as any) as any;
    const state = sm ? sm.currentState : "Idle";

    ctx.save();

    const isStunned = state === "Recovery" || state === "Stunned";
    const glowColor = isStunned ? colors.amber : colors.red;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    ctx.fillStyle = colors.backgroundSlate;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    // Sturdy casing with horns/battering plate
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.4, size * 0.4);
    ctx.lineTo(-size * 0.4, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plate stripes (armor pattern)
    ctx.fillStyle = glowColor;
    ctx.fillRect(-size * 0.25, -size * 0.1, size * 0.1, size * 0.3);
    ctx.fillRect(size * 0.15, -size * 0.1, size * 0.1, size * 0.3);

    // Stunned indicator (spinning stars)
    if (isStunned) {
      const elapsed = world.tick * 0.1;
      ctx.strokeStyle = colors.yellow;
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
