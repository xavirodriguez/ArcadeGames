import { EntityBuilder, ShapeType, CircleShape, BoxShape, Theme, resolveThemeColor, World, BlueprintRegistry, spawnBlueprintEntity, createVehicleSteering, createVehicleWaypoint } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry, RacingBlueprintMap } from "./types/RacingRegistry";
import type { RacingConfig } from "./types/RacingConfigSchema";
import type { TrackSpec } from "./types/TrackSpecSchema";

const PLAYER_LAYER = 1;
const TRACK_LAYER = 2;

export function registerRacingBlueprints(
  world: World<RacingComponentRegistry, RacingEventRegistry>,
  registry?: BlueprintRegistry<RacingComponentRegistry, RacingEventRegistry>
): void {
  const targetRegistry = registry ?? world.getResource<BlueprintRegistry<RacingComponentRegistry, RacingEventRegistry>>("BlueprintRegistry");
  if (!targetRegistry) {
    throw new Error("[Racing] BlueprintRegistry resource is not set on world and no registry was provided.");
  }
  targetRegistry.register("car", {
    spawn: (w: World<RacingComponentRegistry, RacingEventRegistry>, entity: number, args: { x: number; y: number; rotation?: number; isAI?: boolean; color?: string }) => {
      const config = w.getResource<RacingConfig>("GameConfig");
      const theme = w.getResource<Theme>("Theme");
      const isAI = args.isAI === true;
      const defaultColor = isAI ? "#f43f5e" : (resolveThemeColor(w, "car", "player") ?? theme?.colorMap.car ?? "#00e5ff");
      const color = args.color ?? defaultColor;

      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y, rotation: args.rotation ?? 0, dirty: true })
        .withVelocity()
        .withRender({ shape: "racing_car", size: config?.CAR_RADIUS ?? 16, color, order: 10 })
        .withCollider({ shape: { type: ShapeType.Circle, radius: config?.CAR_RADIUS ?? 16 } as CircleShape, layer: PLAYER_LAYER, mask: TRACK_LAYER })
        .withCollisionEvents();

      w.addComponent(entity, { type: "Car", acceleration: config?.CAR_ACCELERATION ?? 360, maxSpeed: config?.CAR_MAX_SPEED ?? 420, grip: config?.CAR_GRIP ?? 9, drift: config?.CAR_DRIFT ?? 0.45, turnRate: config?.CAR_TURN_RATE ?? 3.4, boostMultiplier: config?.CAR_BOOST_MULTIPLIER ?? 1.35, boostRemaining: 0 });
      w.addComponent(entity, { type: "Lap", currentLap: 1, lastCheckpoint: -1, lapStartedAt: 0, lastLapTime: 0, bestLapTime: null });

      if (isAI) {
        const trackSpec = w.getResource<TrackSpec>("ActiveTrackSpec");
        const waypoints = trackSpec?.waypoints ?? [{ x: args.x, y: args.y }];
        w.addComponent(
          entity,
          createVehicleSteering({
            acceleration: config?.CAR_ACCELERATION ?? 360,
            maxSpeed: config?.CAR_MAX_SPEED ?? 420,
            steeringRate: config?.CAR_TURN_RATE ?? 3.4,
            traction: config?.CAR_GRIP ?? 9,
            driftFactor: config?.CAR_DRIFT ?? 0.45
          })
        );
        w.addComponent(entity, createVehicleWaypoint(waypoints, 60, true));
      } else {
        w.addComponent(entity, { type: "LocalPlayer" });
        w.addComponent(entity, { type: "Input", actions: {}, axes: { moveX: 0, moveY: 0 } });
      }
    }
  });

  targetRegistry.register("wall", {
    spawn: (w: World<RacingComponentRegistry, RacingEventRegistry>, entity: number, args: { x: number; y: number; width: number; height: number }) => {
      const color = resolveThemeColor(w, "track-wall", "accent") ?? "#ff2a6d";
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y, dirty: true })
        .withRender({ shape: "track_wall", size: 1, color, order: 4 })
        .withCollider({ shape: { type: ShapeType.Box, width: args.width, height: args.height } as BoxShape, layer: TRACK_LAYER, mask: PLAYER_LAYER })
        .withCollisionEvents();
      w.addComponent(entity, { type: "RacingWall", width: args.width, height: args.height });
      w.addComponent(entity, { type: "Track", role: "wall", friction: 0 });
    }
  });

  targetRegistry.register("checkpoint", {
    spawn: (w: World<RacingComponentRegistry, RacingEventRegistry>, entity: number, args: { index: number; x: number; y: number; width?: number; height?: number; isFinish?: boolean }) => {
      const config = w.getResource<RacingConfig>("GameConfig");
      const width = args.width ?? config?.CHECKPOINT_WIDTH ?? 170;
      const height = args.height ?? config?.CHECKPOINT_HEIGHT ?? 90;
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y, dirty: true })
        .withRender({ shape: "checkpoint", size: 1, color: "#ffffff", order: 3, opacity: 0.2 })
        .withCollider({ shape: { type: ShapeType.Box, width, height } as BoxShape, layer: TRACK_LAYER, mask: PLAYER_LAYER, isTrigger: true })
        .withCollisionEvents();
      w.addComponent(entity, { type: "Checkpoint", index: args.index, width, height, isFinish: args.isFinish ?? args.index === 0 });
      w.addComponent(entity, { type: "Track", role: args.isFinish ? "start" : "surface", friction: 0 });
    }
  });

  targetRegistry.register("state", {
    spawn: (w: World<RacingComponentRegistry, RacingEventRegistry>, entity: number) => {
      const config = w.getResource<RacingConfig>("GameConfig");
      w.addComponent(entity, { type: "RacingState", phase: "countdown", countdownRemaining: config?.COUNTDOWN_SECONDS ?? 3, currentLap: 1, totalLaps: config?.TOTAL_LAPS ?? 3, lastLapTime: 0, bestLapTime: null, raceTime: 0, isGameOver: false, position: 1 });
    }
  });

  targetRegistry.register("track_zone", {
    spawn: (w: World<RacingComponentRegistry, RacingEventRegistry>, entity: number, args: { x: number; y: number; width?: number; height?: number; surface?: string }) => {
      const color = args.surface === "deadly_edge" ? "rgba(239, 68, 68, 0.35)" : "rgba(59, 130, 246, 0.35)";
      const size = args.width ? args.width / 2 : 70;
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y, dirty: true })
        .withRender({ shape: "track_zone", size, color, order: 1 });
    }
  });

  targetRegistry.register("track_obstacle", {
    spawn: (w: World<RacingComponentRegistry, RacingEventRegistry>, entity: number, args: { x: number; y: number; radius?: number; kind?: string }) => {
      const radius = args.radius ?? 30;
      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y: args.y, dirty: true })
        .withRender({ shape: "track_obstacle", size: radius, color: "#f59e0b", order: 5 })
        .withCollider({ shape: { type: ShapeType.Circle, radius } as CircleShape, layer: TRACK_LAYER, mask: PLAYER_LAYER })
        .withCollisionEvents();
      w.addComponent(entity, { type: "Track", role: "wall", friction: 0 });
    }
  });
}

export function spawnBlueprint<K extends keyof RacingBlueprintMap>(
  world: World<RacingComponentRegistry, RacingEventRegistry>,
  name: K,
  args: Parameters<RacingBlueprintMap[K]["spawn"]>[2]
): number {
  return spawnBlueprintEntity(world as unknown as World, String(name), args as never);
}
