import type { GalaxianConfig } from "../types/GalaxianConfigSchema";
import type { GalaxianInputState } from "../types/GalaxianTypes";

export type GalaxianControlAction = "moveLeft" | "moveRight" | "shoot";
export type GalaxianControlInput = Partial<Pick<GalaxianInputState, GalaxianControlAction>>;

export function resolveGalaxianKeyActions(
  keyCode: string,
  keys: GalaxianConfig["KEYS"]
): GalaxianControlAction[] {
  const actions: GalaxianControlAction[] = [];

  if (keyCode === keys.LEFT) actions.push("moveLeft");
  if (keyCode === keys.RIGHT) actions.push("moveRight");
  if (keyCode === keys.SHOOT) actions.push("shoot");

  return actions;
}
