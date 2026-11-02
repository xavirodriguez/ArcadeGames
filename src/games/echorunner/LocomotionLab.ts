import { EchoRunnerGame } from "./EchoRunnerGame";
import locomotionLabLevelData from "./levels/locomotion-lab.json";

/**
 * Creates the integrated locomotion test course using Echo Runner's production
 * controller, material contacts, slope solver and moving-platform schedule.
 *
 * This factory is intentionally not added to the campaign registry; it is a
 * development harness that can be launched by a local game/debug entry point.
 */
export function createLocomotionLab(seed = 41873): EchoRunnerGame {
  return new EchoRunnerGame({
    seed,
    levelData: locomotionLabLevelData
  });
}
