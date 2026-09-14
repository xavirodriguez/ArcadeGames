import { System, World, ShapeDrawer } from "@tiny-aster/core";
import { ComboComponent } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";

export interface MutatorVisualMeta {
  icon: string;
  color: string;
  label: string;
}

export const MUTATOR_VISUAL_CONFIG: Record<string, MutatorVisualMeta> = {
  teleport: { icon: "⚡", color: "#00D9FF", label: "Teleport" },
  friendly_fire: { icon: "🎯", color: "#FF006E", label: "Friendly Fire" },
  double_wave: { icon: "⧳", color: "#FFD700", label: "Double Wave" },
  inverse_gravity: { icon: "↓", color: "#00FF41", label: "Inverse Gravity" },
  explosive_invaders: { icon: "▸", color: "#FF4444", label: "Explosive" },
  slow_motion: { icon: "◉", color: "#00D9FF", label: "Slow Motion" },
};

export interface EventCategoryMeta {
  icon: string;
  color: string;
  bgTint: string;
}

export const EVENT_CATEGORY_CONFIG: Record<string, EventCategoryMeta> = {
  formation: { icon: "◊", color: "#FFD700", bgTint: "rgba(255, 212, 0, 0.15)" },
  obstacle: { icon: "▮", color: "#00D9FF", bgTint: "rgba(0, 217, 255, 0.15)" },
  kamikaze: { icon: "⟹", color: "#FF4444", bgTint: "rgba(255, 68, 68, 0.15)" },
  time: { icon: "◉", color: "#00FF41", bgTint: "rgba(0, 255, 65, 0.15)" },
};

export function drawWaveEventBanner(ctx: CanvasRenderingContext2D, world: World<SpaceInvadersComponentRegistry>): void {
  const gameState = world.getSingleton("GameState");
  if (!gameState || !gameState.activeWaveEvent) return;

  const event = gameState.activeWaveEvent;
  const category = EVENT_CATEGORY_CONFIG[event.type] || EVENT_CATEGORY_CONFIG.formation;
  const tick = world.tick;

  ctx.save();

  if (event.phase === "incoming") {
    const bannerWidth = 420;
    const bannerHeight = 36;
    const centerX = GAME_CONFIG.SCREEN_WIDTH / 2;
    const bannerY = 25;

    const pulseOpacity = 0.5 + 0.5 * Math.sin(tick * 0.3);

    ctx.fillStyle = category.bgTint;
    ctx.fillRect(centerX - bannerWidth / 2, bannerY, bannerWidth, bannerHeight);

    ctx.strokeStyle = category.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulseOpacity;
    ctx.strokeRect(centerX - bannerWidth / 2, bannerY, bannerWidth, bannerHeight);

    ctx.globalAlpha = 1.0;
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = category.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = category.color;
    ctx.shadowBlur = 8;
    ctx.fillText(`⚠ INCOMING: ${event.name.toUpperCase()}`, centerX, bannerY + bannerHeight / 2);
  } else if (event.phase === "active") {
    const centerX = GAME_CONFIG.SCREEN_WIDTH / 2;
    const titleY = 20;

    ctx.font = "bold 18px monospace";
    ctx.fillStyle = category.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = category.color;
    ctx.shadowBlur = 10;
    ctx.fillText(`◆ ${event.name.toUpperCase()} ◆`, centerX, titleY);
  }

  ctx.restore();
}

export function drawWaveTimeline(ctx: CanvasRenderingContext2D, currentLevel: number, totalLevels = 25): void {
  ctx.save();
  const startX = 100;
  const startY = 560;
  const width = 600;

  ctx.strokeStyle = "#444444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX + width, startY);
  ctx.stroke();

  const step = width / (totalLevels - 1);
  for (let lvl = 1; lvl <= totalLevels; lvl++) {
    const x = startX + (lvl - 1) * step;
    const isBoss = lvl % 5 === 0;
    const isCurrent = lvl === currentLevel;

    if (isBoss) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("★", x, startY - 8);
    } else {
      ctx.fillStyle = lvl < currentLevel ? "#00FF41" : isCurrent ? "#00D9FF" : "#888888";
      ctx.beginPath();
      ctx.arc(x, startY, isCurrent ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawActiveMutatorsHUD(ctx: CanvasRenderingContext2D, world: World<SpaceInvadersComponentRegistry>): void {
  const activeMutators = world.getResource<string[]>("ActiveRunMutators") || [];
  if (activeMutators.length === 0) return;

  ctx.save();
  let startX = 20;
  const startY = 48;
  const chipHeight = 22;
  const paddingX = 8;

  ctx.font = "12px monospace";
  ctx.textBaseline = "middle";

  for (let i = 0; i < activeMutators.length; i++) {
    const id = activeMutators[i];
    const meta = MUTATOR_VISUAL_CONFIG[id] || { icon: "◆", color: "#00D9FF", label: id };
    const text = `${meta.icon} ${meta.label}`;
    const textWidth = ctx.measureText(text).width;
    const chipWidth = textWidth + paddingX * 2;

    ctx.fillStyle = "rgba(10, 14, 39, 0.85)";
    ctx.fillRect(startX, startY, chipWidth, chipHeight);

    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, chipWidth, chipHeight);

    ctx.fillStyle = "#E8E8E8";
    ctx.fillText(text, startX + paddingX, startY + chipHeight / 2);

    startX += chipWidth + 8;
  }

  ctx.restore();
}

export function drawPlayerRoleBadges(ctx: CanvasRenderingContext2D, world: World<SpaceInvadersComponentRegistry>): void {
  const players = world.query("Player");
  if (players.length === 0) return;

  ctx.save();
  for (let i = 0; i < players.length; i++) {
    const pEntity = players[i];
    const pComp = world.getComponent(pEntity, "Player");
    const role = pComp?.role || "pioneer";
    const pIdx = pComp?.playerIndex ?? (i + 1);

    const badgeMeta = role === "hunter"
      ? { shapeIcon: "◆", color: "#FF006E", name: "HUNTER" }
      : role === "sentinel"
      ? { shapeIcon: "△", color: "#00D9FF", name: "SENTINEL" }
      : role === "support"
      ? { shapeIcon: "⬠", color: "#FFD700", name: "SUPPORT" }
      : { shapeIcon: "▓", color: "#00FF41", name: "PIONEER" };

    const label = `P${pIdx} • ${badgeMeta.name}`;
    ctx.font = "bold 11px monospace";
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(label).width;
    const badgeWidth = textWidth + 28;
    const badgeHeight = 22;
    const badgeX = 20;
    const badgeY = 20 + i * 26;

    ctx.fillStyle = "rgba(10, 14, 39, 0.85)";
    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

    ctx.strokeStyle = badgeMeta.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

    ctx.fillStyle = badgeMeta.color;
    ctx.fillText(badgeMeta.shapeIcon, badgeX + 8, badgeY + badgeHeight / 2 + 1);

    ctx.fillStyle = "#E8E8E8";
    ctx.fillText(label, badgeX + 22, badgeY + badgeHeight / 2 + 1);
  }
  ctx.restore();
}

export function drawKamikazeHUD(ctx: CanvasRenderingContext2D, world: World<SpaceInvadersComponentRegistry>): void {
  const kamikazes = world.query("Kamikaze");
  if (kamikazes.length === 0) return;

  let standardCount = 0;
  let splitterCount = 0;
  let trailCount = 0;

  for (let i = 0; i < kamikazes.length; i++) {
    const k = world.getComponent(kamikazes[i], "Kamikaze");
    if (!k) continue;
    const variant = k.variant || "standard";
    if (variant === "splitter") splitterCount++;
    else if (variant === "trail") trailCount++;
    else standardCount++;
  }

  ctx.save();
  const hudX = 780;
  const hudY = 560;

  ctx.font = "bold 11px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const lines: string[] = [];
  if (standardCount > 0) lines.push(`🔴 Standard x${standardCount}`);
  if (splitterCount > 0) lines.push(`🟣 Splitter x${splitterCount}`);
  if (trailCount > 0) lines.push(`⚡ Trail x${trailCount}`);

  for (let j = 0; j < lines.length; j++) {
    const text = lines[j];
    ctx.fillStyle = "rgba(10, 14, 39, 0.85)";
    const textWidth = ctx.measureText(text).width;
    ctx.fillRect(hudX - textWidth - 8, hudY - j * 18 - 8, textWidth + 8, 16);

    ctx.fillStyle = j === 0 ? "#FF4444" : "#FF006E";
    ctx.fillText(text, hudX - 4, hudY - j * 18);
  }

  ctx.restore();
}

// ============================================================================
// VISUAL-ONLY SHARD PARTICLE POOL (OUTSIDE ECS)
// ============================================================================

export interface ShardParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
}

const SHARD_POOL_SIZE = 120;
export const SHARD_PARTICLE_POOL: ShardParticle[] = Array.from({ length: SHARD_POOL_SIZE }, () => ({
  active: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  size: 0,
  rotation: 0,
  vRot: 0,
  life: 0,
  maxLife: 0,
  color: "#00FFFF"
}));

export function spawnGlassShatter(centerX: number, centerY: number, renderRandom?: any): void {
  const shardColors = ["#00FFFF", "#FFFFFF", "#88FFFF", "#0088FF"];
  const shardCount = 30;

  const nextRand = (): number => {
    if (renderRandom && typeof renderRandom.next === "function") {
      return renderRandom.next();
    }
    return 0.5;
  };

  for (let i = 0; i < shardCount; i++) {
    for (let j = 0; j < SHARD_PARTICLE_POOL.length; j++) {
      const p = SHARD_PARTICLE_POOL[j];
      if (!p.active) {
        const r1 = nextRand();
        const r2 = nextRand();
        const r3 = nextRand();
        const r4 = nextRand();
        const r5 = nextRand();

        const angle = (Math.PI * 2 * i) / shardCount + (r1 - 0.5) * 0.5;
        const speed = 120 + r2 * 260;
        p.active = true;
        p.x = centerX + (r3 - 0.5) * 60;
        p.y = centerY + (r4 - 0.5) * 30;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 50; // initial upward burst
        p.size = 3 + r5 * 8;
        p.rotation = r1 * Math.PI * 2;
        p.vRot = (r2 - 0.5) * 12;
        p.maxLife = 0.5 + r3 * 0.4;
        p.life = p.maxLife;
        p.color = shardColors[Math.floor(r4 * shardColors.length)];
        break;
      }
    }
  }
}

export function updateShardParticles(dt: number): void {
  const gravity = 400;
  for (let i = 0; i < SHARD_PARTICLE_POOL.length; i++) {
    // TODO(refactor): código duplicado detectado (bloque) con flappybird/rendering/FlappyBirdCanvasVisuals.ts:100-109. Considerar extraer a función compartida. Ref: 434358f5
    const p = SHARD_PARTICLE_POOL[i];
    if (p.active) {
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += gravity * dt; // Gravity effect on glass shards
      p.rotation += p.vRot * dt;
    }
  }
}

// ============================================================================
// CANVAS DRAWER FOR GLASS SHARDS & COMBO HUD
// ============================================================================

export function drawShardParticlesCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  for (let i = 0; i < SHARD_PARTICLE_POOL.length; i++) {
    const p = SHARD_PARTICLE_POOL[i];
    if (!p.active) continue;

    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;

    // Draw sharp glass shard triangle
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.lineTo(p.size * 0.6, p.size * 0.8);
    ctx.lineTo(-p.size * 0.6, p.size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

/**
 * System that monitors `Combo` component state and manages presentation & shatter effects.
 *
 * Strictly read-only on `Combo` component to avoid mutating world state in presentation phase.
 */
export class ComboHUDRenderSystem extends System<SpaceInvadersComponentRegistry> {
  private prevTimerRemaining = 0;
  private prevCombo = 0;

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    // 1. Update visual particles
    updateShardParticles(deltaTime);

    // 2. Read Combo singleton / entity safely without mutation
    const comboEntities = world.query("Combo");
    const comboEntity = comboEntities.length > 0 ? comboEntities[0] : undefined;
    const comboComp = comboEntity !== undefined
      ? world.getComponent(comboEntity, "Combo")
      : undefined;

    const currentTimer = comboComp?.timerRemaining ?? 0;
    const currentCombo = comboComp?.combo ?? 0;

    // Detect expiration transition (timerRemaining > 0 -> 0) when an active combo broke
    if (this.prevTimerRemaining > 0 && currentTimer <= 0 && this.prevCombo > 1) {
      // Glass shatter effect centered around top-right HUD area (x: 700, y: 70)
      spawnGlassShatter(700, 70, world.renderRandom);
    }

    this.prevTimerRemaining = currentTimer;
    this.prevCombo = currentCombo;
  }
}

/**
 * Canvas ShapeDrawer for Combo HUD overlaid in Space Invaders screen.
 */
export const drawSpaceInvadersComboHUD: ShapeDrawer<CanvasRenderingContext2D, SpaceInvadersComponentRegistry> = {
  draw(ctx, world) {
    drawPlayerRoleBadges(ctx, world);
    drawActiveMutatorsHUD(ctx, world);
    drawWaveEventBanner(ctx, world);
    drawKamikazeHUD(ctx, world);

    const comboEntities = world.query("Combo");
    if (comboEntities.length > 0) {
      const comboComp = world.getComponent(comboEntities[0], "Combo");
      if (comboComp && comboComp.combo > 0 && comboComp.timerRemaining > 0) {
        const { combo, multiplier, timerRemaining, timerDuration } = comboComp;
        const duration = timerDuration > 0 ? timerDuration : 2.0;
        const timerRatio = Math.max(0, Math.min(1, timerRemaining / duration));

        const hudX = 700;
        const hudY = 70;

        ctx.save();

        const scale = 1.0 + Math.min(0.5, (combo - 1) * 0.05);
        const pulseOpacity = 0.7 + 0.3 * Math.sin(world.tick * 0.2);

        ctx.translate(hudX, hudY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = pulseOpacity;

        ctx.fillStyle = multiplier >= 5 ? "#FFD700" : multiplier >= 3 ? "#FF00FF" : "#00FFFF";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillText(`${multiplier}x MULTIPLIER`, 0, 0);

        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`${combo} COMBO`, 0, 22);

        const barWidth = 100;
        const barHeight = 4;
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(-barWidth / 2, 34, barWidth, barHeight);

        ctx.fillStyle = ctx.shadowColor;
        ctx.fillRect(-barWidth / 2, 34, barWidth * timerRatio, barHeight);

        ctx.restore();
      }
    }

    drawShardParticlesCanvas(ctx);
  }
};
