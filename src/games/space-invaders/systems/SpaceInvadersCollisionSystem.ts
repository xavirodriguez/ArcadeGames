import { World, ComponentType, Juice, CoreComponentRegistry, createEmitter, WorldUtils } from "@tiny-aster/core";
import { System } from "@tiny-aster/core";
import { Entity } from "@tiny-aster/core";
import { EventBus } from "@tiny-aster/core";
import { TransformComponent, HealthComponent, RenderComponent, TTLComponent } from "@tiny-aster/core";
import { spawnScorePopup, CombatHitEvent, CombatDeathEvent, subscribeToCombatEvents } from "@tiny-aster/gameplay-kit";
import {
  GameStateComponent,
  InvaderComponent,
  ShieldComponent,
  BossComponent,
  UITextComponent,
  SpaceInvadersComponentRegistry,
  SpaceInvadersEventRegistry,
  GAME_CONFIG
} from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { ParticlePool } from "../EntityPool";
import { createSharedParticle, EXPLOSION_PROFILES } from "../../shared/rendering/SharedVFX";
import { spawnLayeredExplosion } from "../rendering/SpaceInvadersCanvasVisuals";
import { colors } from "../../../theme/colors";
import { applyComboKill } from "../../shared/arcade/ComboUtils";

/**
 * System that handles game-specific collision reactions and combat side-effects.
 *
 * @remarks
 * **Collision & Combat Pipeline Architecture:**
 * 1. `CollisionSystem2D` (`SystemPhase.Collision`): Evaluates geometric contact/overlap
 *    using hitboxes/colliders and populates `CollisionEventsComponent`. Does not mutate health or destroy entities.
 * 2. `CombatSystem` (`SystemPhase.Collision`): Processes `CollisionEventsComponent` to apply
 *    generic health reductions (`DamageComponent` vs `HealthComponent`) and emits deferred `combat:hit` and `combat:death` events.
 * 3. `SpaceInvadersCollisionSystem` (`SystemPhase.GameRules`): Reacts to `combat:hit` and `combat:death` events
 *    to trigger game-specific rules (combo chain updates, score gain, lives decrement, particle explosions, SFX, floating popups, and shield degradation).
 *
 * Being in `SystemPhase.GameRules` guarantees that all physical contact and damage values are fully resolved
 * before game rules, combo meters, and audio/VFX side-effects are calculated.
 */
export class SpaceInvadersCollisionSystem extends System<SpaceInvadersComponentRegistry, SpaceInvadersEventRegistry> {
  private config?: SpaceInvadersConfig;
  private destroyedEntities = new Set<number>();

  constructor(private _particlePool: ParticlePool) {
    super();
  }

  public override onRegister(world: World<SpaceInvadersComponentRegistry, SpaceInvadersEventRegistry>): void {
    if (!this.config) {
      this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    subscribeToCombatEvents(world, {
      onHit: (event) => this.onCombatHit(world, event),
      onDeath: (event) => this.onCombatDeath(world, event)
    });
  }

  private onCombatHit(world: World<SpaceInvadersComponentRegistry>, event: CombatHitEvent): void {
    if (!this.config) {
      this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const target = event.targetEntity;
    if (!target) return;

    if (world.hasComponent(target, "Player")) {
      this.onPlayerCombatHit(world, target);
    } else if (world.hasComponent(target, "Boss")) {
      this.onBossCombatHit(world, target);
    } else if (world.hasComponent(target, "Invader")) {
      this.onInvaderCombatHit(world, target, event.sourceEntity);
    }
  }

  private onPlayerCombatHit(world: World<SpaceInvadersComponentRegistry>, target: Entity): void {
    world.mutateComponent(target, "Render", (render) => {
      render.hitFlashFrames = 10;
    });

    world.mutateComponent(target, "Health", (health) => {
      health.invulnerableRemaining = 1.5; // 1.5 seconds
    });

    // Apply Squash & Stretch to Player ship on hit
    Juice.squash(world as World<CoreComponentRegistry>, target, 0.7, 1.4, 300);

    // Contextual heavy screen shake on player hit
    Juice.shake(world as World<CoreComponentRegistry>, 10, 300);

    const health = world.getComponent(target, "Health");
    world.mutateSingleton("GameState", (gs) => {
      if (health) {
        gs.lives = health.current;
      }
      if (health && health.current <= 0) {
        gs.isGameOver = true;
        const eventBus = world.getEventBus();
        if (eventBus && !world.isReSimulating) {
          eventBus.emitDeferred("PlaySFX", { name: "game_over" });
        }
      } else {
        const eventBus = world.getEventBus();
        if (eventBus && !world.isReSimulating) {
          eventBus.emitDeferred("PlaySFX", { name: "hit" });
        }
      }
    });
  }

  private onBossCombatHit(world: World<SpaceInvadersComponentRegistry>, target: Entity): void {
    const bossComp = world.getComponent(target, "Boss");
    if (!bossComp) return;

    const health = world.getComponent(target, "Health");
    const nextHp = health ? health.current : bossComp.hp - 1;

    world.mutateComponent(target, "Boss", (b) => {
      b.hp = nextHp;
    });

    world.mutateComponent(target, "Render", (render) => {
      render.hitFlashFrames = 5;
    });

    // Apply hit-stop (50ms) and Squash & Stretch to Boss on hit
    world.setResource("GameplayFreeze", { remaining: 0.05 });
    Juice.squash(world as World<CoreComponentRegistry>, target, 1.2, 0.8, 200);

    const pos = world.getComponent(target, "Transform");
    if (pos) {
      this.createExplosion(world, pos.x, pos.y, "#FF00FF");
    }

    world.mutateSingleton("GameState", (gs) => {
      gs.score += 100;
    });

    const eventBus = world.getEventBus();
    if (eventBus && !world.isReSimulating) {
      eventBus.emitDeferred("PlaySFX", { name: "hit" });
    }
  }

  private onInvaderCombatHit(world: World<SpaceInvadersComponentRegistry>, target: Entity, sourceBullet?: Entity): void {
    world.mutateComponent(target, "Render", (render) => {
      render.hitFlashFrames = 4;
    });

    // Apply micro freeze-frame hit-stop (30ms) and Squash & Stretch deformation on invader hit
    world.setResource("GameplayFreeze", { remaining: 0.03 });
    Juice.squash(world as World<CoreComponentRegistry>, target, 1.25, 0.75, 120);

    const pos = world.getComponent(target, "Transform");
    if (pos) {
      // Calculate bullet velocity/direction before particle burst for directional impact sparks
      let sparkAngle: [number, number] = [0, 360];
      if (sourceBullet && world.hasComponent(sourceBullet, "Velocity")) {
        const vel = world.getComponent(sourceBullet, "Velocity");
        if (vel && (vel.vx !== 0 || vel.vy !== 0)) {
          const theta = (Math.atan2(vel.vy, vel.vx) * 180) / Math.PI;
          sparkAngle = [theta - 30, theta + 30];
        }
      }

      // Small directional spark burst emitter
      const sparkEmitter = createEmitter(world, {
        type: "spark",
        x: pos.x,
        y: pos.y,
        rate: 0,
        burst: true,
        count: 5,
        lifetime: [0.15, 0.3],
        speed: [80, 180],
        size: [2, 4],
        color: ["#00FFFF", "#FFFFFF", "#FFFF00"],
        angle: sparkAngle,
        loop: false
      });
      world.getCommandBuffer().addComponent(sparkEmitter, { type: "TTL", timeLeft: 0.3, remaining: 0.3 });

      this.createExplosion(world, pos.x, pos.y, "#00FFFF");
    }

    const eventBus = world.getEventBus();
    if (eventBus && !world.isReSimulating) {
      eventBus.emitDeferred("PlaySFX", { name: "hit" });
    }
  }

  private onCombatDeath(world: World<SpaceInvadersComponentRegistry>, event: CombatDeathEvent): void {
    const target = event.entity;
    if (!target) return;

    if (world.hasComponent(target, "Invader")) {
      this.onInvaderCombatDeath(world, target, event.sourceEntity);
    }
  }

  private onInvaderCombatDeath(world: World<SpaceInvadersComponentRegistry>, target: Entity, sourceBullet?: Entity): void {
    const invaderComp = world.getComponent(target, "Invader");
    const gameState = world.getSingleton("GameState");
    if (gameState) {
      // Mutate Combo component
      let nextCombo = 0;
      let nextMultiplier = 1;

      const comboEntities = world.query("Combo");
      const comboEntity = comboEntities[0];
      if (comboEntity !== undefined) {
        const comboResult = applyComboKill(world, comboEntity, this.config!);
        nextCombo = comboResult.nextCombo;
        nextMultiplier = comboResult.nextMultiplier;
      }

      let scoreGain = 0;
      if (invaderComp) {
        scoreGain = invaderComp.points * nextMultiplier;
      }
      const nextScore = gameState.score + scoreGain;

      world.mutateSingleton("GameState", gs => {
        gs.score = nextScore;
      });

      const pos = world.getComponent(target, "Transform");
      if (pos) {
        const explosionX = pos.x;
        const explosionY = pos.y;

        this.createExplosion(world, explosionX, explosionY, "#FFFFFF");

        // Dynamic popup text & color based on combo multiplier
        let popupColor = "#FFFF00";
        if (nextMultiplier >= 6) popupColor = "#FFD700"; // Gold
        else if (nextMultiplier >= 4) popupColor = "#FF00FF"; // Magenta
        else if (nextMultiplier >= 2) popupColor = "#00FFFF"; // Cyan

        const popupText = nextMultiplier > 1 ? `+${scoreGain} (x${nextMultiplier})` : `+${scoreGain}`;
        spawnScorePopup(world, explosionX, explosionY, popupText, popupColor);
      }

      // Contextual screen shake: light for single kills, medium for fast combo chains
      const shakeIntensity = nextCombo >= 5 ? 5.5 : 2.5;
      const shakeDuration = nextCombo >= 5 ? 180 : 100;
      Juice.shake(world as World<CoreComponentRegistry>, shakeIntensity, shakeDuration);

      const eventBus = world.getEventBus();
      if (eventBus) {
        eventBus.emitDeferred("si:kill", { chain: nextCombo });
        eventBus.emitDeferred("entity:destroyed", { entity: target, type: "Invader" });

        // If killed by a piercing bullet that destroyed more than one target
        if (sourceBullet && world.hasComponent(sourceBullet, "PlayerBullet")) {
          const dmg = world.getComponent(sourceBullet, "Damage");
          if (dmg && dmg.charged === true) {
            eventBus.emitDeferred("si:pierce_kill", { bullet: sourceBullet, target });
          }
        }

        if (!world.isReSimulating) {
          eventBus.emitDeferred("PlaySFX", { name: "explosion_small", pitchRange: 0.05 });
          if (nextCombo > 1 && nextCombo % 5 === 0) {
            eventBus.emitDeferred("PlaySFX", { name: "combo_up", volume: 0.9 });
          }
        }
      }

      const hasKami = world.hasComponent(target, 'Kamikaze');
      if (hasKami) {
        const nextKamikazes = gameState.kamikazesActive - 1;
        world.mutateSingleton("GameState", gs => {
          gs.kamikazesActive = nextKamikazes;
        });
      }
    }

    // Charge player EMP ability on invader death
    const playerEntity = world.query("Player", "EmpAbility")[0];
    if (playerEntity !== undefined) {
      world.mutateComponent(playerEntity, "EmpAbility", emp => {
        emp.charge = Math.min(1.0, emp.charge + emp.chargePerKill);
      });
    }

    world.getCommandBuffer().removeEntity(target);
  }

  public override update(world: World<SpaceInvadersComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const gameState = world.getSingleton("GameState");
    if (!gameState || gameState.isGameOver) return;

    const entitiesWithEvents = world.query("CollisionEvents");
    // Safe for determinism/rollback. Reusing instance Set avoids per-tick heap allocations during collision resolution.
    this.destroyedEntities.clear();

    const len = entitiesWithEvents.length;
    for (let i = 0; i < len; i++) {
      const entityA = entitiesWithEvents[i];
      const eventsComp = world.getComponent(entityA, "CollisionEvents");
      if (!eventsComp) continue;

      for (const event of eventsComp.collisions) {
        const entityB = event.otherEntity;

        // Double Security A: Process each pair exactly once
        if (entityA >= entityB) continue;

        // Double Security B: Ensure both entities still exist
        if (!WorldUtils.isEntityActive(world, entityA) || !WorldUtils.isEntityActive(world, entityB)) continue;

        // Double Security C: Ensure they haven't already been destroyed in this update step
        if (this.destroyedEntities.has(entityA) || this.destroyedEntities.has(entityB)) continue;

        this.handleCollision(world, entityA, entityB, this.destroyedEntities);

        // Re-check game over state after each collision
        const currentGS = world.getSingleton("GameState");
        if (currentGS?.isGameOver) return;
      }
    }

    // Special check: Invaders reaching the bottom
    this.checkInvadersBottom(world, gameState);
  }

  private handleCollision(
    world: World<SpaceInvadersComponentRegistry>,
    e1: Entity,
    e2: Entity,
    destroyedEntities: Set<number>
  ): void {
    if (destroyedEntities.has(e1) || destroyedEntities.has(e2)) return;

    if (!WorldUtils.isEntityActive(world, e1) || !WorldUtils.isEntityActive(world, e2)) return;

    const gameState = world.getSingleton("GameState");
    if (!gameState) return;

    if (this.resolveBulletBossCollision(world, e1, e2)) return;
    if (this.resolveBulletInvaderCollision(world, e1, e2)) return;
    if (this.resolveBulletShieldCollision(world, e1, e2, destroyedEntities)) return;
    if (this.resolveEnemyBulletPlayerCollision(world, e1, e2)) return;
    if (this.resolveInvaderPlayerCollision(world, e1, e2)) return;
    if (this.resolveInvaderShieldCollision(world, e1, e2, destroyedEntities)) return;
  }

  private resolveBulletBossCollision(world: World<SpaceInvadersComponentRegistry>, e1: Entity, e2: Entity): boolean {
    const pair = WorldUtils.matchPair(world, e1, e2, "PlayerBullet", "Boss");
    // Handled by CombatSystem & combat:hit reaction
    return pair !== undefined;
  }

  private resolveBulletInvaderCollision(world: World<SpaceInvadersComponentRegistry>, e1: Entity, e2: Entity): boolean {
    const pair = WorldUtils.matchPair(world, e1, e2, "PlayerBullet", "Invader");
    // Handled by CombatSystem & combat:death / combat:hit reaction
    return pair !== undefined;
  }

  private resolveBulletShieldCollision(
    world: World<SpaceInvadersComponentRegistry>,
    e1: Entity,
    e2: Entity,
    destroyedEntities: Set<number>
  ): boolean {
    const bulletShield = WorldUtils.matchPair(world, e1, e2, "PlayerBullet", "Shield") ||
                         WorldUtils.matchPair(world, e1, e2, "EnemyBullet", "Shield");
    if (!bulletShield) return false;

    const bullet = (bulletShield as Record<string, Entity>).PlayerBullet || (bulletShield as Record<string, Entity>).EnemyBullet;
    const shield = (bulletShield as Record<string, Entity>).Shield;

    if (WorldUtils.isEntityActive(world, shield) && !destroyedEntities.has(shield)) {
      this.damageShield(world, shield, destroyedEntities);
    }
    if (WorldUtils.isEntityActive(world, bullet) && !destroyedEntities.has(bullet)) {
      const dmg = world.getComponent(bullet, "Damage");
      if (dmg && dmg.charged === true && dmg.piercing !== undefined && dmg.piercing > 0) {
        world.mutateComponent(bullet, "Damage", d => {
          d.piercing! -= 1;
          if (d.piercing! <= 0) {
            d.consumption = "destroy-entity";
          }
        });

        const pos = world.getComponent(bullet, "Transform");
        if (pos) {
          const sparkEmitter = createEmitter(world, {
            type: "spark",
            x: pos.x,
            y: pos.y,
            rate: 0,
            burst: true,
            count: 6,
            lifetime: [0.15, 0.3],
            speed: [100, 200],
            size: [2, 4],
            color: ["#00FFFF", "#0088FF", "#FFFFFF"],
            angle: [0, 360],
            loop: false
          });
          world.getCommandBuffer().addComponent(sparkEmitter, { type: "TTL", timeLeft: 0.3, remaining: 0.3 });
        }

        const updatedDmg = world.getComponent(bullet, "Damage");
        if (updatedDmg && (updatedDmg.piercing ?? 0) <= 0) {
          destroyedEntities.add(bullet);
          WorldUtils.removeOrReclaim(world, bullet);
        }
      } else if (world.hasComponent(bullet, "PlayerBullet")) {
        // Charged shot logic: passing through own shield supercharges bullet
        const mutableDmg = world.getMutableComponent(bullet, "Damage");
        if (mutableDmg) {
          mutableDmg.consumption = "remove-component";
        }
        const render = world.getMutableComponent(bullet, "Render");
        if (render) {
          render.color = colors.cyan;
        }
      } else {
        destroyedEntities.add(bullet);
        WorldUtils.removeOrReclaim(world, bullet);
      }
    }
    return true;
  }

  private resolveEnemyBulletPlayerCollision(world: World<SpaceInvadersComponentRegistry>, e1: Entity, e2: Entity): boolean {
    const pair = WorldUtils.matchPair(world, e1, e2, "EnemyBullet", "Player");
    // Handled by CombatSystem & combat:hit reaction
    return pair !== undefined;
  }

  private resolveInvaderPlayerCollision(world: World<SpaceInvadersComponentRegistry>, e1: Entity, e2: Entity): boolean {
    const pair = WorldUtils.matchPair(world, e1, e2, "Invader", "Player");
    if (!pair) return false;

    world.mutateSingleton("GameState", gs => {
      gs.isGameOver = true;
    });
    return true;
  }

  private resolveInvaderShieldCollision(
    world: World<SpaceInvadersComponentRegistry>,
    e1: Entity,
    e2: Entity,
    destroyedEntities: Set<number>
  ): boolean {
    const pair = WorldUtils.matchPair(world, e1, e2, "Invader", "Shield");
    if (!pair) return false;

    const shield = pair.Shield;
    if (WorldUtils.isEntityActive(world, shield)) {
      this.damageShield(world, shield, destroyedEntities);
    }
    return true;
  }

  private damageShield(
    world: World<SpaceInvadersComponentRegistry>,
    shieldEntity: number,
    destroyedEntities: Set<number>
  ): void {
    if (destroyedEntities.has(shieldEntity)) return;
    if (!world.hasComponent(shieldEntity, "Shield")) return;
    const shield = world.getComponent(shieldEntity, "Shield");
    if (!shield) return;

    const nextHp = shield.hp - 1;
    const expired = nextHp <= 0;

    world.mutateComponent(shieldEntity, "Shield", s => {
      s.hp = nextHp;
    });

    const eventBus = world.getEventBus();

    if (expired) {
      if (eventBus && !world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "shield_break", volume: 0.8 });
      }
      world.getCommandBuffer().removeEntity(shieldEntity);
      destroyedEntities.add(shieldEntity);
    } else {
      if (eventBus && !world.isReSimulating) {
        eventBus.emitDeferred("PlaySFX", { name: "shield_hit", volume: 0.6 });
      }
      world.mutateComponent(shieldEntity, "Render", render => {
        render.hitFlashFrames = 5;
      });
    }
  }

  private createExplosion(world: World<SpaceInvadersComponentRegistry>, x: number, y: number, color: string): void {
    const rng = world.gameplayRandom;
    const alienColors = EXPLOSION_PROFILES["alien"].colorSequence;
    const particleCount = EXPLOSION_PROFILES["alien"].particleCount;

    // Layer 1: Immediate flash (ECS particles using alien thermal color sequence)
    for (let i = 0; i < particleCount; i++) {
      const angle = rng.next() * Math.PI * 2;
      const speed = rng.next() * 100 + 50;
      const pColor = alienColors[rng.nextInt(0, alienColors.length)] || color;

      createSharedParticle(
        world,
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        pColor,
        this._particlePool,
        2,
        this.config!.PARTICLE_TTL_BASE
      );
    }

    // Layers 2, 3, 4: Visual-only pool (Expanding ring, debris with gravity, residual smoke)
    if (!world.isReSimulating) {
      spawnLayeredExplosion(x, y, color, 1.0);
    }
  }

  private checkInvadersBottom(world: World<SpaceInvadersComponentRegistry>, _gameState: GameStateComponent): void {
    const invaders = world.query("Invader", "Transform");
    const limit = GAME_CONFIG.worldHeight - 100;
    const len = invaders.length;

    for (let i = 0; i < len; i++) {
      const invader = invaders[i];
      const pos = world.getComponent(invader, "Transform");
      if (pos && pos.y > limit) {
        world.mutateSingleton("GameState", gs => {
            gs.isGameOver = true;
        });
        break;
      }
    }
  }

}
