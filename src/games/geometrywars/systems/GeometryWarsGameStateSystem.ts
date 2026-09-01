import { System, World, Entity, Juice } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry } from "../types/GeometryWarsRegistry";
import { ComboComponent } from "@tiny-aster/core";
import { GWParticlePool } from "../EntityPool";

/**
 * GeometryWarsGameStateSystem manages overall game rules, lives, game-over state,
 * score updates, and combo multiplier refreshes based on combat events.
 * @public
 */
export class GeometryWarsGameStateSystem extends System<GeometryWarsComponentRegistry, GeometryWarsEventRegistry> {
  private unsubscribeDeath?: () => void;

  public override onRegister(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>): void {
    const eventBus = world.getEventBus();
    if (eventBus) {
      this.unsubscribeDeath = eventBus.on("combat:death", (payload) => {
        this.handleDeath(world, payload);
      });
    }
  }

  public override dispose(): void {
    if (this.unsubscribeDeath) {
      this.unsubscribeDeath();
      this.unsubscribeDeath = undefined;
    }
  }

  public update(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    // Increment game time if game is not over
    const stateEntity = world.query("GeometryWarsState")[0];
    if (stateEntity !== undefined) {
      const state = world.getComponent(stateEntity, "GeometryWarsState");
      if (state && !state.isGameOver) {
        world.mutateComponent(stateEntity, "GeometryWarsState", (s) => {
          s.gameTime += deltaTime;
        });
      }
    }
  }

  private handleDeath(world: World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>, event: any): void {
    const deadEntity = event.entity;
    const killerEntity = event.sourceEntity;

    const stateEntity = world.query("GeometryWarsState")[0];
    if (stateEntity === undefined) return;

    // 1. Player death logic
    if (world.hasComponent(deadEntity, "Player")) {
      world.mutateComponent(stateEntity, "GeometryWarsState", (s) => {
        s.lives -= 1;
        if (s.lives <= 0) {
          s.lives = 0;
          s.isGameOver = true;
        }
      });

      if (!world.isReSimulating) {
        Juice.shake(world, 14, 0.5);
        const audio = world.getResource<any>("Audio") || (world as any).audio;
        if (audio) {
          audio.playSFX("explosion2");
        }
      }

      // Reset combo on player hit/death
      const comboEntity = world.query("Combo")[0];
      if (comboEntity !== undefined) {
        world.mutateComponent(comboEntity, "Combo", (c) => {
          c.combo = 0;
          c.multiplier = 1;
          c.timerRemaining = 0;
        });
      }

      // If player still has lives, respawn/revive player with temporary invulnerability
      const lives = world.getComponent(stateEntity, "GeometryWarsState")?.lives ?? 0;
      if (lives > 0) {
        // Remove dead component to revive
        world.getCommandBuffer().removeComponent(deadEntity, "Dead" as any);
        world.mutateComponent(deadEntity, "Health", (h) => {
          h.current = h.max;
          h.invulnerableRemaining = 2.0; // 2s invulnerability
        });
        // Teleport back to center safely
        const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig");
        if (screenConfig) {
          world.mutateComponent(deadEntity, "Transform", (t) => {
            t.x = screenConfig.width / 2;
            t.y = screenConfig.height / 2;
            t.dirty = true;
          });
        }
      }
      return;
    }

    // 2. Enemy death logic (increment score & combo)
    const isEnemy = world.hasComponent(deadEntity, "Steering" as any) || (world.hasComponent(deadEntity, "Faction" as any) && (world.getComponent(deadEntity, "Faction" as any) as any).faction === "enemy");
    if (isEnemy) {
      const render = world.getComponent(deadEntity, "Render" as any) as any;
      const transform = world.getComponent(deadEntity, "Transform" as any) as any;

      let baseScore = 50;
      if (render) {
        if (render.shape === "gw_chaser") baseScore = 100;
        else if (render.shape === "gw_evader") baseScore = 150;
        else if (render.shape === "gw_grunt") baseScore = 50;
      }

      // Calculate multiplied score reward
      let finalMultiplier = 1;
      const comboEntity = world.query("Combo")[0];
      if (comboEntity !== undefined) {
        world.mutateComponent(comboEntity, "Combo", (c) => {
          c.combo += 1;
          // Multiplier increments by 1 every 10 combo hits
          c.multiplier = 1 + Math.floor(c.combo / 10);
          c.timerRemaining = c.timerDuration; // refresh timer
          finalMultiplier = c.multiplier;
        });
      }

      // Add to score
      world.mutateComponent(stateEntity, "GeometryWarsState", (s) => {
        s.score += baseScore * finalMultiplier;
      });

      // Game Feel effects on enemy death (skipped during rollback/resimulation)
      if (!world.isReSimulating) {
        // Dynamic screen shake based on enemy rank/score
        const shakeAmt = baseScore >= 150 ? 5 : baseScore >= 100 ? 3.5 : 2;
        Juice.shake(world, shakeAmt, 0.15);

        // Play SFX
        const audio = world.getResource<any>("Audio") || (world as any).audio;
        if (audio) {
          audio.playSFX("explosion");
        }

        // Spawn particles
        const particlePool = world.getResource<GWParticlePool>("GWParticlePool");
        if (particlePool && transform) {
          const px = transform.worldX ?? transform.x;
          const py = transform.worldY ?? transform.y;
          const color = render ? render.color : "#ffffff";

          const rand = world.gameplayRandom;
          const initialStatus = rand.isLocked();
          if (initialStatus) rand.unlock();

          try {
            for (let i = 0; i < 12; i++) {
              const angle = rand.next() * Math.PI * 2;
              const speed = 50 + rand.next() * 150;
              const vx = Math.cos(angle) * speed;
              const vy = Math.sin(angle) * speed;
              const size = 2 + rand.next() * 3;
              const ttl = 0.4 + rand.next() * 0.6;

              particlePool.acquireParticle(world, px, py, vx, vy, size, color, ttl);
            }
          } finally {
            if (initialStatus) rand.lock();
          }
        }
      }

      // Remove the enemy entity from world
      world.getCommandBuffer().removeEntity(deadEntity);
    }
  }
}
