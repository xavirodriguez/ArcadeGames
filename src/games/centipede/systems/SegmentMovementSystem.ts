import { System, World, TransformComponent } from "@tiny-aster/core";
import {
  CentipedeComponentRegistry,
  CentipedeEventRegistry,
  CentipedeSegmentComponent,
  MushroomComponent,
  GridPosComponent
} from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";
import { gridToWorldCenter } from "../utils/CentipedeHelpers";

export class SegmentMovementSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const allSegments = world.query("CentipedeSegment", "GridPos", "Transform");
    if (allSegments.length === 0) return;

    const mushroomMap = new Map<string, MushroomComponent>();
    const mushrooms = world.query("Mushroom");
    for (const mEntity of mushrooms) {
      const mushroom = world.getComponent(mEntity, "Mushroom")!;
      mushroomMap.set(`${mushroom.row}_${mushroom.col}`, mushroom);
    }

    const chainMap = new Map<string, Array<{ entity: number; seg: CentipedeSegmentComponent; pos: GridPosComponent; transform: TransformComponent }>>();
    for (const entity of allSegments) {
      const seg = world.getMutableComponent(entity, "CentipedeSegment");
      const pos = world.getMutableComponent(entity, "GridPos");
      const transform = world.getMutableComponent(entity, "Transform");

      if (!seg || !pos || !transform) continue;

      if (!chainMap.has(seg.chainId)) {
        chainMap.set(seg.chainId, []);
      }
      chainMap.get(seg.chainId)!.push({ entity, seg, pos, transform });
    }

    for (const [_chainId, chain] of chainMap) {
      chain.sort((a, b) => a.seg.segmentIndex - b.seg.segmentIndex);

      const headItem = chain[0];
      if (!headItem || !headItem.seg.isHead) continue;

      const speed = chain.length === 1 ? config.HEAD_SPEED : config.BODY_SPEED;
      const progressDelta = dt * speed;

      headItem.seg.moveProgress += progressDelta;

      if (headItem.seg.moveProgress >= 1.0) {
        headItem.seg.moveProgress -= 1.0;

        const oldRow = headItem.pos.row;
        const oldCol = headItem.pos.col;

        headItem.pos.row = headItem.seg.targetRow;
        headItem.pos.col = headItem.seg.targetCol;

        let nextRow = headItem.pos.row;
        let nextCol = headItem.pos.col + headItem.seg.dirX;

        const currentMushroom = mushroomMap.get(`${headItem.pos.row}_${headItem.pos.col}`);
        if (currentMushroom?.isPoisoned) {
          headItem.seg.isDiving = true;
        }

        if (headItem.seg.isDiving) {
          if (headItem.pos.row >= config.GRID_ROWS - config.PLAYER_ZONE_ROWS) {
            headItem.seg.isDiving = false;
          } else {
            nextRow = headItem.pos.row + 1;
            nextCol = headItem.pos.col;
          }
        }

        if (!headItem.seg.isDiving) {
          const obstacleAhead =
            nextCol < 0 ||
            nextCol >= config.GRID_COLS ||
            mushroomMap.has(`${nextRow}_${nextCol}`);

          if (obstacleAhead) {
            const mAhead = mushroomMap.get(`${nextRow}_${nextCol}`);
            if (mAhead?.isPoisoned) {
              headItem.seg.isDiving = true;
            }

            if (headItem.pos.row >= config.GRID_ROWS - 1) {
              headItem.seg.dirY = -1;
            } else if (headItem.pos.row <= 0) {
              headItem.seg.dirY = 1;
            } else if (headItem.pos.row <= config.GRID_ROWS - config.PLAYER_ZONE_ROWS && headItem.seg.dirY === -1) {
              headItem.seg.dirY = 1;
            }

            nextRow = Math.min(config.GRID_ROWS - 1, Math.max(0, headItem.pos.row + headItem.seg.dirY));
            headItem.seg.dirX = (-headItem.seg.dirX) as 1 | -1;
            nextCol = headItem.pos.col;
          }
        }

        headItem.seg.targetRow = nextRow;
        headItem.seg.targetCol = nextCol;

        let prevOldRow = oldRow;
        let prevOldCol = oldCol;

        for (let i = 1; i < chain.length; i++) {
          const bodyItem = chain[i];
          const bOldRow = bodyItem.pos.row;
          const bOldCol = bodyItem.pos.col;

          bodyItem.pos.row = bodyItem.seg.targetRow;
          bodyItem.pos.col = bodyItem.seg.targetCol;

          bodyItem.seg.targetRow = prevOldRow;
          bodyItem.seg.targetCol = prevOldCol;
          bodyItem.seg.moveProgress = headItem.seg.moveProgress;

          prevOldRow = bOldRow;
          prevOldCol = bOldCol;
        }
      } else {
        for (let i = 1; i < chain.length; i++) {
          chain[i].seg.moveProgress = headItem.seg.moveProgress;
        }
      }

      for (const item of chain) {
        const fromPos = gridToWorldCenter(config, item.pos.row, item.pos.col);
        const toPos = gridToWorldCenter(config, item.seg.targetRow, item.seg.targetCol);
        const p = Math.min(1.0, Math.max(0.0, item.seg.moveProgress));

        item.transform.x = fromPos.x + (toPos.x - fromPos.x) * p;
        item.transform.y = fromPos.y + (toPos.y - fromPos.y) * p;
        item.transform.dirty = true;
      }
    }
  }
}
