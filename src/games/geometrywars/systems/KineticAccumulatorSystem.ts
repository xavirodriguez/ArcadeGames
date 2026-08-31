import { System, World, ComboComponent, Juice, TransformComponent, RenderComponent, TTLComponent, CoreComponentRegistry } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry } from "../types/GeometryWarsRegistry";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { GWParticlePool } from "../EntityPool";

/**
 * KineticAccumulatorSystem handles movement energy charging, graze detection,
 * burst shockwave activation, overdrive state transitions, and combo multiplier boosts.
 * @public
 */
export class KineticAccumulatorSystem extends System<GeometryWarsComponentRegistry, GeometryWarsEventRegistry> {
  private config?: GeometryWarsConfig;

  public update(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (!this.config) {
      this.config = world.getResource<GeometryWarsConfig>("GameConfig")!;
    }

    const maxEnergy = this.config?.KINETIC_MAX_ENERGY ?? 100;
    const chargeRate = this.config?.KINETIC_CHARGE_ON_MOVE_RATE ?? 15;
    const grazeRadius = this.config?.KINETIC_GRAZE_RADIUS ?? 40;
    const grazeChargeAmount = this.config?.KINETIC_GRAZE_CHARGE_AMOUNT ?? 10;
    const burstRadius = this.config?.KINETIC_BURST_RADIUS ?? 180;
    const overdriveDuration = this.config?.OVERDRIVE_DURATION ?? 5.0;
    const playerSpeed = this.config?.PLAYER_SPEED ?? 220;

    const players = world.query("KineticAccumulator", "Transform", "Player", "Velocity");
    const count = players.length;

    for (let i = 0; i < count; i++) {
      const entity = players[i];
      const accumulator = world.getComponent(entity, "KineticAccumulator");
      const transform = world.getComponent(entity, "Transform");
      const player = world.getComponent(entity, "Player");
      const velocity = world.getComponent(entity, "Velocity");

      if (!accumulator || !transform || !player || !velocity) continue;

      const mutAcc = world.getMutableComponent(entity, "KineticAccumulator");
      if (!mutAcc) continue;

      // 1. Movement-based Energy Accumulation (when moving near maximum speed)
      const vx = velocity.vx;
      const vy = velocity.vy;
      const currentSpeedSq = vx * vx + vy * vy;
      // Moving near max speed (at least 50% of player speed threshold)
      if (currentSpeedSq >= (playerSpeed * 0.5) * (playerSpeed * 0.5)) {
        if (mutAcc.storedEnergy < mutAcc.maxEnergy) {
          mutAcc.storedEnergy = Math.min(mutAcc.maxEnergy, mutAcc.storedEnergy + chargeRate * deltaTime);
        }
      }

      // 2. Graze Detection (near miss with enemies)
      const px = transform.worldX ?? transform.x;
      const py = transform.worldY ?? transform.y;
      const grazeRadiusSq = grazeRadius * grazeRadius;

      // Query enemies around player to grant energy boost upon close proximity
      const enemyEntities = world.query("Faction", "Transform");
      for (let j = 0; j < enemyEntities.length; j++) {
        const enemy = enemyEntities[j];
        if (enemy === entity) continue;

        const faction = world.getComponent(enemy, "Faction");
        if (faction?.faction !== "enemy") continue;

        const enemyTransform = world.getComponent(enemy, "Transform");
        if (!enemyTransform) continue;

        const ex = enemyTransform.worldX ?? enemyTransform.x;
        const ey = enemyTransform.worldY ?? enemyTransform.y;
        const dx = ex - px;
        const dy = ey - py;
        const distSq = dx * dx + dy * dy;

        // Graze distance check
        if (distSq <= grazeRadiusSq && distSq > 0) {
          if (mutAcc.storedEnergy < mutAcc.maxEnergy) {
            mutAcc.storedEnergy = Math.min(mutAcc.maxEnergy, mutAcc.storedEnergy + grazeChargeAmount * deltaTime);
          }
        }
      }

      // Check energy state transition
      if (mutAcc.storedEnergy >= mutAcc.maxEnergy) {
        mutAcc.isBurstReady = true;
      }

      // 3. Overdrive Decay
      if (mutAcc.isBurstActive) {
        mutAcc.overdriveRemaining -= deltaTime;
        if (mutAcc.overdriveRemaining <= 0) {
          mutAcc.overdriveRemaining = 0;
          mutAcc.isBurstActive = false;
        }
      }

      // 4. Burst Activation (Triggered via action "bomb" or player.useBomb flag when burst is ready)
      if (player.useBomb && mutAcc.isBurstReady && !mutAcc.isBurstActive) {
        mutAcc.isBurstReady = false;
        mutAcc.isBurstActive = true;
        mutAcc.storedEnergy = 0;
        mutAcc.overdriveRemaining = overdriveDuration;

        // Reset trigger flag on player component
        const mutPlayer = world.getMutableComponent(entity, "Player");
        if (mutPlayer) {
          mutPlayer.useBomb = false;
        }

        // Apply shockwave effect & destroy enemies in burstRadius
        this.triggerBurstShockwave(world, px, py, burstRadius, entity);
      }
    }
  }

  private triggerBurstShockwave(
    world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>,
    px: number,
    py: number,
    burstRadius: number,
    playerEntity: number
  ): void {
    const commands = world.getCommandBuffer();
    const burstRadiusSq = burstRadius * burstRadius;

    // Spawn shockwave visual entity
    const shockwaveEntity = world.reserveEntityId();
    commands.createEntity(shockwaveEntity);
    commands.addComponent(shockwaveEntity, {
      type: "Transform",
      x: px,
      y: py,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: px,
      worldY: py,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    } as TransformComponent);
    commands.addComponent(shockwaveEntity, {
      type: "Render",
      shape: "shockwave",
      size: burstRadius / 4, // baseSize * 4 = burstRadius in DebrisShockwaveEffect
      color: "#ff7800",
      visible: true,
      opacity: 1,
      order: 10,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as RenderComponent);
    commands.addComponent(shockwaveEntity, {
      type: "TTL",
      remaining: 0.5,
      timeLeft: 0.5
    } as TTLComponent);

    // Juice screen shake on shockwave trigger
    if (!world.isReSimulating) {
      Juice.shake(world, 10, 0.3);
      const audio = world.getResource<{ playSFX: (id: string) => void }>("Audio");
      if (audio) {
        audio.playSFX("explosion2");
      }
    }

    // Boost combo multiplier directly via shared ComboComponent
    const comboEntity = world.query("Combo")[0];
    if (comboEntity !== undefined) {
      world.mutateComponent(comboEntity, "Combo", (c: ComboComponent) => {
        c.combo += 5;
        c.multiplier += 1;
        c.timerRemaining = c.timerDuration;
      });
    }

    // Find and destroy/damage all enemies within burstRadius
    const candidates = world.query("Faction", "Transform");
    const count = candidates.length;
    let enemiesDestroyed = 0;

    for (let i = 0; i < count; i++) {
      const target = candidates[i];
      if (target === playerEntity) continue;

      const faction = world.getComponent(target, "Faction");
      if (faction?.faction !== "enemy") continue;

      const transform = world.getComponent(target, "Transform");
      if (!transform) continue;

      const tx = transform.worldX ?? transform.x;
      const ty = transform.worldY ?? transform.y;
      const dx = tx - px;
      const dy = ty - py;

      if (dx * dx + dy * dy <= burstRadiusSq) {
        enemiesDestroyed++;
        commands.removeEntity(target);

        // Spawn burst particles for destroyed enemies
        const particlePool = world.getResource<GWParticlePool>("GWParticlePool");
        if (particlePool && !world.isReSimulating) {
          const rand = world.gameplayRandom;
          const wasLocked = rand.isLocked();
          if (wasLocked) rand.unlock();

          try {
            for (let p = 0; p < 8; p++) {
              const angle = rand.next() * Math.PI * 2;
              const speed = 60 + rand.next() * 120;
              const vx = Math.cos(angle) * speed;
              const vy = Math.sin(angle) * speed;
              particlePool.acquireParticle(world, tx, ty, vx, vy, 3, "#ff9900", 0.5);
            }
          } finally {
            if (wasLocked) rand.lock();
          }
        }
      }
    }
  }
}
