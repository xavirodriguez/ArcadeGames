/**
 * Pure function to compute ship physics consistently across client-side prediction,
 * server simulation, and singleplayer/multiplayer gameplay.
 *
 * @public
 */
export function computeShipPhysics(
  transform: { rotation: number },
  velocity: { vx: number; vy: number },
  input: { actions: Set<string>; axes: Record<string, number> },
  config: { SHIP_THRUST: number; SHIP_ROTATION_SPEED: number; SHIP_FRICTION: number },
  deltaTimeSec: number
): { vx: number; vy: number; rotation: number } {
  let rotation = transform.rotation;
  let vx = velocity.vx;
  let vy = velocity.vy;

  const actions = input.actions instanceof Set ? input.actions : new Set<string>((input.actions && typeof (input.actions as any)[Symbol.iterator] === "function") ? input.actions : []);
  const axes = input.axes || {};

  const rotationAmount = axes["rotate_x"] ?? axes["horizontal"];
  const rotateLeft = actions.has("rotateLeft");
  const rotateRight = actions.has("rotateRight");
  const thrust = actions.has("thrust");

  // 1. Rotation handling
  if (rotationAmount !== undefined && rotationAmount !== 0) {
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
    const ax = Math.cos(rotation) * config.SHIP_THRUST;
    const ay = Math.sin(rotation) * config.SHIP_THRUST;
    vx += ax * deltaTimeSec;
    vy += ay * deltaTimeSec;
  }

  // 3. Friction handling (exponential decay or linear factor)
  const factor = Math.max(0, 1 - config.SHIP_FRICTION * deltaTimeSec);
  vx *= factor;
  vy *= factor;

  return { vx, vy, rotation };
}
