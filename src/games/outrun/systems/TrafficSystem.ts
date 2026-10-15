import { System, World } from "@tiny-aster/core";
import type {
  OutrunComponentRegistry,
  OutrunEventRegistry,
  RoadData
} from "../types/OutrunTypes";
import { resolveOutrunSystemContext } from "./OutrunSystemUtils";
import {
  circularDeltaZ,
  clampLateralX,
  computeTrafficSteerDelta,
  collisionSubstepsForFrame,
  type TrafficObstacle
} from "./TrafficSteering";

/**
 * Moves traffic / rival racers in race coordinates, applies lookahead steering,
 * and resolves collisions with the player (with substeps to avoid tunneling).
 * All logic stays in (z, lateralX) space.
 */
export class TrafficSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    deltaTime: number
  ): void {
    const ctx = resolveOutrunSystemContext(world);
    if (!ctx) return;
    const { state, config } = ctx;
    const roadData = world.getResource<RoadData>("RoadData");
    if (!roadData) return;

    const trackLength = roadData.trackLength;
    if (trackLength <= 0) return;

    const racers = world.query("Racer");
    const playerZ = state.playerZ;
    const playerX = state.playerX;
    const playerSpeed = state.speed;

    const collisionZ = config.segmentLength * 0.6;
    const collisionX = config.laneWidth * 1.2;

    const lookaheadSegments = config.trafficLookaheadSegments ?? 20;
    const lookaheadDist = lookaheadSegments * config.segmentLength;
    const avoidRadius = config.trafficAvoidRadius ?? 0.35;
    const steerSpeed = config.trafficSteerSpeed ?? 1.5;
    // Adaptive substeps: Session 4 fixed default was enough at 60fps but not at
    // engine maxDelta (0.25s) where d_frame = maxSpeed*0.25 can exceed collisionZ.
    const minSub = config.trafficCollisionSubsteps ?? 4;
    const maxSub = config.trafficCollisionSubstepsMax ?? 32;
    const substeps = collisionSubstepsForFrame(
      config.maxSpeed,
      deltaTime,
      collisionZ,
      minSub,
      maxSub
    );

    const activeEntities: number[] = [];
    const snapZ: number[] = [];
    const snapX: number[] = [];
    const snapSpeed: number[] = [];

    for (let i = 0; i < racers.length; i++) {
      const entity = racers[i];
      const racer = world.getComponent(entity, "Racer");
      if (!racer || !racer.active) continue;
      activeEntities.push(entity);
      snapZ.push(racer.z);
      snapX.push(racer.lateralX);
      snapSpeed.push(racer.speed);
    }

    const n = activeEntities.length;
    let carsAhead = 0;

    const playerObstacle: TrafficObstacle = {
      z: playerZ,
      lateralX: playerX,
      speed: playerSpeed
    };

    for (let i = 0; i < n; i++) {
      const entity = activeEntities[i];
      let z = snapZ[i];
      let lateralX = snapX[i];
      const speed = snapSpeed[i];

      const obstacles: TrafficObstacle[] = [playerObstacle];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        obstacles.push({
          z: snapZ[j],
          lateralX: snapX[j],
          speed: snapSpeed[j]
        });
      }

      const steerDx = computeTrafficSteerDelta(
        z,
        lateralX,
        speed,
        obstacles,
        trackLength,
        lookaheadDist,
        avoidRadius,
        steerSpeed,
        deltaTime
      );
      lateralX = clampLateralX(lateralX + steerDx);

      const subDt = deltaTime / substeps;
      let collided = false;

      for (let s = 0; s < substeps; s++) {
        z = z + speed * subDt;

        while (z - playerZ > trackLength * 0.5) z -= trackLength;
        while (playerZ - z > trackLength * 0.5) z += trackLength;

        const dz = circularDeltaZ(playerZ, z, trackLength);
        const dx = Math.abs(lateralX - playerX);

        if (!collided && Math.abs(dz) < collisionZ && dx < collisionX) {
          collided = true;
          world.getEventBus().emit("outrun:collision", { entity, other: entity });
          world.mutateSingleton("RaceState", (st) => {
            st.speed = Math.min(st.speed, speed * 0.7);
            if (st.playerX < lateralX) {
              st.playerX -= 0.15;
            } else {
              st.playerX += 0.15;
            }
            st.playerX = clampLateralX(st.playerX);
          });
        }
      }

      world.mutateComponent(entity, "Racer", (r) => {
        r.z = z;
        r.lateralX = lateralX;
      });

      const dzFinal = circularDeltaZ(playerZ, z, trackLength);
      if (dzFinal > 0 && Math.abs(dzFinal) < trackLength * 0.4) {
        carsAhead++;
      }
    }

    world.mutateSingleton("RaceState", (s) => {
      s.position = carsAhead + 1;
    });
  }
}
