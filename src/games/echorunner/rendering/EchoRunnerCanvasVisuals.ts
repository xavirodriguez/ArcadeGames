import { Renderer, TransformComponent, RenderComponent, World } from "@tiny-aster/core";

export function drawEchoBackground(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number): void {
  ctx.fillStyle = "#0a0a14";
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
  ctx.fillStyle = "rgba(255, 0, 255, 0.08)";
  for (let i = 0; i < 5; i++) {
    const px = ((i * 173 + elapsed * 5) % width);
    const py = ((i * 291 + elapsed * 8) % height);
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawEchoPlayer(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent,
  world: World,
  entity: number
): void {
  const size = render.size || 20;
  ctx.save();
  ctx.translate(transform.worldX, transform.worldY);
  ctx.rotate(transform.worldRotation);

  // If invulnerable, blink
  const health = world.getComponent(entity, "Health" as any) as any;
  if (health && health.invulnerableRemaining && health.invulnerableRemaining > 0) {
    if (Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.restore();
      return;
    }
  }

  // Draw cyber android "Echo"
  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.7, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pulse glow effect
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 10;

  // Main metallic body
  ctx.fillStyle = "#e0e6ed";
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2;

  // Head
  ctx.beginPath();
  ctx.arc(0, -size * 0.4, size * 0.35, Math.PI, 0);
  ctx.lineTo(0, -size * 0.4);
  ctx.fill();
  ctx.stroke();

  // Glow visor (eye)
  ctx.shadowColor = "#ff007f";
  ctx.fillStyle = "#ff007f";
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.45, size * 0.2, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "#00f0ff";
  // Torso
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.roundRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6, 4);
  ctx.fill();
  ctx.stroke();

  // Energy Core (chest glow)
  ctx.fillStyle = "#00f0ff";
  ctx.beginPath();
  ctx.arc(0, size * 0.1, size * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Legs/thruster base
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(-size * 0.15, size * 0.5, size * 0.08, 0, Math.PI * 2);
  ctx.arc(size * 0.15, size * 0.5, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawMemoryFragment(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent
): void {
  const size = render.size || 16;
  const elapsed = Date.now() / 1000;
  const hoverOffset = Math.sin(elapsed * 6) * 4;

  ctx.save();
  ctx.translate(transform.worldX, transform.worldY + hoverOffset);
  ctx.rotate(elapsed * 1.5);

  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 8;

  // Draw glowing diamond
  ctx.fillStyle = "rgba(168, 85, 247, 0.4)";
  ctx.strokeStyle = "#c084fc";
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
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.25);
  ctx.lineTo(size * 0.18, 0);
  ctx.lineTo(0, size * 0.25);
  ctx.lineTo(-size * 0.18, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawMemoryCore(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent
): void {
  const size = render.size || 24;
  const elapsed = Date.now() / 1000;
  const hoverOffset = Math.sin(elapsed * 4) * 6;

  ctx.save();
  ctx.translate(transform.worldX, transform.worldY + hoverOffset);

  // Glow
  ctx.shadowColor = "#f59e0b";
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
  const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.5);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.3, "#fef08a");
  gradient.addColorStop(1, "#f59e0b");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawCheckpointNode(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent,
  world: World,
  entity: number
): void {
  const size = render.size || 32;
  const respawnPoint = world.getComponent(entity, "RespawnPoint" as any) as any;
  const runState = world.getResource<any>("RunState");
  const isActive = runState && respawnPoint && runState.activeCheckpoint === respawnPoint.checkpointId;

  ctx.save();
  ctx.translate(transform.worldX, transform.worldY);

  ctx.shadowColor = isActive ? "#22c55e" : "#ef4444";
  ctx.shadowBlur = 10;

  // Base
  ctx.fillStyle = "#334155";
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.fillRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);
  ctx.strokeRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);

  // Pillar
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);
  ctx.strokeRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);

  // Screen
  ctx.fillStyle = isActive ? "#15803d" : "#991b1b";
  ctx.fillRect(-size * 0.18, -size * 0.4, size * 0.36, size * 0.35);

  // Core/Data symbol
  ctx.fillStyle = isActive ? "#4ade80" : "#f87171";
  ctx.beginPath();
  if (isActive) {
    ctx.arc(0, -size * 0.22, size * 0.08, 0, Math.PI * 2);
  } else {
    ctx.fillRect(-size * 0.04, -size * 0.3, size * 0.08, size * 0.16);
  }
  ctx.fill();

  ctx.restore();
}

export function drawPulseAttack(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent
): void {
  const size = render.size || 35;
  ctx.save();
  ctx.translate(transform.worldX, transform.worldY);
  ctx.rotate(transform.worldRotation);

  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 12;

  // Radial shockwave arc ahead
  const grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  grad.addColorStop(0.4, "rgba(0, 240, 255, 0.6)");
  grad.addColorStop(1, "rgba(0, 240, 255, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size, -Math.PI * 0.35, Math.PI * 0.35);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawSentinel(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent,
  world: World,
  entity: number
): void {
  const size = render.size || 22;
  const sm = world.getComponent(entity, "StateMachine" as any) as any;
  const state = sm ? sm.currentState : "Patrol";

  ctx.save();
  ctx.translate(transform.worldX, transform.worldY);

  // Alert blinking
  const isAlert = state === "Alert" || state === "Windup";
  const glowColor = isAlert ? "#f97316" : (state === "Attack" ? "#ef4444" : "#a855f7");
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;

  // Outer casing
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sensor Eye
  ctx.fillStyle = isAlert && Math.floor(Date.now() / 80) % 2 === 0 ? "#ffffff" : glowColor;
  ctx.beginPath();
  ctx.arc(0, -size * 0.05, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Anti-grav hover spikes/prongs
  ctx.strokeStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(-size * 0.45, size * 0.1);
  ctx.lineTo(-size * 0.6, size * 0.3);
  ctx.moveTo(size * 0.45, size * 0.1);
  ctx.lineTo(size * 0.6, size * 0.3);
  ctx.stroke();

  ctx.restore();
}

export function drawHopper(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent,
  world: World,
  entity: number
): void {
  const size = render.size || 24;
  const sm = world.getComponent(entity, "StateMachine" as any) as any;
  const state = sm ? sm.currentState : "Idle";

  ctx.save();
  ctx.translate(transform.worldX, transform.worldY);

  const glowColor = state === "Attack" ? "#00f0ff" : "#22c55e";
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;

  ctx.fillStyle = "#334155";
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
  ctx.roundRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45, 3);
  ctx.fill();
  ctx.stroke();

  // Glowing indicator visor
  ctx.fillStyle = glowColor;
  ctx.fillRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.1);

  ctx.restore();
}

export function drawWatcher(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent,
  _world: World,
  _entity: number
): void {
  const size = render.size || 26;
  ctx.save();
  ctx.translate(transform.worldX, transform.worldY);

  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 10;

  // Mount turret bracket
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(0, size * 0.3, size * 0.3, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  // Lens sphere
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(0, -size * 0.05, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Concentric lens scanner rings
  ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
  ctx.beginPath();
  ctx.arc(0, -size * 0.05, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#60a5fa";
  ctx.beginPath();
  ctx.arc(0, -size * 0.05, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawCharger(
  ctx: CanvasRenderingContext2D,
  transform: TransformComponent,
  render: RenderComponent,
  world: World,
  entity: number
): void {
  const size = render.size || 28;
  const sm = world.getComponent(entity, "StateMachine" as any) as any;
  const state = sm ? sm.currentState : "Idle";

  ctx.save();
  ctx.translate(transform.worldX, transform.worldY);

  const isStunned = state === "Recovery" || state === "Stunned";
  const glowColor = isStunned ? "#f59e0b" : "#ef4444";
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;

  ctx.fillStyle = "#0f172a";
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
    const elapsed = Date.now() / 200;
    ctx.strokeStyle = "#fbbf24";
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
