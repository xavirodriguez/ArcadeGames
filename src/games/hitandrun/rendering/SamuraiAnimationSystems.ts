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
import {
  SUMI_E_PLAYER_ASSET_KEY,
  getSumiEFrameRect
} from "./SumiEVisualAssets";
import type { BeltInputComponent } from "../belt/BeltMovementTypes";
import type { ComboMeleeComponent } from "../melee/ComboMeleeTypes";

const ATTACK_STATES = new Set(["Anticipation", "Windup", "Attack", "Charge"]);
const RECOVERY_STATE = "Recovery";
const SAMURAI_DEATH_ANIMATION_SECONDS = 0.85;

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
      const hitReaction = world.getComponent(entity, "HitReaction") as
        | { hitstunRemaining?: number }
        | undefined;
      const animator = world.getMutableComponent(entity, "Animator");
      if (!machine || !animator) continue;

      const isDead = world.hasComponent(entity, "Dead") || (health !== undefined && health.current <= 0);
      // HitReaction can remain attached after hitstun expires; only its active timer means hurt.
      const isHurt = (hitReaction?.hitstunRemaining ?? 0) > 0;
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
      } else if (
        currentClip === "hurt" &&
        !currentFrameIsTerminal
      ) {
        // Hitstun is shorter than the six-frame hurt clip: preserve the full recoil.
        nextClip = "hurt";
      } else if (
        machine.currentState === RECOVERY_STATE &&
        currentClip === "attack" &&
        !currentFrameIsTerminal
      ) {
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

        // The shared dead-cleanup system starts with a 0.35s timer. Keep the samurai
        // alive long enough for all eight death frames to be visible before pooling.
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
    const entities = world.query("Sprite", "Animator", "BeltInput");

    for (const entity of entities) {
      const sprite = world.getComponent(entity, "Sprite");
      if (sprite?.assetKey !== SUMI_E_PLAYER_ASSET_KEY && sprite?.textureId !== SUMI_E_PLAYER_ASSET_KEY) {
        continue;
      }

      const animator = world.getMutableComponent(entity, "Animator");
      if (!animator) continue;

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
      } else if (attackActive) {
        nextClip = "attack";
      } else if (
        (currentClip === "hurt" || currentClip === "attack") &&
        !currentFrameIsTerminal
      ) {
        nextClip = currentClip;
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

/** Keeps the player's source rectangle in sync with the clip-local animation frame. */
export class SumiEPlayerSpriteFrameSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Sprite", "Animator");

    for (const entity of entities) {
      const sprite = world.getComponent(entity, "Sprite");
      const animator = world.getComponent(entity, "Animator");
      if (!sprite || !animator) continue;
      if (sprite.assetKey !== SUMI_E_PLAYER_ASSET_KEY && sprite.textureId !== SUMI_E_PLAYER_ASSET_KEY) {
        continue;
      }

      const clip = animator.current ? animator.animations[animator.current] : undefined;
      if (!clip || clip.frames.length === 0) continue;

      const frameIndex = Math.max(0, Math.min(animator.frame, clip.frames.length - 1));
      const atlasFrameIndex = clip.frames[frameIndex];
      if (!Number.isFinite(atlasFrameIndex)) continue;
      const rect = getSumiEFrameRect(atlasFrameIndex);
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
  // The player and samurai choose clips before the shared animation timer advances.
  world.addSystem(new SumiEPlayerAnimationStateSystem(), {
    phase: SystemPhase.Presentation,
    priority: 39
  });
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
  world.addSystem(new SumiEPlayerSpriteFrameSystem(), {
    phase: SystemPhase.Presentation,
    priority: 43
  });
}

/** Exposes the shared clip names for focused contract tests. */
export const SAMURAI_ANIMATION_NAMES = Object.keys(SAMURAI_ANIMATIONS);
