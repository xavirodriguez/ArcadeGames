import { System, World } from "@tiny-aster/core";
import { NebulaDashComponentRegistry, NebulaDashEventRegistry } from "../types/NebulaDashRegistry";
import { NebulaDashConfig } from "../config/NebulaDashConfigSchema";

export class ClimberInputSystem extends System<NebulaDashComponentRegistry, NebulaDashEventRegistry> {
  private wasJumpPressed = false;

  public override update(world: World<NebulaDashComponentRegistry, NebulaDashEventRegistry>, dt: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<NebulaDashConfig>("GameConfig");
    const gravity = config?.GRAVITY ?? 980;
    const defaultJumpImpulse = config?.JUMP_IMPULSE ?? -420;
    const defaultLateralSpeed = config?.LATERAL_SPEED ?? 320;

    const entities = world.query("Climber", "Transform", "Velocity", "Input");

    for (const entity of entities) {
      const climber = world.getComponent(entity, "Climber")!;
      const input = world.getComponent(entity, "Input")!;

      const lateralSpeed = climber.lateralSpeed || defaultLateralSpeed;
      const jumpImpulse = climber.jumpImpulse || defaultJumpImpulse;

      let targetVx = 0;
      if (input.moveLeft && !input.moveRight) {
        targetVx = -lateralSpeed;
      } else if (input.moveRight && !input.moveLeft) {
        targetVx = lateralSpeed;
      }

      const isJumpJustPressed = input.jump && !this.wasJumpPressed;

      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = targetVx;
        v.vy += gravity * dt;

        if (isJumpJustPressed) {
          v.vy = jumpImpulse;
        }

        if (climber.maxAscentSpeed && v.vy < -climber.maxAscentSpeed) {
          v.vy = -climber.maxAscentSpeed;
        }
      });

      this.wasJumpPressed = input.jump;
    }
  }
}
