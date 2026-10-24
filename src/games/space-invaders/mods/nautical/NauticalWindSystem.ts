import { System, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../../types/SpaceInvadersTypes";
import {
  NAUTICAL_WIND_RESOURCE,
  NauticalWindState,
  createDefaultWindState,
} from "./NauticalThemeShared";

export {
  NAUTICAL_WIND_RESOURCE,
  type NauticalWindState,
  createDefaultWindState,
  isNauticalChartTheme,
} from "./NauticalThemeShared";

const FORCE_TABLE = [0, 1, 2, 3];
/** Lateral px/s² scaled by force — readable without being unfair. */
const LATERAL_ACCEL_PER_FORCE = 48;

export function ensureNauticalWind(
  world: World<SpaceInvadersComponentRegistry>
): NauticalWindState {
  let wind = world.getResource<NauticalWindState>(NAUTICAL_WIND_RESOURCE);
  if (!wind) {
    wind = createDefaultWindState();
    world.setResource(NAUTICAL_WIND_RESOURCE, wind);
  }
  return wind;
}

/**
 * Applies horizontal acceleration to bullet velocities when registered by NauticalMod.
 */
export class NauticalWindSystem extends System<SpaceInvadersComponentRegistry> {
  public update(
    world: World<SpaceInvadersComponentRegistry>,
    deltaTime: number
  ): void {
    const wind = ensureNauticalWind(world);

    wind.changeRemaining -= deltaTime;
    if (wind.changeRemaining <= 0) {
      wind.force = FORCE_TABLE[Math.floor(Math.random() * FORCE_TABLE.length)];
      wind.sign = Math.random() < 0.5 ? -1 : 1;
      wind.changeRemaining = 5 + Math.random() * 4;
      wind.visualIntensity = wind.force === 0 ? 0.08 : 0.15 + wind.force * 0.12;
    }

    if (wind.force === 0) return;

    const ax = wind.sign * wind.force * LATERAL_ACCEL_PER_FORCE * deltaTime;

    const bullets = [
      ...world.query("PlayerBullet"),
      ...world.query("EnemyBullet"),
    ];
    for (const entity of bullets) {
      const vel = world.getComponent(entity, "Velocity");
      if (!vel) continue;
      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = (v.vx || 0) + ax;
      });
    }
  }
}
