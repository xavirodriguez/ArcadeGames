import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ParticleEmitterComponent, ParticleEmitterConfig, Entity, CoreComponentRegistry } from "../ecs/CoreComponents";
import { createDeferredEntity } from "../ecs/EntityHelpers";

/**  
 * Shape of the params passed to the particle pool's `acquire()` on each spawn.  
 * @public  
 */  
export interface ParticleParams {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  ttl: number;
}

/**  
 * Minimal pooling contract this system depends on — decouples ParticleSystem  
 * from any concrete pool implementation (see e.g. gameplay-kit's ParticlePool,  
 * or per-game pools like BulletPool). Callers inject their own pool via the  
 * constructor.  
 * @public  
 */  
export interface IPrefabPool<TParams> {
    acquire(world: World, params: TParams): Entity;
}

/**  
 * Simulation-side driver for `ParticleEmitter` components: advances each  
 * active emitter's elapsed time, fires burst/rate-based spawns, and delegates  
 * actual entity creation to the injected `IPrefabPool`.  
 *  
 * @remarks  
 * This system only handles *gameplay-affecting* particle emission (the kind  
 * that goes through the ECS pool and participates in rollback/determinism via  
 * `world.renderRandom` — see below). It is intentionally separate from the  
 * purely cosmetic, file-local "visual particle pools" used by several games'  
 * Canvas/Skia renderers (e.g. FlappyBirdCanvasVisuals.ts, GeometryWarsSkiaVisuals.ts,  
 * SpaceInvadersCanvasVisuals.ts) — those are presentation-only and never touch  
 * this system or `IPrefabPool`. Do not conflate the two when refactoring.  
 *  
 * Registered at `SystemPhase.Presentation` in games that use it (see  
 * AsteroidsGame.ts) — it is skipped entirely in headless mode.  
 * @public  
 */  
export class ParticleSystem extends System<CoreComponentRegistry> {
  private particlePool: IPrefabPool<ParticleParams>;

  /**  
   * @param particlePool - Pool used to acquire/spawn the actual particle  
   * entities. Must be provided by the caller; there is no default pool.  
   */  
  constructor(particlePool: IPrefabPool<ParticleParams>) {
    super();
    this.particlePool = particlePool;
  }

    /**  
   * Advances all active `ParticleEmitter` entities by `deltaTime`.  
   * @remarks  
   * - No-ops during re-simulation (`world.isReSimulating`) and while paused  
   *   (`IsPaused` resource), consistent with other presentation-adjacent systems.  
   * - Skips emitters whose `SpatialNode.active === false` (culled/inactive).  
   * - Only calls `getMutableComponent` (bumping `stateVersion`) for emitters  
   *   that are actually active and enabled — resting/inactive emitters incur  
   *   zero mutation cost (see Bolt's "Guarding Mutators with Read-Only Checks"  
   *   pattern in .jules/bolt.md).  
   * - Burst emitters (`config.burst`) fire all `config.count` particles on the  
   *   first tick (`elapsed === 0`), then deactivate themselves if not looping  
   *   and `rate === 0`.  
   * - Rate-based emitters (`config.rate > 0`) spawn `floor(elapsed * rate)`  
   *   particles per tick and wrap `elapsed` modulo `1/rate` to avoid drift.  
   */  
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;
    if (world.getResource("IsPaused") === true) return;

    const emitters = world.query("ParticleEmitter");
    const len = emitters.length;

    for (let i = 0; i < len; i++) {
      const entity = emitters[i];

      const node = world.getComponent(entity, "SpatialNode");
      if (node && node.active === false) continue;

      const emitterCheck = world.getComponent(entity, "ParticleEmitter");
      if (!emitterCheck || !emitterCheck.active) continue;

      // Safe for determinism/rollback. Fetch mutable component only when we are actually going to mutate active emitter state, avoiding stateVersion updates for resting/inactive emitters.
      const emitter = world.getMutableComponent(entity, "ParticleEmitter")!;
      const config = emitter.config;

      if (emitter.elapsed === 0 && config.burst) {
        for (let j = 0; j < config.count; j++) {
          this.spawnParticle(world, config);
        }
        if (!config.loop && config.rate === 0) {
          emitter.active = false;
        }
      }

      if (config.rate > 0) {
        emitter.elapsed += deltaTime;
        const particlesToSpawn = Math.floor(emitter.elapsed * config.rate);
        for (let j = 0; j < particlesToSpawn; j++) {
          this.spawnParticle(world, config);
        }
        emitter.elapsed %= (1 / config.rate);
      } else {
        emitter.elapsed += deltaTime;
      }
    }
  }

    /**  
   * Creates a `ParticleEmitter` entity with the given config.  
   * @remarks Thin wrapper around `createEmitter` — kept as an instance method  
   * so callers holding a `ParticleSystem` reference don't need a separate import.  
   */  
  public emit(world: World<CoreComponentRegistry>, config: ParticleEmitterConfig): Entity {
    return createEmitter(world, config);
  }

    /**  
   * Spawns a single particle by sampling all randomized ranges from `config`  
   * (angle, speed, lifetime, size, color, position jitter) and acquiring an  
   * entity from `particlePool`.  
   * @remarks  
   * Uses `world.renderRandom`, not `world.gameplayRandom` — particle visuals  
   * are cosmetic and must NOT consume the gameplay RNG stream, or they would  
   * silently desync replays/rollback for any game using this system. Do not  
   * change this to `gameplayRandom` without also re-evaluating every  
   * determinism suite.  
   */  
  private spawnParticle(world: World<CoreComponentRegistry>, config: ParticleEmitterConfig): void {
    const renderRandom = world.renderRandom;

    const angleRange = config.angle || [0, 360];
    const angle = renderRandom.nextRange(angleRange[0], angleRange[1]) * (Math.PI / 180);

    const speedRange = config.speed || [0, 100];
    const speed = renderRandom.nextRange(speedRange[0], speedRange[1]);

    const lifetimeRange = config.lifetime || [1, 1];
    const lifetime = renderRandom.nextRange(lifetimeRange[0], lifetimeRange[1]);

    const sizeRange = config.size || [1, 1];
    const size = renderRandom.nextRange(sizeRange[0], sizeRange[1]);

    let color = "white";
    if (config.color) {
        if (Array.isArray(config.color)) {
            color = config.color[renderRandom.nextInt(0, config.color.length)];
        } else {
            color = config.color;
        }
    }

    let x = config.x;
    let y = config.y;

    if (config.position) {
        if (Array.isArray(config.position)) {
             x += renderRandom.nextRange(config.position[0], config.position[2]);
             y += renderRandom.nextRange(config.position[1], config.position[3]);
        } else {
             x += config.position.x;
             y += config.position.y;
        }
    }

    this.particlePool.acquire(world, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      ttl: lifetime,
    });
  }
}

/**  
 * Creates and registers a `ParticleEmitter` entity (deferred, so it's safe to  
 * call mid-tick from other systems). Config is stored as-is on the component;  
 * `elapsed` starts at 0 and `active` starts `true`.  
 * @public  
 */  
export function createEmitter(world: World<CoreComponentRegistry>, config: ParticleEmitterConfig): Entity {
  const component = {
    type: "ParticleEmitter",
    config,
    active: true,
    elapsed: 0,
  } as ParticleEmitterComponent;

  const { entity, add } = createDeferredEntity(world);
  add(component);
  return entity;
}
