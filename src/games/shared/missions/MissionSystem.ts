import { System, World, ComponentRegistry, EventBus } from "@tiny-aster/core";
import { MissionDefinition, MissionProgress, MissionEventPayload } from "./MissionTypes";

/**
 * ECS System for orchestrating and evaluating playable mini-missions.
 * Supports event-driven tracking and continuous frame-by-frame state checks.
 * @public
 */
export class MissionSystem<TComponents extends ComponentRegistry = ComponentRegistry> extends System<TComponents> {
  private activeMission: MissionProgress | null = null;

  constructor(initialMission?: MissionDefinition) {
    super();
    if (initialMission) {
      this.setMission(initialMission);
    }
  }

  /**
   * Sets or changes the active mission.
   */
  public setMission(def: MissionDefinition): void {
    this.activeMission = {
      definition: def,
      currentCount: 0,
      completed: false,
      failed: false,
      elapsedTime: 0,
      customState: {}
    };
  }

  /**
   * Retrieves the current active mission progress payload.
   */
  public getActiveMission(): MissionProgress | null {
    return this.activeMission;
  }

  public override onRegister(world: World<TComponents>): void {
    // Synchronize current active mission into world resources for HUD and external systems
    if (this.activeMission) {
      world.setResource("ActiveMission", this.activeMission);
    }

    const eventBus = world.getEventBus() as EventBus;
    if (!eventBus) return;

    // Listen for combat death / asteroid destroyed events
    eventBus.on("asteroid:destroyed", (event: any) => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      this.handleAsteroidDestroyed(world, event);
    });

    eventBus.on("ship:destroyed", () => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      this.handleShipDestroyed(world);
    });

    eventBus.on("ufo:destroyed", (event: any) => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      this.handleUfoDestroyed(world, event);
    });

    eventBus.on("ufo:spawned", () => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      this.activeMission.customState.ufoAvailable = true;
    });

    eventBus.on("CollectiblePickedUp", (event: any) => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      this.handlePowerUpPickup(world, event);
    });

    eventBus.on("powerup:collected", (event: any) => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      this.handlePowerUpPickup(world, event);
    });

    eventBus.on("bullet:fired", () => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      this.activeMission.customState.firedBullet = true;
      this.activeMission.customState.noFireTimer = 0;
    });

    eventBus.on("hyperspace:used", () => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      if (this.activeMission.definition.id === "space_dancer") {
        const count = ((this.activeMission.customState.hyperspaceCount as number) || 0) + 1;
        this.activeMission.customState.hyperspaceCount = count;
        this.activeMission.currentCount = count;
        if (count >= this.activeMission.definition.targetCount) {
          this.completeMission(world);
        }
      }
    });

    eventBus.on("score:changed", (event: any) => {
      if (!this.activeMission || this.activeMission.completed || this.activeMission.failed) return;
      if (this.activeMission.definition.id === "against_clock") {
        const scoreGain = (event?.delta as number) || 0;
        this.activeMission.currentCount += scoreGain;
        if (this.activeMission.currentCount >= this.activeMission.definition.targetCount) {
          this.completeMission(world);
        }
      }
    });
  }

  public update(world: World<TComponents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (!this.activeMission) return;

    // Keep world resource in sync
    world.setResource("ActiveMission", this.activeMission);

    if (this.activeMission.completed || this.activeMission.failed) return;

    this.activeMission.elapsedTime += deltaTime;

    // Global Time Limit check
    if (this.activeMission.definition.timeLimit && this.activeMission.elapsedTime >= this.activeMission.definition.timeLimit) {
      if (!this.activeMission.completed) {
        this.failMission(world);
        return;
      }
    }

    const id = this.activeMission.definition.id;

    // Continuous Condition Evaluation
    if (id === "chaos_king") {
      this.updateChaosKing(world, deltaTime);
    } else if (id === "extreme_survival") {
      this.updateExtremeSurvival(world, deltaTime);
    } else if (id === "ghost_ship") {
      this.updateGhostShip(world, deltaTime);
    } else if (id === "precision_pressure") {
      this.updatePrecisionPressure(world, deltaTime);
    } else if (id === "mult_master") {
      this.updateMultMaster(world);
    } else if (id === "perfect_shield") {
      this.updatePerfectShield(world, deltaTime);
    } else if (id === "space_dancer") {
      this.updateSpaceDancer(world, deltaTime);
    }
  }

  private handleAsteroidDestroyed(world: World<TComponents>, event: any): void {
    if (!this.activeMission) return;

    const id = this.activeMission.definition.id;
    const size = event?.size;

    // 1. Cazador de Núcleos (core_hunter): destroy N asteroids + collect M power-ups
    if (id === "core_hunter") {
      const astCount = ((this.activeMission.customState.asteroidsDestroyed as number) || 0) + 1;
      this.activeMission.customState.asteroidsDestroyed = astCount;
      const powerups = (this.activeMission.customState.powerUpsCollected as number) || 0;
      this.activeMission.currentCount = astCount + powerups;
      const targetAst = (this.activeMission.definition.customData?.targetAsteroids as number) || 8;
      const targetPow = (this.activeMission.definition.customData?.targetPowerUps as number) || 2;
      if (astCount >= targetAst && powerups >= targetPow) {
        this.completeMission(world);
      }
    }

    // 2. Caza Cercana (close_hunt): destroy large asteroid while ship is within radius
    if (id === "close_hunt" && size === "large") {
      const shipEntities = world.query("Ship" as any);
      if (shipEntities.length > 0) {
        const shipTransform = world.getComponent(shipEntities[0], "Transform" as any) as any;
        const asteroidEntity = event.entity;
        const asteroidTransform = world.hasComponent(asteroidEntity, "Transform" as any)
          ? (world.getComponent(asteroidEntity, "Transform" as any) as any)
          : null;

        if (shipTransform && asteroidTransform) {
          const dx = shipTransform.x - asteroidTransform.x;
          const dy = shipTransform.y - asteroidTransform.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = (this.activeMission.definition.customData?.maxDistance as number) || 80;
          if (dist <= maxDist) {
            this.activeMission.currentCount = 1;
            this.completeMission(world);
          }
        }
      }
    }

    // 3. Escudo Ofensivo (offensive_shield): destroy N asteroids while ship has Invulnerable
    if (id === "offensive_shield") {
      const shipEntities = world.query("Ship" as any);
      if (shipEntities.length > 0) {
        const ship = shipEntities[0];
        if (world.hasComponent(ship, "Invulnerable" as any)) {
          this.activeMission.currentCount++;
          if (this.activeMission.currentCount >= this.activeMission.definition.targetCount) {
            this.completeMission(world);
          }
        }
      }
    }

    // 4. Doble Amenaza (double_threat): destroy UFO + large asteroid within window, or 2 large asteroids as fallback
    if (id === "double_threat" && size === "large") {
      const now = this.activeMission.elapsedTime;
      const lastUfoKill = (this.activeMission.customState.lastUfoKillTime as number) ?? -999;
      const windowSec = (this.activeMission.definition.customData?.timeWindow as number) || 10;

      if (now - lastUfoKill <= windowSec) {
        this.completeMission(world);
        return;
      }

      this.activeMission.customState.lastLargeAsteroidKillTime = now;

      // Fallback check if no UFO is available
      const largeKills = ((this.activeMission.customState.largeAsteroidKills as number) || 0) + 1;
      this.activeMission.customState.largeAsteroidKills = largeKills;
      const prevKill = this.activeMission.customState.prevLargeKillTime as number | undefined;

      if (prevKill !== undefined && now - prevKill <= windowSec) {
        this.completeMission(world);
      } else {
        this.activeMission.customState.prevLargeKillTime = now;
      }
    }
  }

  private handleUfoDestroyed(world: World<TComponents>, _event: any): void {
    if (!this.activeMission) return;
    if (this.activeMission.definition.id === "double_threat") {
      const now = this.activeMission.elapsedTime;
      const lastAstKill = (this.activeMission.customState.lastLargeAsteroidKillTime as number) ?? -999;
      const windowSec = (this.activeMission.definition.customData?.timeWindow as number) || 10;

      if (now - lastAstKill <= windowSec) {
        this.completeMission(world);
      } else {
        this.activeMission.customState.lastUfoKillTime = now;
      }
    }
  }

  private handlePowerUpPickup(world: World<TComponents>, _event: any): void {
    if (!this.activeMission) return;
    if (this.activeMission.definition.id === "core_hunter") {
      const powerups = ((this.activeMission.customState.powerUpsCollected as number) || 0) + 1;
      this.activeMission.customState.powerUpsCollected = powerups;
      const astCount = (this.activeMission.customState.asteroidsDestroyed as number) || 0;
      this.activeMission.currentCount = astCount + powerups;
      const targetAst = (this.activeMission.definition.customData?.targetAsteroids as number) || 8;
      const targetPow = (this.activeMission.definition.customData?.targetPowerUps as number) || 2;
      if (astCount >= targetAst && powerups >= targetPow) {
        this.completeMission(world);
      }
    }
  }

  private handleShipDestroyed(world: World<TComponents>): void {
    if (!this.activeMission) return;
    if (this.activeMission.definition.id === "extreme_survival") {
      this.failMission(world);
    }
  }

  private updateChaosKing(world: World<TComponents>, deltaTime: number): void {
    if (!this.activeMission) return;
    const shipEntities = world.query("Ship" as any);
    if (shipEntities.length === 0) return;

    const shipTransform = world.getComponent(shipEntities[0], "Transform" as any) as any;
    if (!shipTransform) return;

    const asteroids = world.query("Asteroid" as any);
    let nearFragment = false;
    const radius = (this.activeMission.definition.customData?.cloudRadius as number) || 150;

    for (let i = 0; i < asteroids.length; i++) {
      const astComp = world.getComponent(asteroids[i], "Asteroid" as any) as any;
      if (astComp && (astComp.size === "medium" || astComp.size === "small")) {
        const astTransform = world.getComponent(asteroids[i], "Transform" as any) as any;
        if (astTransform) {
          const dist = Math.hypot(shipTransform.x - astTransform.x, shipTransform.y - astTransform.y);
          if (dist <= radius) {
            nearFragment = true;
            break;
          }
        }
      }
    }

    if (nearFragment) {
      const timer = ((this.activeMission.customState.proximityTimer as number) || 0) + deltaTime;
      this.activeMission.customState.proximityTimer = timer;
      this.activeMission.currentCount = Math.floor(timer);
      const targetTime = (this.activeMission.definition.customData?.targetTime as number) || 3.0;
      if (timer >= targetTime) {
        this.completeMission(world);
      }
    }
  }

  private updateExtremeSurvival(world: World<TComponents>, deltaTime: number): void {
    if (!this.activeMission) return;
    const gameState = world.getSingleton("GameState" as any) as any;
    if (!gameState) return;

    if (gameState.lives <= 0) {
      this.failMission(world);
      return;
    }

    if (gameState.lives === 1) {
      const timer = ((this.activeMission.customState.survivalTimer as number) || 0) + deltaTime;
      this.activeMission.customState.survivalTimer = timer;
      this.activeMission.currentCount = Math.floor(timer);
      const targetTime = (this.activeMission.definition.customData?.survivalTarget as number) || 15;
      if (timer >= targetTime) {
        this.completeMission(world);
      }
    }
  }

  private updateGhostShip(world: World<TComponents>, deltaTime: number): void {
    if (!this.activeMission) return;
    // Check if player input shoot is active
    const localPlayer = world.query("LocalPlayer" as any)[0];
    if (localPlayer !== undefined) {
      const input = world.getComponent(localPlayer, "Input" as any) as any;
      if (input && input.actions && (input.actions["shoot"] || input.actions.fire)) {
        this.activeMission.customState.noFireTimer = 0;
        return;
      }
    }

    const timer = ((this.activeMission.customState.noFireTimer as number) || 0) + deltaTime;
    this.activeMission.customState.noFireTimer = timer;
    this.activeMission.currentCount = Math.floor(timer);
    const targetTime = (this.activeMission.definition.customData?.targetNoFireTime as number) || 20;
    if (timer >= targetTime) {
      this.completeMission(world);
    }
  }

  private updatePrecisionPressure(world: World<TComponents>, deltaTime: number): void {
    if (!this.activeMission) return;
    const comboEntities = world.query("Combo" as any);
    if (comboEntities.length === 0) return;

    const combo = world.getComponent(comboEntities[0], "Combo" as any) as any;
    if (!combo) return;

    const minMult = (this.activeMission.definition.customData?.minMultiplier as number) || 3;
    if (combo.multiplier >= minMult) {
      const timer = ((this.activeMission.customState.pressureTimer as number) || 0) + deltaTime;
      this.activeMission.customState.pressureTimer = timer;
      this.activeMission.currentCount = Math.floor(timer);
      const targetTime = (this.activeMission.definition.customData?.targetDuration as number) || 10;
      if (timer >= targetTime) {
        this.completeMission(world);
      }
    } else {
      this.activeMission.customState.pressureTimer = 0;
    }
  }

  private updateMultMaster(world: World<TComponents>): void {
    if (!this.activeMission) return;
    const comboEntities = world.query("Combo" as any);
    if (comboEntities.length === 0) return;

    const combo = world.getComponent(comboEntities[0], "Combo" as any) as any;
    if (combo && combo.multiplier >= this.activeMission.definition.targetCount) {
      this.activeMission.currentCount = combo.multiplier;
      this.completeMission(world);
    }
  }

  private updatePerfectShield(world: World<TComponents>, _deltaTime: number): void {
    if (!this.activeMission) return;
    const shipEntities = world.query("Ship" as any);
    if (shipEntities.length === 0) return;

    const ship = shipEntities[0];
    const invulnerable = world.getComponent(ship, "Invulnerable" as any) as any;

    if (invulnerable) {
      this.activeMission.customState.wasShieldActive = true;
      const collisionEvents = world.getComponent(ship, "CollisionEvents" as any) as any;
      if (collisionEvents && collisionEvents.collisions && collisionEvents.collisions.length > 0) {
        this.activeMission.customState.blockedHit = true;
      }
    } else if (this.activeMission.customState.wasShieldActive) {
      if (this.activeMission.customState.blockedHit) {
        this.completeMission(world);
      } else {
        this.failMission(world);
      }
    }
  }

  private updateSpaceDancer(world: World<TComponents>, deltaTime: number): void {
    if (!this.activeMission) return;
    const shipEntities = world.query("Ship" as any);
    if (shipEntities.length === 0) return;

    const shipTransform = world.getComponent(shipEntities[0], "Transform" as any) as any;
    if (!shipTransform) return;

    const asteroids = world.query("Asteroid" as any);
    const closeRadius = (this.activeMission.definition.customData?.closeRadius as number) || 45;
    let nearPass = false;

    for (let i = 0; i < asteroids.length; i++) {
      const astTransform = world.getComponent(asteroids[i], "Transform" as any) as any;
      if (astTransform) {
        const dist = Math.hypot(shipTransform.x - astTransform.x, shipTransform.y - astTransform.y);
        if (dist <= closeRadius && dist >= 15) {
          nearPass = true;
          break;
        }
      }
    }

    if (nearPass) {
      const nearTimer = ((this.activeMission.customState.nearTimer as number) || 0) + deltaTime;
      this.activeMission.customState.nearTimer = nearTimer;
      if (nearTimer >= 0.5) {
        this.activeMission.customState.nearTimer = 0;
        const passCount = ((this.activeMission.customState.nearPassCount as number) || 0) + 1;
        this.activeMission.customState.nearPassCount = passCount;
        this.activeMission.currentCount = passCount;
        if (passCount >= this.activeMission.definition.targetCount) {
          this.completeMission(world);
        }
      }
    } else {
      this.activeMission.customState.nearTimer = 0;
    }
  }

  private completeMission(world: World<TComponents>): void {
    if (!this.activeMission || this.activeMission.completed) return;
    this.activeMission.completed = true;
    this.activeMission.failed = false;

    const reward = this.activeMission.definition.reward;

    if (reward?.scoreBonus) {
      world.mutateSingleton("GameState" as any, (state: any) => {
        state.score = (state.score || 0) + reward.scoreBonus!;
      });
    }

    const payload: MissionEventPayload = {
      missionId: this.activeMission.definition.id,
      progress: this.activeMission,
      reward
    };

    const eventBus = world.getEventBus() as EventBus;
    if (eventBus) {
      eventBus.emitDeferred("mission:completed", payload);
    }
  }

  private failMission(world: World<TComponents>): void {
    if (!this.activeMission || this.activeMission.failed) return;
    this.activeMission.failed = true;

    const payload: MissionEventPayload = {
      missionId: this.activeMission.definition.id,
      progress: this.activeMission
    };

    const eventBus = world.getEventBus() as EventBus;
    if (eventBus) {
      eventBus.emitDeferred("mission:failed", payload);
    }
  }
}
