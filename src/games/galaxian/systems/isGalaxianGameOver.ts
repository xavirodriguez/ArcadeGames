import { World } from "@tiny-aster/core";
import { GalaxianComponentRegistry } from "../types/GalaxianTypes";

export function isGalaxianGameOver(world: World<GalaxianComponentRegistry>): boolean {
  const stateEntity = world.query("GameState")[0];
  return stateEntity !== undefined
    && world.getComponent(stateEntity, "GameState")?.isGameOver === true;
}
