import { World, CoreComponentRegistry } from "@tiny-aster/core";

/**
 * Cooldown de disparo guardado en StateMachine.data.shootCooldownRemaining
 * (mutado in-place en data; no requiere componente extra).
 *
 * Spawn mínimo de proyectil enemigo. Si existe resource "EnemyBulletPool"
 * con acquireBullet, se usa; si no, createEntity ligero.
 */
export function tryEnemyShoot(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>
): boolean {
  if (!data.canShoot) return false;

  const remaining = (data.shootCooldownRemaining as number) ?? 0;
  if (remaining > 0) return false;

  const sensor = world.getComponent(entity, "PlayerSensor") as
    | { detectedPlayerEntity?: number }
    | undefined;
  if (sensor?.detectedPlayerEntity === undefined) return false;

  const self = world.getComponent(entity, "Transform");
  const target = world.getComponent(sensor.detectedPlayerEntity, "Transform");
  if (!self || !target) return false;

  const sx = self.worldX ?? self.x;
  const sy = self.worldY ?? self.y;
  const tx = target.worldX ?? target.x;
  const ty = target.worldY ?? target.y;
  let dx = tx - sx;
  let dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  dx /= len;
  dy /= len;

  const speed = (data.shootSpeed as number) ?? 260;
  const damage = (data.shootDamage as number) ?? 1;
  const category = (data.shootCategory as string) ?? "enemy_bullet";

  const pool = world.getResource<{
    acquireBullet?: (w: World, p: Record<string, unknown>) => number;
  }>("EnemyBulletPool");

  const params = {
    x: sx + dx * 12,
    y: sy + dy * 8,
    dx: dx * speed,
    dy: dy * speed,
    size: 4,
    color: "#f87171",
    ttl: 1.5,
    damageAmount: damage,
    damageCategory: category,
    consumption: "destroy-entity",
    sourceEntity: entity,
    shape: "enemy_bullet"
  };

  if (pool?.acquireBullet) {
    pool.acquireBullet(world, params);
  } else {
    spawnFallbackEnemyBullet(world, params);
  }

  data.shootCooldownRemaining = (data.shootCooldown as number) ?? 1.0;

  if (!world.isReSimulating) {
    const bus = world.getEventBus();
    if (bus) {
      bus.emit("PlaySFX" as any, { name: "shoot_enemy" });
    }
  }

  return true;
}

/** Decrementar cooldowns de disparo en data (llamar desde un system fino o en onUpdate). */
export function tickShootCooldown(
  data: Record<string, unknown>,
  dt: number
): void {
  const r = data.shootCooldownRemaining as number | undefined;
  if (r !== undefined && r > 0) {
    data.shootCooldownRemaining = Math.max(0, r - dt);
  }
}

function spawnFallbackEnemyBullet(
  world: World<CoreComponentRegistry>,
  p: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    size: number;
    color: string;
    ttl: number;
    damageAmount: number;
    damageCategory: string;
    consumption: string;
    sourceEntity: number;
    shape: string;
  }
): number {
  const e = world.createEntity();
  world.addComponent(e, {
    type: "Transform",
    x: p.x,
    y: p.y,
    worldX: p.x,
    worldY: p.y,
    rotation: Math.atan2(p.dy, p.dx),
    worldRotation: Math.atan2(p.dy, p.dx),
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  } as any);
  world.addComponent(e, {
    type: "Velocity",
    vx: p.dx,
    vy: p.dy,
    angularVelocity: 0
  } as any);
  world.addComponent(e, {
    type: "TTL",
    remaining: p.ttl,
    timeLeft: p.ttl
  } as any);
  world.addComponent(e, {
    type: "Damage",
    amount: p.damageAmount,
    category: p.damageCategory,
    consumption: p.consumption,
    friendlyFire: false,
    sourceEntity: p.sourceEntity
  } as any);
  world.addComponent(e, {
    type: "Faction",
    faction: "enemy",
    value: "enemy"
  } as any);
  world.addComponent(e, {
    type: "Collider2D",
    shape: { type: "aabb", halfWidth: p.size, halfHeight: p.size },
    layer: 1 << 5,
    mask: 1, // player layer — ajustar a tu máscara
    isTrigger: true,
    enabled: true
  } as any);
  world.addComponent(e, {
    type: "CollisionEvents",
    collisions: [],
    activeTriggers: [],
    triggersEntered: [],
    triggersExited: []
  } as any);
  world.addComponent(e, {
    type: "Render",
    shape: p.shape,
    size: p.size,
    color: p.color,
    visible: true,
    opacity: 1,
    order: 4,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0
  } as any);
  return e;
}
