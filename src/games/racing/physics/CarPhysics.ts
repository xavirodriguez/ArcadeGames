import { getForwardVector } from "@tiny-aster/core";
import type { RacingConfig } from "../types/RacingConfigSchema";
import type { RacingInputState } from "../types/RacingTypes";

export interface CarPhysicsResult { vx: number; vy: number; rotation: number; }

export function computeCarPhysics(
  transform: { rotation: number },
  velocity: { vx: number; vy: number },
  input: RacingInputState,
  config: RacingConfig,
  deltaTimeSec: number
): CarPhysicsResult {
  let rotation = transform.rotation;
  let vx = velocity.vx;
  let vy = velocity.vy;
  const steering = Math.max(-1, Math.min(1, input.moveX));
  const throttle = Math.max(-1, Math.min(1, -input.moveY));
  const speed = Math.hypot(vx, vy);
  const speedFactor = Math.min(1, speed / Math.max(1, config.CAR_MAX_SPEED * 0.35));

  rotation += steering * config.CAR_TURN_RATE * (0.35 + speedFactor * 0.65) * deltaTimeSec;
  while (rotation > Math.PI) rotation -= Math.PI * 2;
  while (rotation < -Math.PI) rotation += Math.PI * 2;

  const forward = getForwardVector(rotation);
  const right = { x: -forward.y, y: forward.x };
  const forwardVelocity = vx * forward.x + vy * forward.y;
  const lateralVelocity = vx * right.x + vy * right.y;

  const grip = Math.max(0, Math.min(1, config.CAR_GRIP * deltaTimeSec));
  const correctedLateral = lateralVelocity * Math.max(0, 1 - grip * (input.boost ? config.CAR_DRIFT : 1));
  vx = forward.x * forwardVelocity + right.x * correctedLateral;
  vy = forward.y * forwardVelocity + right.y * correctedLateral;

  const acceleration = config.CAR_ACCELERATION * (input.boost ? config.CAR_BOOST_MULTIPLIER : 1);
  if (throttle > 0) {
    vx += forward.x * acceleration * throttle * deltaTimeSec;
    vy += forward.y * acceleration * throttle * deltaTimeSec;
  } else if (throttle < 0 || input.brake) {
    const brake = config.CAR_BRAKE_DECELERATION * deltaTimeSec;
    const brakeAmount = Math.min(Math.abs(forwardVelocity), brake);
    vx -= forward.x * Math.sign(forwardVelocity || 1) * brakeAmount;
    vy -= forward.y * Math.sign(forwardVelocity || 1) * brakeAmount;
  }

  const rollingFactor = Math.max(0, 1 - config.CAR_ROLLING_DRAG * deltaTimeSec);
  vx *= rollingFactor;
  vy *= rollingFactor;

  const nextSpeed = Math.hypot(vx, vy);
  const maxSpeed = config.CAR_MAX_SPEED * (input.boost ? config.CAR_BOOST_MULTIPLIER : 1);
  if (nextSpeed > maxSpeed) {
    const scale = maxSpeed / nextSpeed;
    vx *= scale;
    vy *= scale;
  }
  return { vx, vy, rotation };
}
