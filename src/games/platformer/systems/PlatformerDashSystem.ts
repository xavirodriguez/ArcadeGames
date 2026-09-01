import { System, World, CoreComponentRegistry, Component } from "@tiny-aster/core";

export interface DashUnlockedComponent extends Component {
  type: "DashUnlocked";
  unlocked: boolean;
  dashSpeed: number;
  cooldown: number;
  cooldownMax: number;
  dashTimeRemaining: number;
}

export class PlatformerDashSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const players = world.query("PlatformerInput", "DashUnlocked", "Velocity", "Transform");
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const dash = world.getMutableComponent(player, "DashUnlocked" as any) as DashUnlockedComponent | undefined;
      const input = world.getComponent(player, "PlatformerInput") as any;
      const vel = world.getMutableComponent(player, "Velocity");
      const trans = world.getComponent(player, "Transform");

      if (!dash || !input || !vel || !trans) continue;

      if (dash.cooldown > 0) {
        dash.cooldown -= deltaTime;
        if (dash.cooldown < 0) dash.cooldown = 0;
      }

      if (dash.dashTimeRemaining > 0) {
        dash.dashTimeRemaining -= deltaTime;
        if (dash.dashTimeRemaining <= 0) {
          dash.dashTimeRemaining = 0;
        } else {
          // Maintain horizontal dash velocity
          const dir = input.moveDir !== 0 ? Math.sign(input.moveDir) : (trans.scaleX >= 0 ? 1 : -1);
          vel.vx = dir * dash.dashSpeed;
          vel.vy = 0;
        }
      }

      if (input.dash && dash.cooldown <= 0 && dash.dashTimeRemaining <= 0) {
        dash.cooldown = dash.cooldownMax;
        dash.dashTimeRemaining = 0.15;
        const dir = input.moveDir !== 0 ? Math.sign(input.moveDir) : (trans.scaleX >= 0 ? 1 : -1);
        vel.vx = dir * dash.dashSpeed;
        vel.vy = 0;

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("PlaySFX", { name: "jump" });
        }
      }
    }
  }
}
