import type { World, CoreComponentRegistry } from "@tiny-aster/core";
import { zeroVx } from "./telegraphedAttackHelpers";

export interface FlankConfig {
  /** Distancia lateral al jugador (px). */
  offsetX: number;
  /** Radio de llegada al punto de flanco. */
  arriveRadius: number;
  /** Tiempo máximo en estado Flank (s). */
  maxDuration: number;
  /** Velocidad mientras flanquea (mult de patrolSpeed). */
  speedMult: number;
}

export const DEFAULT_FLANK: FlankConfig = {
  offsetX: 72,
  arriveRadius: 18,
  maxDuration: 1.4,
  speedMult: 1.15
};

/**
 * Elige lado de flanco determinista.
 * - Si hay indexInGroup: pares izquierda, impares derecha (pinza).
 * - Si no: hash de entity id.
 */
export function pickFlankSide(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>
): number {
  // Preferencia persistida en el ciclo actual
  if (data.flankSide === -1 || data.flankSide === 1) {
    return data.flankSide as number;
  }

  const enemy = world.getComponent(entity, "Enemy") as
    | { indexInGroup?: number; groupSize?: number }
    | undefined;

  if (
    enemy &&
    enemy.groupSize !== undefined &&
    enemy.groupSize > 1 &&
    enemy.indexInGroup !== undefined
  ) {
    // Pinza: mitad del grupo a cada lado
    const side = enemy.indexInGroup % 2 === 0 ? -1 : 1;
    data.flankSide = side;
    return side;
  }

  // Hash estable del entity id
  const side = entity % 2 === 0 ? -1 : 1;
  data.flankSide = side;
  return side;
}

/** Invierte el lado para el próximo ciclo (Recovery). */
export function flipFlankSide(data: Record<string, unknown>): void {
  const cur = data.flankSide === -1 ? -1 : 1;
  data.flankSide = -cur;
}

export interface FlankTarget {
  x: number;
  y: number;
  side: number;
  playerX: number;
  playerY: number;
}

/**
 * Punto de flanco: al costado del jugador, misma altura aproximada.
 * Si el enemigo ya está del lado correcto, empuja un poco más atrás del jugador
 * (offset adicional en X según facing del jugador).
 */
export function computeFlankTarget(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>,
  config: FlankConfig = DEFAULT_FLANK
): FlankTarget | null {
  const sensor = world.getComponent(entity, "PlayerSensor") as
    | { detectedPlayerEntity?: number }
    | undefined;
  if (sensor?.detectedPlayerEntity === undefined) return null;

  const player = world.getComponent(sensor.detectedPlayerEntity, "Transform");
  const self = world.getComponent(entity, "Transform");
  if (!player || !self) return null;

  const px = player.worldX ?? player.x;
  const py = player.worldY ?? player.y;
  const side = pickFlankSide(world, entity, data);

  // Offset lateral; ligera variación vertical por índice (determinista)
  const enemy = world.getComponent(entity, "Enemy") as
    | { indexInGroup?: number }
    | undefined;
  const row = (enemy?.indexInGroup ?? entity) % 3;
  const yJitter = (row - 1) * 8; // -8, 0, 8

  return {
    x: px + side * config.offsetX,
    y: py + yJitter,
    side,
    playerX: px,
    playerY: py
  };
}

/**
 * Steering horizontal hacia el punto de flanco.
 * Respeta GroundDetector (no se tira al vacío / no atraviesa muro).
 * @returns true si ya llegó al punto de flanco.
 */
export function steerTowardFlank(
  world: World<CoreComponentRegistry>,
  entity: number,
  target: FlankTarget,
  speed: number,
  arriveRadius: number
): boolean {
  const self = world.getComponent(entity, "Transform");
  if (!self) return true;

  const sx = self.worldX ?? self.x;
  const dx = target.x - sx;
  const absDx = dx < 0 ? -dx : dx;

  if (absDx <= arriveRadius) {
    zeroVx(world, entity);
    return true;
  }

  let dir = dx > 0 ? 1 : -1;

  // No avanzar hacia el vacío o contra muro
  const gd = world.getComponent(entity, "GroundDetector") as
    | { hasWallAhead?: boolean; hasGroundAhead?: boolean }
    | undefined;
  if (gd) {
    // Alinear detector con dirección deseada vía Patrol.direction si existe
    const patrol = world.getComponent(entity, "Patrol") as
      | { direction: number }
      | undefined;
    if (patrol && patrol.direction !== dir) {
      const mp = world.getMutableComponent(entity, "Patrol") as
        | { direction: number }
        | undefined;
      if (mp) mp.direction = dir;
    }
    // Si el detector aún no se actualizó este frame, usar velocity dir previa;
    // bloqueo conservador: si hay muro en la dirección actual y dir coincide, parar
    if (gd.hasWallAhead) {
      const vel = world.getComponent(entity, "Velocity");
      const movingDir = vel && vel.vx !== 0 ? (vel.vx > 0 ? 1 : -1) : dir;
      if (movingDir === dir) {
        // Intentar el otro lado una vez
        dir = -dir;
      }
    }
    if (gd.hasGroundAhead === false) {
      // Borde: detener y considerar "llegado" para pasar a ataque
      zeroVx(world, entity);
      return true;
    }
  }

  const targetVx = dir * speed;
  const vel = world.getComponent(entity, "Velocity");
  if (vel && vel.vx !== targetVx) {
    const mv = world.getMutableComponent(entity, "Velocity");
    if (mv) mv.vx = targetVx;
  }

  // Facing hacia el movimiento / jugador
  const tr = world.getComponent(entity, "Transform");
  if (tr) {
    const face = target.playerX >= sx ? 1 : -1;
    if (tr.scaleX !== face) {
      const mt = world.getMutableComponent(entity, "Transform");
      if (mt) {
        mt.scaleX = face;
        mt.dirty = true;
      }
    }
  }

  return false;
}

/** ¿Está el enemigo en posición de flanco útil (no delante del jugador de cara a cara)? */
export function isOnFlankAngle(
  enemyX: number,
  playerX: number,
  side: number,
  minLateral: number
): boolean {
  const lateral = (enemyX - playerX) * side;
  return lateral >= minLateral;
}
