import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEventRegistry, GalaxianEnemyComponent, FormationComponent, GalaxianStateComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { PathPatternsSystem, createPathPattern, PathPatternComponent } from "../../shared/PathPatternsSystem";

export class DiveSystem extends System<GalaxianComponentRegistry, GalaxianEventRegistry> {
  private pathPatternsSystem: PathPatternsSystem;

  constructor() {
    super();
    this.pathPatternsSystem = new PathPatternsSystem();
  }

  public update(world: World<GalaxianComponentRegistry, GalaxianEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const config = world.getResource<GalaxianConfig>("GameConfig");
    if (!config) return;

    const stateEntities = world.query("GameState");
    if (stateEntities.length === 0) return;
    const state = world.getMutableComponent(stateEntities[0], "GameState") as GalaxianStateComponent | undefined;
    if (!state) return;

    const formationEntities = world.query("Formation");
    if (formationEntities.length === 0) return;
    const formation = world.getComponent(formationEntities[0], "Formation") as FormationComponent | undefined;
    if (!formation) return;

    // 1. Process active enemy states (windup, diving, returning)
    const enemyEntities = world.query("GalaxianEnemy", "Transform");
    let activeDives = 0;

    for (const entity of enemyEntities) {
      const enemy = world.getMutableComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
      const transform = world.getMutableComponent(entity, "Transform");
      if (!enemy || !transform) continue;

      if (enemy.state === "windup") {
        activeDives++;
        enemy.windupTimer -= deltaTime;
        if (enemy.windupTimer <= 0) {
          enemy.state = "diving";
          const pathDef = config.dive.paths.find((p) => p.id === enemy.pathId) || config.dive.paths[0];

          // Compute absolute waypoints from current enemy start position
          const startX = transform.x;
          const startY = transform.y;
          const waypoints = pathDef.waypoints.map((wp) => ({
            x: startX + wp.x,
            y: startY + wp.y,
          }));

          world.commands.addComponent(entity, createPathPattern({
            pattern: "waypoints",
            originX: startX,
            originY: startY,
            speed: pathDef.speed,
            waypoints,
            loop: false,
          }));
        }
      } else if (enemy.state === "diving") {
        activeDives++;
        // Check if dive completed or entity went below bottom screen
        if (transform.y > config.worldHeight + 30) {
          // Screen bottom wrap - re-enter from top
          transform.y = -30;
          enemy.state = "returning";
          world.commands.removeComponent(entity, "PathPattern");
        } else {
          const pattern = world.getComponent(entity, "PathPattern") as PathPatternComponent | undefined;
          if (pattern && pattern.waypoints && (pattern.currentWaypointIndex ?? 0) >= pattern.waypoints.length - 1) {
            const lastWp = pattern.waypoints[pattern.waypoints.length - 1];
            if (Math.hypot(lastWp.x - transform.x, lastWp.y - transform.y) < 5) {
              enemy.state = "returning";
              world.commands.removeComponent(entity, "PathPattern");
            }
          }
        }
      } else if (enemy.state === "returning") {
        activeDives++;
        const slot = formation.slots[enemy.slotId];
        if (slot) {
          const targetX = formation.originX + formation.currentOscillationX + slot.x;
          const targetY = formation.originY + slot.y;

          const dx = targetX - transform.x;
          const dy = targetY - transform.y;
          const dist = Math.hypot(dx, dy);
          const returnSpeed = 260;
          const step = returnSpeed * deltaTime;

          if (dist <= step || dist < 2) {
            transform.x = targetX;
            transform.y = targetY;
            transform.rotation = Math.PI;
            enemy.state = "in_slot";
            enemy.shotsFiredInDive = 0;
            enemy.leaderEntity = undefined;
            enemy.isEscortLeader = undefined;
          } else {
            transform.x += (dx / dist) * step;
            transform.y += (dy / dist) * step;
            transform.rotation = Math.atan2(dy, dx) + Math.PI / 2;
          }
          transform.dirty = true;
        } else {
          enemy.state = "in_slot";
        }
      }
    }

    state.activeDivesCount = activeDives;

    // 2. Drive waypoints system for diving entities
    this.pathPatternsSystem.update(world, deltaTime);

    // 3. Dive Scheduler: trigger new dives if under max limit
    state.diveTimer -= deltaTime;
    const maxConcurrentCap = config.wave?.maxConcurrentDivesCap ?? 6;
    const maxConcurrent = Math.min(
      maxConcurrentCap,
      Math.floor(config.dive.maxConcurrentDives * Math.pow(config.wave.speedMultiplierPerWave, state.level - 1))
    );

    if (state.diveTimer <= 0 && activeDives < maxConcurrent) {
      state.diveTimer = (config.dive.intervalMs / 1000) * Math.pow(config.wave.diveIntervalMultiplierPerWave, state.level - 1);

      // Find enemies in slot available for dive
      const candidateEntities: number[] = [];
      for (const e of enemyEntities) {
        const enemy = world.getComponent(e, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
        if (enemy && enemy.state === "in_slot") {
          candidateEntities.push(e);
        }
      }

      if (candidateEntities.length > 0) {
        // Pick candidate using gameplay random
        const idx = Math.floor(world.gameplayRandom.next() * candidateEntities.length);
        const selectedEntity = candidateEntities[idx];
        const selectedEnemy = world.getMutableComponent(selectedEntity, "GalaxianEnemy") as GalaxianEnemyComponent;

        if (selectedEnemy) {
          const paths = config.dive.paths;
          const pathIdx = Math.floor(world.gameplayRandom.next() * paths.length);
          const chosenPath = paths[pathIdx].id;

          selectedEnemy.state = "windup";
          selectedEnemy.windupTimer = config.dive.windupMs / 1000;
          selectedEnemy.pathId = chosenPath;

          // Flagship group dive check
          if (selectedEnemy.enemyType === "flagship" && world.gameplayRandom.next() < config.dive.escortGroupChance) {
            // Find up to 2 escorts in_slot
            const escorts = candidateEntities.filter((e) => {
              const comp = world.getComponent(e, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
              return comp && comp.enemyType === "escort" && comp.state === "in_slot";
            });

            for (let i = 0; i < Math.min(2, escorts.length); i++) {
              const escortEnt = escorts[i];
              const escortComp = world.getMutableComponent(escortEnt, "GalaxianEnemy") as GalaxianEnemyComponent;
              if (escortComp) {
                escortComp.state = "windup";
                escortComp.windupTimer = config.dive.windupMs / 1000;
                escortComp.pathId = chosenPath;
                escortComp.leaderEntity = selectedEntity;
              }
            }
          }
        }
      }
    }
  }
}
