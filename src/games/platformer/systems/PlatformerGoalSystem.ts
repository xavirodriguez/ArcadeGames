import { System, World, CoreComponentRegistry, LevelGoalComponent } from "@tiny-aster/core";

export type { LevelGoalComponent };

export class PlatformerGoalSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const goals = world.query("LevelGoal");
    const players = world.query("PlatformerInput");

    if (goals.length === 0 || players.length === 0) return;

    const singlePlayer = players.length === 1 ? players[0] : null;

    for (let g = 0; g < goals.length; g++) {
      const goalEntity = goals[g];
      const goal = world.getComponent(goalEntity, "LevelGoal") as LevelGoalComponent | undefined;
      if (!goal || goal.reached) continue;

      let triggeredBy: number | null = null;

      // 1. Check goal's CollisionEvents
      const goalEvents = world.getComponent(goalEntity, "CollisionEvents");
      if (goalEvents) {
        if (goalEvents.activeTriggers) {
          for (let j = 0; j < goalEvents.activeTriggers.length; j++) {
            const other = goalEvents.activeTriggers[j];
            if (singlePlayer !== null ? other === singlePlayer : players.indexOf(other) !== -1) {
              triggeredBy = other;
              break;
            }
          }
        }
        if (!triggeredBy && goalEvents.collisions) {
          for (let j = 0; j < goalEvents.collisions.length; j++) {
            const other = goalEvents.collisions[j].otherEntity;
            if (singlePlayer !== null ? other === singlePlayer : players.indexOf(other) !== -1) {
              triggeredBy = other;
              break;
            }
          }
        }
      }

      // 2. Check players' CollisionEvents
      if (!triggeredBy) {
        for (let p = 0; p < players.length; p++) {
          const playerEntity = players[p];
          const playerEvents = world.getComponent(playerEntity, "CollisionEvents");
          if (playerEvents) {
            let found = false;
            if (playerEvents.activeTriggers) {
              for (let j = 0; j < playerEvents.activeTriggers.length; j++) {
                if (playerEvents.activeTriggers[j] === goalEntity) {
                  found = true;
                  break;
                }
              }
            }
            if (!found && playerEvents.collisions) {
              for (let j = 0; j < playerEvents.collisions.length; j++) {
                if (playerEvents.collisions[j].otherEntity === goalEntity) {
                  found = true;
                  break;
                }
              }
            }
            if (found) {
              triggeredBy = playerEntity;
              break;
            }
          }
        }
      }

      // 3. Transform distance overlap fallback
      if (!triggeredBy) {
        const gTrans = world.getComponent(goalEntity, "Transform");
        if (gTrans) {
          for (let p = 0; p < players.length; p++) {
            const pTrans = world.getComponent(players[p], "Transform");
            if (pTrans) {
              const dx = Math.abs(pTrans.x - gTrans.x);
              const dy = Math.abs(pTrans.y - gTrans.y);
              if (dx < 30 && dy < 40) {
                triggeredBy = players[p];
                break;
              }
            }
          }
        }
      }

      if (triggeredBy !== null) {
        world.mutateComponent(goalEntity, "LevelGoal", (gComp) => {
          gComp.reached = true;
        });

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("level:completed", {
            level: 1,
            goalEntity,
            playerEntity: triggeredBy
          });
        }
      }
    }
  }
}
