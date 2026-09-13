import { System, World, ShapeType, BoxShape } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry, PipeComponent } from "../types/FlappyBirdTypes";
import { calculateFlappyPipeGeometry } from "../../shared/rendering/geometry";

export class FlappyBirdPipeMovementSystem extends System<FlappyBirdComponentRegistry> {
  public update(world: World<FlappyBirdComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<{ SCREEN_HEIGHT: number }>("GameConfig") || { SCREEN_HEIGHT: 600 };
    const screenHeight = config.SCREEN_HEIGHT;
    const pipes = world.query("Pipe", "Transform", "Collider");

    pipes.forEach((entity) => {
      const pipe = world.getComponent(entity, "Pipe");
      if (!pipe || !pipe.movementType || pipe.movementType === "static") return;

      if (pipe.movementType === "oscillating" && pipe.baseGapY !== undefined) {
        const speed = pipe.oscillationSpeed ?? 2.0;
        const phase = pipe.oscillationPhase ?? 0;
        const amplitude = pipe.oscillationAmplitude ?? 35;
        const sinValue = Math.sin(world.tick * (1 / 60) * speed + phase);
        const newGapY = pipe.baseGapY + sinValue * amplitude;

        world.mutateComponent(entity, "Pipe", (p) => {
          p.gapY = newGapY;
        });

        const pos = world.getComponent(entity, "Transform");
        if (pos) {
          const { isTopPipe, pipeY, pipeHeight } = calculateFlappyPipeGeometry(
            pos.y,
            newGapY,
            pipe.gapSize,
            screenHeight
          );

          world.mutateComponent(entity, "Transform", (t) => {
            if (isTopPipe) {
              t.y = (newGapY - pipe.gapSize / 2) / 2;
            } else {
              const bottomY = newGapY + pipe.gapSize / 2;
              const bottomHeight = screenHeight - bottomY;
              t.y = bottomY + bottomHeight / 2;
            }
          });

          world.mutateComponent(entity, "Collider", (col) => {
            if (col.shape.type === ShapeType.Box) {
              (col.shape as BoxShape).height = pipeHeight;
            }
          });
        }
      }

      if (pipe.movementType === "laser_gate") {
        const pulseFreq = pipe.laserPulseFrequency ?? 3.0;
        const isActive = Math.sin(world.tick * (1 / 60) * pulseFreq * Math.PI * 2) > 0;
        world.mutateComponent(entity, "Pipe", (p) => {
          p.laserActive = isActive;
        });

        world.mutateComponent(entity, "Collider", (col) => {
          // Keep physical pipe collision active; laser visual gate indicator pulses.
          // Layer remains CollisionLayers.ENEMY.
        });
      }
    });
  }
}
