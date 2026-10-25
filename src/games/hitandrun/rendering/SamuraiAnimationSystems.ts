import {
  AnimationSystem,
  System,
  SystemPhase,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import {
  SAMURAI_ANIMATIONS,
  SAMURAI_ASSET_KEY,
  getSamuraiFrameRect
} from "./SamuraiVisualAssets";

const ATTACK_STATES = new Set(["Anticipation", "Windup", "Attack", "Charge"]);
const RECOVERY_STATE = "Recovery";

/** Selects animation clips from the existing Hit & Run AI/combat state. */
export class SamuraiAnimationStateSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Sprite", "Animator", "StateMachine");

    for (const entity of entities) {
      const sprite = world.getComponent(entity, "Sprite");
      if (sprite?.assetKey !== SAMURAI_ASSET_KEY && sprite?.textureId !== SAMURAI_ASSET_KEY) {
        continue;
      }

      const machine = world.getComponent(entity, "StateMachine");
      const velocity = world.getComponent(entity, "Velocity");
      const health = world.getComponent(entity, "Health");
      const animator = world.getMutableComponent(entity, "Animator");
      if (!machine || !animator) continue;

      const isDead = world.hasComponent(entity, "Dead") || (health !== undefined && health.current <= 0);
      const isHurt = world.hasComponent(entity, "HitReaction");
      const moving = Math.abs(velocity?.vx ?? 0) + Math.abs(velocity?.vy ?? 0) > 5;
      const currentClip = animator.current;
      const currentDefinition = currentClip ? animator.animations[currentClip] : undefined;
      const currentFrameIsTerminal =
        currentDefinition !== undefined &&
        animator.frame >= currentDefinition.frames.length - 1;

      let nextClip: string;
      if (isDead) {
        nextClip = "death";
      } else if (isHurt) {
        nextClip = "hurt";
      } else if (ATTACK_STATES.has(machine.currentState)) {
        nextClip = "attack";
      } else if (machine.currentState === RECOVERY_STATE && currentClip === "attack" && !currentFrameIsTerminal) {
        // Allow the eight-frame swing to finish through AI recovery.
        nextClip = "attack";
      } else {
        nextClip = moving ? "walk" : "idle";
      }

      if (nextClip !== currentClip) {
        animator.current = nextClip;
        animator.frame = 0;
        animator.elapsed = 0;
        animator.isPlaying = true;
      }
    }
  }
}

/** Copies AnimationSystem's local frame index into SpriteComponent.srcRect. */
export class SamuraiSpriteFrameSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Sprite", "Animator");

    for (const entity of entities) {
      const sprite = world.getComponent(entity, "Sprite");
      const animator = world.getComponent(entity, "Animator");
      if (!sprite || !animator) continue;
      if (sprite.assetKey !== SAMURAI_ASSET_KEY && sprite.textureId !== SAMURAI_ASSET_KEY) {
        continue;
      }

      const clip = animator.current ? animator.animations[animator.current] : undefined;
      if (!clip || clip.frames.length === 0) continue;

      const localIndex = Math.max(0, Math.min(animator.frame, clip.frames.length - 1));
      const atlasFrameIndex = clip.frames[localIndex];
      const rect = getSamuraiFrameRect(atlasFrameIndex);
      const mutableSprite = world.getMutableComponent(entity, "Sprite");
      if (!mutableSprite) continue;

      const oldRect = mutableSprite.srcRect;
      if (oldRect?.x === rect.x && oldRect.y === rect.y && oldRect.w === rect.w && oldRect.h === rect.h) {
        continue;
      }

      mutableSprite.srcRect = rect;
    }
  }
}

export function registerHitRunSamuraiAnimationSystems(
  world: World<CoreComponentRegistry>
): void {
  // AI and combat choose the clip before the frame timer advances.
  world.addSystem(new SamuraiAnimationStateSystem(), {
    phase: SystemPhase.Presentation,
    priority: 40
  });
  world.addSystem(new AnimationSystem(), {
    phase: SystemPhase.Presentation,
    priority: 41
  });
  world.addSystem(new SamuraiSpriteFrameSystem(), {
    phase: SystemPhase.Presentation,
    priority: 42
  });
}

/** Exposes the shared clip names for focused contract tests. */
export const SAMURAI_ANIMATION_NAMES = Object.keys(SAMURAI_ANIMATIONS);
