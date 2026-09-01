import { System, World, CoreComponentRegistry, Component } from "@tiny-aster/core";

export interface LevelGoalComponent extends Component {
  type: "LevelGoal";
  reached: boolean;
}

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
      if (world.hasComponent(goalEntity, "CollisionEvents" as any)) {
        const events = world.getComponent(goalEntity, "CollisionEvents" as any) as any;
        if (events.activeTriggers) {
          for (let j = 0; j < events.activeTriggers.length; j++) {
            const other = events.activeTriggers[j];
            if (singlePlayer !== null ? other === singlePlayer : players.indexOf(other) !== -1) {
              triggeredBy = other;
              break;
            }
          }
        }
        if (!triggeredBy && events.collisions) {
          for (let j = 0; j < events.collisions.length; j++) {
            const other = events.collisions[j].otherEntity;
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
          if (world.hasComponent(playerEntity, "CollisionEvents" as any)) {
            const events = world.getComponent(playerEntity, "CollisionEvents" as any) as any;
            let found = false;
            if (events.activeTriggers) {
              for (let j = 0; j < events.activeTriggers.length; j++) {
                if (events.activeTriggers[j] === goalEntity) {
                  found = true;
                  break;
                }
              }
            }
            if (!found && events.collisions) {
              for (let j = 0; j < events.collisions.length; j++) {
                if (events.collisions[j].otherEntity === goalEntity) {
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
        world.mutateComponent(goalEntity, "LevelGoal" as any, (gComp: any) => {
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
