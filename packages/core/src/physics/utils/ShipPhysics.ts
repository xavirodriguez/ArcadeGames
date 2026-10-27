import { getForwardVector } from "./ForwardVector";
import { rotateTowardsAngle } from "../../input/TouchInputUtils";
import { hasInputAction, InputActionsLike } from "../../input/hasInputAction";

/**
 * Pure function computing ship rotation, thrust acceleration, and friction decay.
 *
 * @remarks
 * Shared across client-side prediction, authoritative server simulation, and singleplayer gameplay
 * to guarantee 100% deterministic ship movement dynamics across network rollbacks.
 * Forward vectors and rotation conventions follow `ForwardVector.ts`.
 * Normalizes rotation to `[-Math.PI, Math.PI]` and applies linear/exponential velocity decay.
 *
 * @param transform - Object containing current rotation in radians.
 * @param velocity - Object containing current velocity components (`vx`, `vy`).
 * @param input - Player input frame payload containing actions, axes, or explicit directional flags.
 * @param config - Ship physics configuration constants (`SHIP_THRUST`, `SHIP_ROTATION_SPEED`, `SHIP_FRICTION`).
 * @param deltaTimeSec - Frame tick duration in seconds.
 * @returns Updated velocity (`vx`, `vy`) and rotation state in radians normalized to `[-Math.PI, Math.PI]`.
 *
 * @public
 */
export function computeShipPhysics(
  transform: { rotation: number },
  velocity: { vx: number; vy: number },
  input: { actions: InputActionsLike; axes: Record<string, number>; rotationAmount?: number; targetAngle?: number; rotateLeft?: boolean; rotateRight?: boolean; thrust?: boolean },
  config: { SHIP_THRUST: number; SHIP_ROTATION_SPEED: number; SHIP_FRICTION: number },
  deltaTimeSec: number
): { vx: number; vy: number; rotation: number } {
  let rotation = transform.rotation;
  let vx = velocity.vx;
  let vy = velocity.vy;

  const actions = input.actions;
  const axes = input.axes || {};

  const rotationAmount = axes["rotate_x"] ?? axes["horizontal"] ?? input.rotationAmount;
  const targetAngle = input.targetAngle ?? axes["target_angle"];
  const rotateLeft = hasInputAction(actions, "rotateLeft") || input.rotateLeft === true;
  const rotateRight = hasInputAction(actions, "rotateRight") || input.rotateRight === true;
  const thrust = hasInputAction(actions, "thrust") || input.thrust === true;

  // 1. Rotation handling
  if (targetAngle !== undefined) {
    const maxRotationStep = config.SHIP_ROTATION_SPEED * deltaTimeSec;
    rotation = rotateTowardsAngle(rotation, targetAngle, maxRotationStep);
  } else if (rotationAmount !== undefined && rotationAmount !== 0) {
    rotation += rotationAmount * config.SHIP_ROTATION_SPEED * deltaTimeSec;
  } else {
    if (rotateLeft) {
      rotation -= config.SHIP_ROTATION_SPEED * deltaTimeSec;
    }
    if (rotateRight) {
      rotation += config.SHIP_ROTATION_SPEED * deltaTimeSec;
    }
  }

  // Keep rotation within [-PI, PI]
  while (rotation > Math.PI) rotation -= Math.PI * 2;
  while (rotation < -Math.PI) rotation += Math.PI * 2;

  // 2. Thrust handling
  if (thrust) {
    const forward = getForwardVector(rotation);
    const ax = forward.x * config.SHIP_THRUST;
    const ay = forward.y * config.SHIP_THRUST;
    vx += ax * deltaTimeSec;
    vy += ay * deltaTimeSec;
  }

  // 3. Friction handling (exponential decay or linear factor)
  const factor = Math.max(0, 1 - config.SHIP_FRICTION * deltaTimeSec);
  vx *= factor;
  vy *= factor;

  return { vx, vy, rotation };
}
