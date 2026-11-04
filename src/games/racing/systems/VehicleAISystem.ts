import {
  System,
  World,
  resolveVehicleWaypointSteering,
  applyWaypointSteering,
  normalizeAngle
} from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { AIPersonalityComponent } from "../types/RacingTypes";
import { computeRaceProgress } from "../raceProgress";
import { createAIPersonality } from "../aiPersonality";

const REPULSION_RADIUS = 40;
const REPULSION_STRENGTH = 18;
const EUCLIDEAN_NEAR_SKIP = 55;

const DEFAULT_PERSONALITY: AIPersonalityComponent = createAIPersonality("normal");

/**
 * Perpendicular unit vector to (dx, dy). Prefer the right-hand normal.
 */
function perpendicular(dx: number, dy: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 1 };
  return { x: -dy / len, y: dx / len };
}

/**
 * Deterministic noise in [-1, 1] derived from entity id + tick.
 * Uses gameplayRandom when available; otherwise a cheap hash of id+tick.
 */
function deterministicNoise(
  world: World<RacingComponentRegistry, RacingEventRegistry>,
  entity: number,
  amplitude: number
): number {
  if (amplitude <= 0) return 0;
  const rng = world.gameplayRandom;
  if (rng && typeof rng.next === "function") {
    // Consume one sample — deterministic across identical seeds
    return (rng.next() * 2 - 1) * amplitude;
  }
  // Fallback hash (still deterministic given same entity id sequence)
  const tick = world.getResource<number>("SimulationTick") ?? 0;
  const h = ((entity * 73856093) ^ (tick * 19349663)) >>> 0;
  return ((h % 10000) / 5000 - 1) * amplitude;
}

export class VehicleAISystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const h2h = world.getSingleton("HeadToHeadState");
    if (h2h && h2h.phase !== "racing") return;

    const aiCars = world.query("Car", "VehicleWaypoint", "VehicleSteering", "Transform");
    if (aiCars.length === 0) return;

    // Human progress (shared metric)
    const humanCars = world.query("LocalPlayer", "Transform", "Lap");
    let humanProgress = 0;
    let humanTransform: { x: number; y: number } | undefined;
    let totalCheckpoints = 0;
    const checkpointPositions: { x: number; y: number }[] = [];

    const cpEntities = world.query("Checkpoint", "Transform");
    const orderedCp: Array<{ index: number; x: number; y: number }> = [];
    for (let i = 0; i < cpEntities.length; i += 1) {
      const e = cpEntities[i]!;
      const cp = world.getComponent(e, "Checkpoint");
      const tr = world.getComponent(e, "Transform");
      if (cp && tr) orderedCp.push({ index: cp.index, x: tr.x, y: tr.y });
    }
    orderedCp.sort((a, b) => a.index - b.index);
    totalCheckpoints = orderedCp.length;
    for (let i = 0; i < orderedCp.length; i += 1) {
      checkpointPositions.push({ x: orderedCp[i]!.x, y: orderedCp[i]!.y });
    }

    if (humanCars.length > 0) {
      const h = humanCars[0]!;
      humanTransform = world.getComponent(h, "Transform");
      const humanLap = world.getComponent(h, "Lap");
      if (humanLap && humanTransform) {
        humanProgress = computeRaceProgress(
          humanLap,
          totalCheckpoints,
          humanTransform,
          checkpointPositions
        );
      }
    }

    // Collect all car positions for repulsion (including human)
    const allCars = world.query("Car", "Transform");
    const carPositions: Array<{ entity: number; x: number; y: number }> = [];
    for (let i = 0; i < allCars.length; i += 1) {
      const e = allCars[i]!;
      const tr = world.getComponent(e, "Transform");
      if (tr) carPositions.push({ entity: e, x: tr.x, y: tr.y });
    }

    const len = aiCars.length;
    for (let i = 0; i < len; i += 1) {
      const entity = aiCars[i]!;
      if (world.hasComponent(entity, "LocalPlayer")) continue;

      const personality =
        world.getComponent(entity, "AIPersonality") ?? DEFAULT_PERSONALITY;

      // Finished AI: zero throttle, skip navigation
      const lap = world.getComponent(entity, "Lap");
      const totalLaps =
        (world.getResource<{ TOTAL_LAPS?: number }>("GameConfig") as { TOTAL_LAPS?: number } | undefined)
          ?.TOTAL_LAPS ?? 3;
      if (lap && lap.currentLap > totalLaps) {
        const vehicle = world.getMutableComponent(entity, "VehicleSteering");
        if (vehicle) {
          vehicle.throttle = 0;
          vehicle.steering = 0;
        }
        continue;
      }

      const steerCtx = resolveVehicleWaypointSteering(
        world,
        entity,
        personality.minPositiveThrottle
      );
      if (!steerCtx) continue;

      const { waypointsComp, vehicle, transform, steerRes } = steerCtx;

      // --- Lane offset: displace target perpendicular to segment ---
      let targetX = 0;
      let targetY = 0;
      const wpIdx = waypointsComp.currentWaypointIndex;
      const waypoints = waypointsComp.waypoints;
      if (waypoints.length > 0) {
        const target = waypoints[wpIdx] ?? waypoints[0]!;
        targetX = target.x;
        targetY = target.y;

        // Direction of the current segment (prev -> current target)
        const prevIdx =
          wpIdx > 0
            ? wpIdx - 1
            : waypointsComp.loop !== false
              ? waypoints.length - 1
              : wpIdx;
        const prev = waypoints[prevIdx] ?? target;
        const segDx = target.x - prev.x;
        const segDy = target.y - prev.y;
        const perp = perpendicular(segDx, segDy);
        const offset = personality.laneOffset;
        targetX += perp.x * offset;
        targetY += perp.y * offset;
      }

      // --- Inter-car repulsion ---
      let repulseX = 0;
      let repulseY = 0;
      for (let j = 0; j < carPositions.length; j += 1) {
        const other = carPositions[j]!;
        if (other.entity === entity) continue;
        const dx = transform.x - other.x;
        const dy = transform.y - other.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1e-4) {
          // Deterministic tie-break: push along entity-id axis
          const sign = entity > other.entity ? 1 : -1;
          repulseX += sign * REPULSION_STRENGTH;
          continue;
        }
        if (dist < REPULSION_RADIUS) {
          const force = ((REPULSION_RADIUS - dist) / REPULSION_RADIUS) * REPULSION_STRENGTH;
          repulseX += (dx / dist) * force;
          repulseY += (dy / dist) * force;
        }
      }
      targetX += repulseX;
      targetY += repulseY;

      // Recompute steering toward the adjusted target
      const dx = targetX - transform.x;
      const dy = targetY - transform.y;
      const desiredAngle = Math.atan2(dy, dx);
      const diffAngle = normalizeAngle(desiredAngle - (transform.rotation ?? 0));

      // Aggression scales the steering gain
      const steerGain = 1.2 + personality.aggression * 1.2;
      let steering = Math.max(-1, Math.min(1, diffAngle * steerGain));

      // Deterministic noise
      const noise = deterministicNoise(world, entity, personality.noiseAmplitude);
      // Scale noise lightly by dt so high framerate doesn't amplify it
      steering = Math.max(-1, Math.min(1, steering + noise * Math.min(1, deltaTime * 60)));

      const alignment = Math.cos(diffAngle);
      let throttle =
        alignment > 0
          ? Math.max(personality.minPositiveThrottle, alignment)
          : -0.2;

      // --- Rubber-banding via RaceProgress ---
      if (humanTransform && totalCheckpoints > 0 && lap) {
        const aiProgress = computeRaceProgress(
          lap,
          totalCheckpoints,
          transform,
          checkpointPositions
        );
        const progressDelta = humanProgress - aiProgress; // positive => AI behind
        const euclideanDist = Math.hypot(
          humanTransform.x - transform.x,
          humanTransform.y - transform.y
        );

        // Skip micro-adjustments when cars are almost overlapping
        if (euclideanDist > EUCLIDEAN_NEAR_SKIP) {
          if (progressDelta > personality.boostDistance && throttle > 0) {
            // Behind: boost only when already accelerating forward
            throttle = Math.min(1, throttle * personality.boostMultiplier);
          } else if (progressDelta < -personality.nerfDistance) {
            // Ahead: nerf
            throttle *= personality.nerfMultiplier;
          }
        }
      }

      // Single final write — applyWaypointSteering also advances waypoint index
      // when the original (un-offset) target was reached.
      applyWaypointSteering(world, entity, waypointsComp, vehicle, {
        ...steerRes,
        steering,
        throttle
      });
      // Explicit final assignment to guarantee no double-write surprises
      vehicle.steering = steering;
      vehicle.throttle = throttle;
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
