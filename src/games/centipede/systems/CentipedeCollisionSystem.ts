import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";
import { CentipedeEntityFactory } from "../EntityFactory";

export class CentipedeCollisionSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, _dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const stateEntity = world.query("CentipedeState")[0];
    const state = stateEntity !== undefined ? world.getMutableComponent(stateEntity, "CentipedeState") : undefined;
    const eventBus = world.getEventBus();

    const darts = world.query("Dart", "Transform");
    const segments = world.query("CentipedeSegment", "GridPos", "Transform");
    const mushrooms = world.query("Mushroom", "GridPos", "Transform");
    const spiders = world.query("Spider", "Transform");
    const fleas = world.query("Flea", "Transform");
    const scorpions = world.query("Scorpion", "Transform");
    const players = world.query("Shooter", "Transform");

    const hitRadius = config.CELL_SIZE * 0.7;

    for (const dartEntity of darts) {
      const dTransform = world.getComponent(dartEntity, "Transform")!;
      let dartConsumed = false;

      for (const segEntity of segments) {
        const sTransform = world.getComponent(segEntity, "Transform")!;
        const dx = dTransform.x - sTransform.x;
        const dy = dTransform.y - sTransform.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= hitRadius * hitRadius) {
          dartConsumed = true;

          const seg = world.getComponent(segEntity, "CentipedeSegment")!;
          const gridPos = world.getComponent(segEntity, "GridPos")!;

          const deadRow = gridPos.row;
          const deadCol = gridPos.col;
          const chainId = seg.chainId;
          const deadIndex = seg.segmentIndex;
          const isHead = seg.isHead;

          world.commands.removeEntity(segEntity);

          CentipedeEntityFactory.createMushroom(world, deadRow, deadCol, false, config.MUSHROOM_HP);

          const deathVisualEntity = world.reserveEntityId();
          world.commands.createEntity(deathVisualEntity);
          world.commands.addComponent(deathVisualEntity, {
            type: "SegmentDeathVisual",
            timerMs: 0,
            x: sTransform.x,
            y: sTransform.y,
            row: deadRow,
            col: deadCol,
          });

          const addedScore = isHead ? 100 : 10;
          if (state) {
            state.score += addedScore;
          }

          const sameChainSegments: Array<{ entity: number; seg: CentipedeComponentRegistry["CentipedeSegment"] }> = [];
          for (const otherEntity of world.query("CentipedeSegment")) {
            if (otherEntity === segEntity) continue;
            const otherSeg = world.getMutableComponent(otherEntity, "CentipedeSegment");
            if (otherSeg && otherSeg.chainId === chainId) {
              sameChainSegments.push({ entity: otherEntity, seg: otherSeg });
            }
          }

          sameChainSegments.sort((a, b) => a.seg.segmentIndex - b.seg.segmentIndex);

          const splitFollowers = sameChainSegments.filter((item) => item.seg.segmentIndex > deadIndex);

          if (splitFollowers.length > 0) {
            const newChainId = `chain_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            for (let i = 0; i < splitFollowers.length; i++) {
              const follower = splitFollowers[i];
              follower.seg.chainId = newChainId;
              follower.seg.segmentIndex = i;
              follower.seg.totalInChain = splitFollowers.length;

              if (i === 0) {
                follower.seg.isHead = true;
                follower.seg.dirX = (-follower.seg.dirX) as 1 | -1;
                follower.seg.isDiving = false;
                const render = world.getMutableComponent(follower.entity, "Render");
                if (render) {
                  render.shape = "centipede_head";
                  render.color = "centipedeHead";
                }
              }
            }
          }

          const remainingPredecessors = sameChainSegments.filter((item) => item.seg.segmentIndex < deadIndex);
          for (const item of remainingPredecessors) {
            item.seg.totalInChain = remainingPredecessors.length;
          }

          eventBus?.emit("segment:destroyed", {
            row: deadRow,
            col: deadCol,
            chainId,
            score: addedScore,
          });

          break;
        }
      }

      if (dartConsumed) {
        world.commands.removeEntity(dartEntity);
        continue;
      }

      for (const mEntity of mushrooms) {
        const mTransform = world.getComponent(mEntity, "Transform")!;
        const dx = dTransform.x - mTransform.x;
        const dy = dTransform.y - mTransform.y;

        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          dartConsumed = true;
          const mushroom = world.getMutableComponent(mEntity, "Mushroom");
          if (mushroom) {
            mushroom.hp -= 1;

            eventBus?.emit("mushroom:hit", {
              row: mushroom.row,
              col: mushroom.col,
              remainingHp: mushroom.hp,
            });

            if (mushroom.hp <= 0) {
              world.commands.removeEntity(mEntity);
              if (state) state.score += 1;
            }
          }
          break;
        }
      }

      if (dartConsumed) {
        world.commands.removeEntity(dartEntity);
        continue;
      }

      for (const spEntity of spiders) {
        const spTransform = world.getComponent(spEntity, "Transform")!;
        const dx = dTransform.x - spTransform.x;
        const dy = dTransform.y - spTransform.y;

        if (dx * dx + dy * dy <= hitRadius * hitRadius * 1.5) {
          dartConsumed = true;
          world.commands.removeEntity(spEntity);

          let pScore = config.SPIDER_SCORE_FAR;
          if (players.length > 0) {
            const playerTransform = world.getComponent(players[0], "Transform")!;
            const pDist = Math.hypot(spTransform.x - playerTransform.x, spTransform.y - playerTransform.y);
            if (pDist < 30) pScore = config.SPIDER_SCORE_CLOSE;
            else if (pDist < 70) pScore = config.SPIDER_SCORE_MID;
          }

          if (state) state.score += pScore;
          eventBus?.emit("enemy:killed", { type: "spider", score: pScore, x: spTransform.x, y: spTransform.y });
          break;
        }
      }

      if (dartConsumed) {
        world.commands.removeEntity(dartEntity);
        continue;
      }

      for (const fEntity of fleas) {
        const fTransform = world.getComponent(fEntity, "Transform")!;
        const dx = dTransform.x - fTransform.x;
        const dy = dTransform.y - fTransform.y;

        if (dx * dx + dy * dy <= hitRadius * hitRadius * 1.2) {
          dartConsumed = true;
          const flea = world.getMutableComponent(fEntity, "Flea");
          if (flea) {
            flea.hp -= 1;

            if (flea.hp <= 0) {
              world.commands.removeEntity(fEntity);
              if (state) state.score += 200;
              eventBus?.emit("enemy:killed", { type: "flea", score: 200, x: fTransform.x, y: fTransform.y });
            }
          }
          break;
        }
      }

      if (dartConsumed) {
        world.commands.removeEntity(dartEntity);
        continue;
      }

      for (const scEntity of scorpions) {
        const scTransform = world.getComponent(scEntity, "Transform")!;
        const dx = dTransform.x - scTransform.x;
        const dy = dTransform.y - scTransform.y;

        if (dx * dx + dy * dy <= hitRadius * hitRadius * 1.5) {
          dartConsumed = true;
          world.commands.removeEntity(scEntity);
          if (state) state.score += 1000;
          eventBus?.emit("enemy:killed", { type: "scorpion", score: 1000, x: scTransform.x, y: scTransform.y });
          break;
        }
      }

      if (dartConsumed) {
        world.commands.removeEntity(dartEntity);
      }
    }

    if (players.length > 0 && state && state.status === "playing") {
      const pEntity = players[0];
      const pTransform = world.getComponent(pEntity, "Transform")!;
      let playerHit = false;

      for (const segEntity of segments) {
        const sTransform = world.getComponent(segEntity, "Transform")!;
        const dist = Math.hypot(pTransform.x - sTransform.x, pTransform.y - sTransform.y);
        if (dist < hitRadius * 1.1) {
          playerHit = true;
          break;
        }
      }

      if (!playerHit) {
        for (const spEntity of spiders) {
          const spTransform = world.getComponent(spEntity, "Transform")!;
          const dist = Math.hypot(pTransform.x - spTransform.x, pTransform.y - spTransform.y);
          if (dist < hitRadius * 1.2) {
            playerHit = true;
            break;
          }
        }
      }

      if (playerHit) {
        state.lives -= 1;
        state.status = state.lives <= 0 ? "game_over" : "dying";
        state.respawnTimerMs = 1500;
        eventBus?.emit("player:hit", {});
      }
    }
  }
}
