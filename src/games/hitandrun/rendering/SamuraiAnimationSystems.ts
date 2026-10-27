import {
  AnimationSystem,
  System,
  SystemPhase,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import {
  getCurrentFrameRect,
  playAnimation,
  SpriteRegistry,
  updateSpriteAnimator,
  type SpriteAnimatorComponent
} from "../../shared/sprites";
import { SAMURAI_ASSET_KEY } from "./SamuraiVisualAssets";
import {
  SUMI_E_PLAYER_ASSET_KEY
} from "./SumiEVisualAssets";
import type { BeltInputComponent } from "../belt/BeltMovementTypes";
import type { ComboMeleeComponent } from "../melee/ComboMeleeTypes";

const ATTACK_STATES = new Set(["Anticipation", "Windup", "Attack", "Charge"]);
const RECOVERY_STATE = "Recovery";
const SAMURAI_DEATH_ANIMATION_SECONDS = 0.85;

function isTerminalFrame(animator: SpriteAnimatorComponent): boolean {
  const clip = SpriteRegistry.get(animator.sheetId)?.animations[animator.currentAnim];
  return clip !== undefined && animator.frameIndex >= clip.frames.length - 1;
}

/** Selects animation clips from the existing Hit & Run AI/combat state. */
export class SamuraiAnimationStateSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Sprite", "SpriteAnimator", "StateMachine");

    for (const entity of entities) {
      const sprite = world.getComponent(entity, "Sprite");
      if (sprite?.assetKey !== SAMURAI_ASSET_KEY && sprite?.textureId !== SAMURAI_ASSET_KEY) {
        continue;
      }

      const machine = world.getComponent(entity, "StateMachine");
      const velocity = world.getComponent(entity, "Velocity");
      const health = world.getComponent(entity, "Health");
      const hitReaction = world.getComponent(entity, "HitReaction") as
        | { hitstunRemaining?: number }
        | undefined;
      const currentAnimator = world.getComponent(entity, "SpriteAnimator");
      if (!machine || !currentAnimator) continue;

      const isDead = world.hasComponent(entity, "Dead") || (health !== undefined && health.current <= 0);
      const isHurt = (hitReaction?.hitstunRemaining ?? 0) > 0;
      const moving = Math.abs(velocity?.vx ?? 0) + Math.abs(velocity?.vy ?? 0) > 5;
      const currentClip = currentAnimator.currentAnim;
      const currentFrameIsTerminal = isTerminalFrame(currentAnimator);

      let nextClip: string;
      if (isDead) {
        nextClip = "death";
      } else if (isHurt) {
        nextClip = "hurt";
      } else if (ATTACK_STATES.has(machine.currentState)) {
        nextClip = "attack";
      } else if (currentClip === "hurt" && !currentFrameIsTerminal) {
        // HitReaction may expire before its six-frame clip finishes.
        nextClip = "hurt";
      } else if (machine.currentState === RECOVERY_STATE && currentClip === "attack" && !currentFrameIsTerminal) {
        // Preserve the whole eight-frame swing after the AI enters recovery.
        nextClip = "attack";
      } else {
        nextClip = moving ? "walk" : "idle";
      }

      if (nextClip !== currentClip) {
        const animator = world.getMutableComponent(entity, "SpriteAnimator");
        if (!animator) continue;
        playAnimation(animator, nextClip);

        // The shared dead-cleanup system starts with a 0.35s timer. Keep the samurai
        // alive long enough for the eight death frames to be presented.
        if (nextClip === "death") {
          const deathState = world.getMutableComponent(entity, "EnemyDeathState") as
            | { timer: number; phase: string }
            | undefined;
          if (deathState) {
            deathState.timer = Math.max(deathState.timer, SAMURAI_DEATH_ANIMATION_SECONDS);
            deathState.phase = "samurai-animation";
          }
        }
      }
    }
  }
}

/** Selects idle/walk/attack/hurt/death clips for the Sumi-e player atlas. */
export class SumiEPlayerAnimationStateSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Sprite", "SpriteAnimator", "BeltInput");

    for (const entity of entities) {
      const sprite = world.getComponent(entity, "Sprite");
      if (sprite?.assetKey !== SUMI_E_PLAYER_ASSET_KEY && sprite?.textureId !== SUMI_E_PLAYER_ASSET_KEY) {
        continue;
      }

      const currentAnimator = world.getComponent(entity, "SpriteAnimator");
      if (!currentAnimator) continue;

      const health = world.getComponent(entity, "Health");
      const hitReaction = world.getComponent(entity, "HitReaction") as
        | { hitstunRemaining?: number }
        | undefined;
      const velocity = world.getComponent(entity, "Velocity");
      const input = world.getComponent(entity, "BeltInput") as BeltInputComponent | undefined;
      const combo = world.getComponent(entity, "ComboMelee") as ComboMeleeComponent | undefined;
      const isDead = world.hasComponent(entity, "Dead") || (health !== undefined && health.current <= 0);
      const isHurt = (hitReaction?.hitstunRemaining ?? 0) > 0;
      const attackActive =
        (combo !== undefined && combo.activeStep !== "idle") ||
        input?.fireHeld === true ||
        input?.firePressed === true;
      const moving =
        Math.abs(velocity?.vx ?? 0) + Math.abs(velocity?.vy ?? 0) > 5 ||
        Math.abs(input?.moveX ?? 0) + Math.abs(input?.moveY ?? 0) > 0.1;

      const currentClip = currentAnimator.currentAnim;
      const currentFrameIsTerminal = isTerminalFrame(currentAnimator);

      let nextClip: string;
      if (isDead) {
        nextClip = "death";
      } else if (isHurt) {
        nextClip = "hurt";
      } else if (attackActive) {
        nextClip = "attack";
      } else if ((currentClip === "hurt" || currentClip === "attack") && !currentFrameIsTerminal) {
        nextClip = currentClip;
      } else {
        nextClip = moving ? "walk" : "idle";
      }

      if (nextClip !== currentClip) {
        const animator = world.getMutableComponent(entity, "SpriteAnimator");
        if (animator) playAnimation(animator, nextClip);
      }
    }
  }
}

/** Advances the canonical, seconds-based animator for Hit&Run sprite entities. */
export class HitRunSpriteAnimatorPlaybackSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("SpriteAnimator");
    for (const entity of entities) {
      const animator = world.getMutableComponent(entity, "SpriteAnimator");
      if (animator) updateSpriteAnimator(animator, deltaTime);
    }
  }
}

function updateSpriteFrameRect(
  world: World<CoreComponentRegistry>,
  assetKey: string
): void {
  const entities = world.query("Sprite", "SpriteAnimator");

  for (const entity of entities) {
    const sprite = world.getComponent(entity, "Sprite");
    const animator = world.getComponent(entity, "SpriteAnimator");
    if (!sprite || !animator) continue;
    if (sprite.assetKey !== assetKey && sprite.textureId !== assetKey) continue;

    const rect = getCurrentFrameRect(animator);
    if (!rect) continue;

    const mutableSprite = world.getMutableComponent(entity, "Sprite");
    if (!mutableSprite) continue;

    const oldRect = mutableSprite.srcRect;
    if (
      oldRect?.x === rect.x &&
      oldRect.y === rect.y &&
      oldRect.w === rect.w &&
      oldRect.h === rect.h
    ) {
      continue;
    }
    mutableSprite.srcRect = rect;
  }
}

/** Keeps the player's SpriteComponent source rectangle synchronized with shared playback. */
export class SumiEPlayerSpriteFrameSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    updateSpriteFrameRect(world, SUMI_E_PLAYER_ASSET_KEY);
  }
}

/** Keeps the samurai source rectangle synchronized for classic and Sumi-e atlas ids. */
export class SamuraiSpriteFrameSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    updateSpriteFrameRect(world, SAMURAI_ASSET_KEY);
  }
}

export function registerHitRunSamuraiAnimationSystems(
  world: World<CoreComponentRegistry>
): void {
  // State selection runs before both animation clocks; frame rectangles are updated afterward.
  world.addSystem(new SumiEPlayerAnimationStateSystem(), {
    phase: SystemPhase.Presentation,
    priority: 39
  });
  world.addSystem(new SamuraiAnimationStateSystem(), {
    phase: SystemPhase.Presentation,
    priority: 40
  });
  // Preserve playback for any remaining legacy Animator entities while migrating the two characters.
  world.addSystem(new AnimationSystem(), {
    phase: SystemPhase.Presentation,
    priority: 41
  });
  world.addSystem(new HitRunSpriteAnimatorPlaybackSystem(), {
    phase: SystemPhase.Presentation,
    priority: 42
  });
  world.addSystem(new SamuraiSpriteFrameSystem(), {
    phase: SystemPhase.Presentation,
    priority: 43
  });
  world.addSystem(new SumiEPlayerSpriteFrameSystem(), {
    phase: SystemPhase.Presentation,
    priority: 44
  });
}

