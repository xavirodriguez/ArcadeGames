import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";

export class CentipedeInputSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(_world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, _dt: number): void {
    // Polled directly in systems
  }
}
