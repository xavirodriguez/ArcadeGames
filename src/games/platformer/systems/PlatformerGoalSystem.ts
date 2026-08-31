import { System, World, CoreComponentRegistry, Component } from "@tiny-aster/core";

export interface LevelGoalComponent extends Component {
  type: "LevelGoal";
  reached: boolean;
}

export class PlatformerGoalSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const players = world.query("PlatformerInput", "Transform");
    const goals = world.query("LevelGoal", "Transform");

    if (players.length === 0 || goals.length === 0) return;

    for (let p = 0; p < players.length; p++) {
      const pTrans = world.getComponent(players[p], "Transform")!;

      for (let g = 0; g < goals.length; g++) {
        const goalEntity = goals[g];
        const goal = world.getComponent(goalEntity, "LevelGoal");
        const gTrans = world.getComponent(goalEntity, "Transform")!;

        const levelGoal = goal as LevelGoalComponent;
        if (levelGoal && !levelGoal.reached) {
          const dx = Math.abs(pTrans.x - gTrans.x);
          const dy = Math.abs(pTrans.y - gTrans.y);

          if (dx < 25 && dy < 35) {
            world.mutateComponent(goalEntity, "LevelGoal", (goalComp) => {
              (goalComp as LevelGoalComponent).reached = true;
            });

            const eventBus = world.getEventBus();
            if (eventBus) {
              eventBus.emit("level:completed", { level: 1, goalEntity });
            }
          }
        }
      }
    }
  }
}
