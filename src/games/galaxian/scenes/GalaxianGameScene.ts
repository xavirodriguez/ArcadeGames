import { Scene, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { createGameState, createFormationController, createPlayer, spawnEnemyWave } from "../EntityFactory";

export class GalaxianGameScene extends Scene<GalaxianComponentRegistry> {
  private config: GalaxianConfig;

  constructor(config: GalaxianConfig, world?: World<GalaxianComponentRegistry>) {
    const targetWorld = world || new World<GalaxianComponentRegistry>();
    super(targetWorld);
    this.config = config;
  }

  public override onEnter(): void {
    createGameState(this.world);
    createFormationController(this.world);

    const startX = this.config.worldWidth / 2;
    const startY = this.config.worldHeight - 50;
    createPlayer(this.world, startX, startY);

    spawnEnemyWave(this.world);
  }

  public override onExit(_world: World): void {}
}
