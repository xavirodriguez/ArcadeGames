import { System, World } from "@tiny-aster/core";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type {
  OutrunComponentRegistry,
  OutrunEventRegistry,
  RoadData
} from "../types/OutrunTypes";

/**
 * Moves traffic / rival racers in race coordinates and resolves simple collisions
 * with the player. All logic stays in (z, lateralX) space.
 */
export class TrafficSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    deltaTime: number
  ): void {
    if (world.getResource("IsPaused") === true) return;

    const state = world.getSingleton("RaceState");
    if (!state || state.isGameOver) return;

    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
    const roadData = world.getResource<RoadData>("RoadData");
    if (!roadData) return;

    const trackLength = roadData.trackLength;
    if (trackLength <= 0) return;

    const racers = world.query("Racer");
    const playerZ = state.playerZ;
    const playerX = state.playerX;

    const collisionZ = config.segmentLength * 0.6;
    const collisionX = config.laneWidth * 1.2;

    let carsAhead = 0;

    for (let i = 0; i < racers.length; i++) {
      const entity = racers[i];
      const racer = world.getComponent(entity, "Racer");
      if (!racer || !racer.active) continue;

      let nextZ = racer.z + racer.speed * deltaTime;
      while (nextZ - playerZ > trackLength * 0.5) nextZ -= trackLength;
      while (playerZ - nextZ > trackLength * 0.5) nextZ += trackLength;

      world.mutateComponent(entity, "Racer", (r) => {
        r.z = nextZ;
      });

      let dz = nextZ - playerZ;
      if (dz > trackLength / 2) dz -= trackLength;
      if (dz < -trackLength / 2) dz += trackLength;

      const dx = Math.abs(racer.lateralX - playerX);

      if (Math.abs(dz) < collisionZ && dx < collisionX) {
        world.getEventBus().emit("outrun:collision", { entity, other: entity });
        world.mutateSingleton("RaceState", (s) => {
          s.speed = Math.min(s.speed, racer.speed * 0.7);
          if (s.playerX < racer.lateralX) {
            s.playerX -= 0.15;
          } else {
            s.playerX += 0.15;
          }
          s.playerX = Math.max(-2, Math.min(2, s.playerX));
        });
      }

      if (dz > 0 && Math.abs(dz) < trackLength * 0.4) {
        carsAhead++;
      }
    }

    world.mutateSingleton("RaceState", (s) => {
      s.position = carsAhead + 1;
    });
  }
}
