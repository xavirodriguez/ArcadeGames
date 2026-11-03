import { System, World } from "@tiny-aster/core";
import { isGalaxianGameOver } from "./isGalaxianGameOver";
import { GalaxianComponentRegistry, GalaxianInputComponent } from "../types/GalaxianTypes";

export class GalaxianInputSystem extends System<GalaxianComponentRegistry> {
  public update(world: World<GalaxianComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0 || isGalaxianGameOver(world)) return;

    const playerEntities = world.query("Player", "Input");
    for (const entity of playerEntities) {
      const input = world.getMutableComponent(entity, "Input") as GalaxianInputComponent | undefined;
      if (!input) continue;

      if (input.shootCooldownRemaining > 0) {
        input.shootCooldownRemaining = Math.max(0, input.shootCooldownRemaining - deltaTime);
      }
    }
  }
}
