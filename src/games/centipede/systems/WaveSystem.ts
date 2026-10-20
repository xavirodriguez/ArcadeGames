import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";
import { CentipedeEntityFactory } from "../EntityFactory";
import { gridToWorldCenter } from "../utils/CentipedeHelpers";

export class WaveSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const stateEntity = world.query("CentipedeState")[0];
    const state = stateEntity !== undefined ? world.getMutableComponent(stateEntity, "CentipedeState") : undefined;
    const eventBus = world.getEventBus();
    if (!state) return;

    if (state.status === "dying") {
      state.respawnTimerMs -= dt * 1000;
      if (state.respawnTimerMs <= 0) {
        if (state.lives > 0) {
          state.status = "playing";

          const players = world.query("Shooter", "Transform", "GridPos");
          const pRow = config.GRID_ROWS - 2;
          const pCol = Math.floor(config.GRID_COLS / 2);
          const pos = gridToWorldCenter(config, pRow, pCol);

          for (const pEntity of players) {
            const transform = world.getMutableComponent(pEntity, "Transform");
            const gridPos = world.getMutableComponent(pEntity, "GridPos");
            if (transform && gridPos) {
              transform.x = pos.x;
              transform.y = pos.y;
              transform.dirty = true;
              gridPos.row = pRow;
              gridPos.col = pCol;
            }
          }

          const segments = world.query("CentipedeSegment");
          if (segments.length === 0) {
            CentipedeEntityFactory.createCentipedeChain(
              world,
              `chain_wave_${state.level}_${Date.now()}`,
              config.CENTIPEDE_INITIAL_LENGTH,
              0,
              Math.floor(config.GRID_COLS / 2),
              1
            );
          }
        } else {
          state.status = "game_over";
          eventBus?.emit("game:over", { score: state.score });
        }
      }
      return;
    }

    if (state.status === "playing") {
      const activeSegments = world.query("CentipedeSegment");
      if (activeSegments.length === 0) {
        state.level += 1;
        eventBus?.emit("wave:cleared", { level: state.level });

        const mushrooms = world.query("Mushroom");
        for (const mEntity of mushrooms) {
          const mushroom = world.getMutableComponent(mEntity, "Mushroom");
          if (mushroom) {
            if (mushroom.hp < mushroom.maxHp) {
              state.score += 5;
              mushroom.hp = mushroom.maxHp;
            }
            mushroom.isPoisoned = false;
          }
        }

        const chainLength = Math.min(12, config.CENTIPEDE_INITIAL_LENGTH);
        CentipedeEntityFactory.createCentipedeChain(
          world,
          `chain_wave_${state.level}_${Date.now()}`,
          chainLength,
          0,
          Math.floor(config.GRID_COLS / 2),
          1
        );

        const extraHeads = Math.min(6, Math.max(0, state.level - 1));
        for (let h = 0; h < extraHeads; h++) {
          const startCol = (h * 4) % config.GRID_COLS;
          CentipedeEntityFactory.createCentipedeSegment(
            world,
            `head_extra_${state.level}_${h}`,
            0,
            1,
            true,
            0,
            startCol,
            1,
            1
          );
        }
      }
    }
  }
}
