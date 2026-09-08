import { World, EntityBuilder, ShapeType, CircleShape, BoxShape, HealthComponent, BoundaryComponent, BlueprintDefinition } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { FroggerComponentRegistry } from "./types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "./types/FroggerConfigSchema";

export interface FroggerBlueprintMap extends Record<string, BlueprintDefinition<FroggerComponentRegistry, any, any>> {
  frogger: BlueprintDefinition<FroggerComponentRegistry, any, { gridX: number; gridY: number }>;
  vehicle: BlueprintDefinition<FroggerComponentRegistry, any, { row: number; x: number; speed: number; direction: number; vehicleType: "car" | "truck" }>;
  log: BlueprintDefinition<FroggerComponentRegistry, any, { row: number; x: number; speed: number; direction: number; length: number; logType: "log" | "turtle" }>;
  lily_pad: BlueprintDefinition<FroggerComponentRegistry, any, { padIndex: number; x: number }>;
  state: BlueprintDefinition<FroggerComponentRegistry, any, {}>;
}

export function registerFroggerBlueprints(world: World<FroggerComponentRegistry>, blueprints: any) {
  blueprints.register("frogger", {
    spawn: (w: World<FroggerComponentRegistry>, entity: number, args: { gridX: number; gridY: number }) => {
      const config = w.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
      const x = args.gridX * config.GRID_SIZE + config.GRID_SIZE / 2;
      const y = args.gridY * config.GRID_SIZE + config.GRID_SIZE / 2;

      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x, y })
        .withVelocity({ vx: 0, vy: 0 })
        .withRender({ shape: "frogger", size: config.GRID_SIZE - 8, color: "#39FF14", order: 10 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: (config.GRID_SIZE - 12) / 2 } as CircleShape,
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.ENEMY,
        })
        .withCollisionEvents();

      w.addComponent(entity, {
        type: "Frogger",
        gridX: args.gridX,
        gridY: args.gridY,
        isRiding: false,
        isAlive: true,
        cooldownRemaining: 0,
        furthestY: args.gridY,
      });

      w.addComponent(entity, {
        type: "FroggerInput",
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: false,
      });

      w.addComponent(entity, {
        type: "Health",
        current: 1,
        max: 1,
        invulnerableRemaining: 0,
      } as HealthComponent);
    },
  });

  blueprints.register("vehicle", {
    spawn: (w: World<FroggerComponentRegistry>, entity: number, args: { row: number; x: number; speed: number; direction: number; vehicleType: "car" | "truck" }) => {
      const config = w.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
      const y = args.row * config.GRID_SIZE + config.GRID_SIZE / 2;
      const width = args.vehicleType === "truck" ? config.GRID_SIZE * 2 : config.GRID_SIZE * 1.2;
      const height = config.GRID_SIZE - 10;
      const vx = args.speed * args.direction;

      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y })
        .withVelocity({ vx, vy: 0 })
        .withRender({
          shape: args.vehicleType === "truck" ? "truck" : "car",
          size: width,
          color: args.vehicleType === "truck" ? "#FF2A6D" : "#00F3FF",
          order: 5,
        })
        .withCollider({
          shape: { type: ShapeType.Box, width, height } as BoxShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
        })
        .withCollisionEvents();

      w.addComponent(entity, {
        type: "Boundary",
        width: config.SCREEN_WIDTH,
        height: config.SCREEN_HEIGHT,
        minX: -width,
        maxX: config.SCREEN_WIDTH + width,
        minY: 0,
        maxY: config.SCREEN_HEIGHT,
        mode: "wrap",
      } as BoundaryComponent);

      w.addComponent(entity, {
        type: "Vehicle",
        laneY: args.row,
        speed: args.speed,
        direction: args.direction,
        vehicleType: args.vehicleType,
      });
    },
  });

  blueprints.register("log", {
    spawn: (w: World<FroggerComponentRegistry>, entity: number, args: { row: number; x: number; speed: number; direction: number; length: number; logType: "log" | "turtle" }) => {
      const config = w.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
      const y = args.row * config.GRID_SIZE + config.GRID_SIZE / 2;
      const width = config.GRID_SIZE * args.length;
      const height = config.GRID_SIZE - 10;
      const vx = args.speed * args.direction;

      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y })
        .withVelocity({ vx, vy: 0 })
        .withRender({
          shape: args.logType === "turtle" ? "turtle" : "log",
          size: width,
          color: args.logType === "turtle" ? "#00D2FF" : "#8B5A2B",
          order: 4,
        })
        .withCollider({
          shape: { type: ShapeType.Box, width, height } as BoxShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
        })
        .withCollisionEvents();

      w.addComponent(entity, {
        type: "Boundary",
        width: config.SCREEN_WIDTH,
        height: config.SCREEN_HEIGHT,
        minX: -width,
        maxX: config.SCREEN_WIDTH + width,
        minY: 0,
        maxY: config.SCREEN_HEIGHT,
        mode: "wrap",
      } as BoundaryComponent);

      w.addComponent(entity, {
        type: "Log",
        laneY: args.row,
        speed: args.speed,
        direction: args.direction,
        length: args.length,
        logType: args.logType,
      });
    },
  });

  blueprints.register("lily_pad", {
    spawn: (w: World<FroggerComponentRegistry>, entity: number, args: { padIndex: number; x: number }) => {
      const config = w.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
      const y = config.GRID_SIZE / 2; // Row 0

      EntityBuilder.fromEntity(w, entity)
        .withTransform({ x: args.x, y })
        .withRender({ shape: "lily_pad", size: config.GRID_SIZE - 4, color: "#00FF66", order: 2 })
        .withCollider({
          shape: { type: ShapeType.Box, width: config.GRID_SIZE, height: config.GRID_SIZE } as BoxShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
        });

      w.addComponent(entity, {
        type: "GoalLilyPad",
        padIndex: args.padIndex,
        occupied: false,
        x: args.x,
        y,
      });
    },
  });

  blueprints.register("state", {
    spawn: (w: World<FroggerComponentRegistry>, entity: number, _args: {}) => {
      const config = w.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
      w.addComponent(entity, {
        type: "FroggerState",
        score: 0,
        lives: config.INITIAL_LIVES,
        level: 1,
        isGameOver: false,
        isWin: false,
        occupiedLilyPads: 0,
        totalLilyPads: config.TOTAL_LILY_PADS,
      });
    },
  });
}
