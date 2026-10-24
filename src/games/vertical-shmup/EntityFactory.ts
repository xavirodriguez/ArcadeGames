import { World, Entity, EntityBuilder, ShapeType, CircleShape, BoundaryComponent } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { ShmupComponentRegistry, ShmupEnemyArchetype } from "./types/ShmupTypes";
import { ShmupConfig } from "./types/ShmupConfigSchema";
import { PlayerBulletPool, EnemyBulletPool } from "./EntityPool";
import { getGameplayColor } from "../../theme/GameplayColorMap";
import { SHMUP_COLOR_TOKENS } from "./rendering/ShmupColorTokens";
import type { BulletPatternConfig } from "../shared/BulletPatternSystem";

function nextGameplayRandom(world: World<ShmupComponentRegistry>): number {
  const random = world.gameplayRandom;
  const wasLocked = random.isLocked();
  if (wasLocked) random.unlock();
  try {
    return random.next();
  } finally {
    if (wasLocked) random.lock();
  }
}

export function createPlayer(world: World<ShmupComponentRegistry>, x: number, y: number): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig")!;
  const e = world.createEntity();
  EntityBuilder.fromEntity(world, e)
    .withTransform({ x, y })
    .withVelocity()
    .withRender({ shape: "shmup_player", size: c.PLAYER_SIZE, color: SHMUP_COLOR_TOKENS.player.primary, order: 5 })
    .withCollider({ shape: { type: ShapeType.Circle, radius: c.PLAYER_COLLIDER_RADIUS } as CircleShape, layer: CollisionLayers.PLAYER, mask: CollisionLayers.ENEMY })
    .withCollisionEvents();
  world.addComponent(e, { type: "ShmupPlayer" });
  world.addComponent(e, { type: "Input", axes: {}, actions: [], shootCooldownRemaining: 0 });
  world.addComponent(e, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 });
  world.addComponent(e, { type: "Faction", faction: "player", value: "player" });
  world.addComponent(e, {
    type: "Boundary",
    minX: c.PLAYER_SIZE,
    maxX: c.WORLD_WIDTH - c.PLAYER_SIZE,
    minY: c.PLAYER_SIZE,
    maxY: c.WORLD_HEIGHT - c.PLAYER_SIZE,
    width: c.WORLD_WIDTH,
    height: c.WORLD_HEIGHT,
    mode: "bounce",
    bounceX: false,
    bounceY: false,
    clampX: true,
    clampY: true
  } as BoundaryComponent);
  world.addComponent(e, { type: "LocalPlayer" });
  return e;
}

export function createEnemy(world: World<ShmupComponentRegistry>, x: number, y: number, kind: "straight"|"sine"|"arc" = "straight", wave: number = 1, archetype: ShmupEnemyArchetype = "scout"): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig")!;
  const isBoss = kind === "boss";
  const isArmored = kind === "armored";

  const enemySpeed = (isBoss ? c.ENEMY_SPEED * 0.4 : isArmored ? c.ENEMY_SPEED * 0.7 : c.ENEMY_SPEED) * Math.min(2.0, 1 + (wave - 1) * 0.08);
  const flightDistance = c.WORLD_HEIGHT + c.OFFSCREEN_MARGIN * 2;
  const pathDuration = flightDistance / Math.max(1, enemySpeed);

  const isUpdating = world.isUpdating;
  const e = isUpdating ? world.reserveEntityId() : world.createEntity();
  if (isUpdating) {
    world.getCommandBuffer().createEntity(e);
  }

  const waveMult = 1 + (wave - 1) * 0.15;
  const baseBulletSpeed = c.ENEMY_BULLET_SPEED ?? 280;
  const patternConfigs: Record<string, BulletPatternConfig> = {
    straight: { kind: "aimed", bulletCount: 1, speed: baseBulletSpeed * Math.min(1.5, waveMult), ratePerSec: 0.8 * waveMult },
    sine: { kind: "spread", bulletCount: 3, speed: baseBulletSpeed * 0.9 * Math.min(1.5, waveMult), ratePerSec: 0.6 * waveMult, arcDegrees: 45 },
    arc: { kind: "ring", bulletCount: 6, speed: baseBulletSpeed * 0.8 * Math.min(1.5, waveMult), ratePerSec: 0.4 * waveMult },
    armored: { kind: "spread", bulletCount: 5, speed: baseBulletSpeed * 0.85 * Math.min(1.5, waveMult), ratePerSec: 0.5 * waveMult, arcDegrees: 60 },
    boss: { kind: "ring", bulletCount: 8, speed: baseBulletSpeed * 0.75 * Math.min(1.5, waveMult), ratePerSec: 0.8 * waveMult }
  };
  const patternConfig = patternConfigs[kind] ?? patternConfigs.straight;
  const pathKind = (kind === "armored" || kind === "boss") ? "sine" : kind;

  const entitySize = isBoss ? 85 : isArmored ? Math.floor(c.ENEMY_SIZE * 1.4) : c.ENEMY_SIZE;
  const colliderRadius = isBoss ? 42 : isArmored ? 22 : c.ENEMY_COLLIDER_RADIUS;

  const add = (comp: unknown) => {
    if (isUpdating) {
      world.getCommandBuffer().addComponent(e, comp as never);
    } else {
      world.addComponent(e, comp as never);
    }
  };

  add({
    type: "Transform",
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: x,
    worldY: y,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  });
  add({
    type: "Velocity",
    vx: 0,
    vy: enemySpeed,
    angularVelocity: 0
  });
  add({
    type: "Render",
    visible: true,
    opacity: 1,
    order: 4,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0,
    muzzleFlashFrames: 0,
    shape: "shmup_enemy",
    size: entitySize,
    color: isBoss ? SHMUP_COLOR_TOKENS.enemy.accent : SHMUP_COLOR_TOKENS.enemy.primary
  });
  add({
    type: "Collider",
    shape: { type: ShapeType.Circle, radius: colliderRadius } as CircleShape,
    layer: CollisionLayers.ENEMY,
    mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
    enabled: true,
    isTrigger: false
  });
  add({
    type: "CollisionEvents",
    collisions: [],
    activeTriggers: [],
    triggersEntered: [],
    triggersExited: []
  });
  const scaledScore = Math.floor(c.ENEMY_SCORE * (1 + (wave - 1) * 0.2));
  const scaledHp = c.ENEMY_HP + Math.floor((wave - 1) / 3);
  add({ type: "ShmupEnemy", score: scaledScore, archetype });
  add({ type: "Health", current: scaledHp, max: scaledHp });
  add({ type: "Faction", faction: "enemy", value: "enemy" });
  add({ type: "EnemyPath", kind: pathKind, elapsed: 0, duration: pathDuration, speed: enemySpeed, amplitude: isBoss ? 80 : 120, frequency: isBoss ? 1.0 : 1.8, originX: x, originY: y });
  add({
    type: "Boundary",
    minX: -c.OFFSCREEN_MARGIN,
    maxX: c.WORLD_WIDTH + c.OFFSCREEN_MARGIN,
    minY: -c.OFFSCREEN_MARGIN * 2,
    maxY: c.WORLD_HEIGHT + c.OFFSCREEN_MARGIN,
    width: c.WORLD_WIDTH + c.OFFSCREEN_MARGIN,
    height: c.WORLD_HEIGHT + c.OFFSCREEN_MARGIN,
    mode: "destroy"
  } as BoundaryComponent);
  add({
    type: "BulletPattern",
    config: patternConfig,
    cooldownRemaining: 0.8 + nextGameplayRandom(world) * 0.5,
    phase: 0
  });

  return e;
}

export function createPlayerBullet(world: World<ShmupComponentRegistry>, x: number, y: number, pool: PlayerBulletPool): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig");
  return pool.acquireBullet(world, {
    x,
    y,
    dx: 0,
    dy: -(c?.PLAYER_BULLET_SPEED ?? 850),
    size: c?.PLAYER_BULLET_SIZE ?? 6,
    color: SHMUP_COLOR_TOKENS.player.primary,
    ttl: c?.PLAYER_BULLET_TTL ?? 2.5
  });
}

export function createEnemyBullet(
  world: World<ShmupComponentRegistry>,
  x: number,
  y: number,
  dx: number,
  dy: number,
  pool: EnemyBulletPool,
  colorOverride?: string
): Entity {
  const c = world.getResource<ShmupConfig>("GameConfig");
  const bulletColor = colorOverride ?? SHMUP_COLOR_TOKENS.bullet.warm;
  return pool.acquireBullet(world, {
    x,
    y,
    dx,
    dy,
    size: c?.ENEMY_BULLET_SIZE ?? 6,
    color: bulletColor,
    ttl: c?.ENEMY_BULLET_TTL ?? 6
  });
}
