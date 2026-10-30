import { System, SystemConfig, SystemPhase } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { stepSpriteAnimator } from "../assets/SpriteAnimator";
import { SpriteSheetDefinition } from "../assets/SpriteSheetDefinition";

/**
 * Lookup function to resolve a SpriteSheetDefinition by sheetId.
 *
 * @public
 */
export type SpriteSheetLookup = (sheetId: string) => SpriteSheetDefinition | undefined;

/**
 * System that advances frame progression and timing for all entities with a `SpriteAnimator` component.
 *
 * @remarks
 * Uses canonical, seconds-based delta time and pure step math from `stepSpriteAnimator`.
 * Works with a provided lookup function or resolves definitions from the World resource `"SpriteRegistry"` or `"SpriteSheetLookup"`.
 *
 * @public
 */
export class SpriteAnimatorSystem extends System<CoreComponentRegistry> {
  private readonly customLookup?: SpriteSheetLookup;

  public constructor(sheetLookup?: SpriteSheetLookup) {
    super();
    this.customLookup = sheetLookup;
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;

    const lookup: SpriteSheetLookup | undefined =
      this.customLookup ??
      world.getResource<SpriteSheetLookup>("SpriteSheetLookup") ??
      ((sheetId: string) => {
        const registry = world.getResource<{ get: (id: string) => SpriteSheetDefinition | undefined }>("SpriteRegistry");
        return registry?.get(sheetId);
      });

    if (!lookup) return;

    const entities = world.query("SpriteAnimator");
    for (const entity of entities) {
      let completed = false;
      let sheetId = "";
      let animation = "";

      world.mutateComponent(entity, "SpriteAnimator", (animator) => {
        completed = stepSpriteAnimator(animator, deltaTime, lookup);
        sheetId = animator.sheetId;
        animation = animator.currentAnim;
      });

      if (completed) {
        const bus = world.getResource<{ emit: (event: string, payload: unknown) => void }>("EventBus");
        if (bus && typeof bus.emit === "function") {
          bus.emit("animation:completed", {
            entity,
            sheetId,
            animation
          });
        }
      }
    }
  }
}

/**
 * Standard configuration for SpriteAnimatorSystem.
 * Runs in the Presentation phase after state-selection and physics, before frame sync / render.
 *
 * @public
 */
export const DEFAULT_SPRITE_ANIMATOR_SYSTEM_CONFIG: SystemConfig = {
  phase: SystemPhase.Presentation,
  priority: 42
};
