import { World, SystemPhase } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { MissionSystem } from "../../shared/missions/MissionSystem";
import { ASTEROIDS_MISSIONS, ALL_ASTEROIDS_MISSIONS } from "../AsteroidsMissions";
import { createAsteroid } from "../EntityFactory";

describe("Asteroids Mini-Missions System", () => {
  let game: AsteroidsGame;
  let world: World<any, any>;

  beforeEach(async () => {
    game = new AsteroidsGame({
      headless: true,
      gameOptions: { mode: "deathmatch" }
    });
    await game.init();
    world = game.world;

    // Remove initial wave asteroids completely to prevent collision interference in isolated mission tests
    const initialAsteroids = world.query("Asteroid");
    for (const ast of initialAsteroids) {
      world.getCommandBuffer().removeEntity(ast);
    }
    world.update(0);
  });

  afterEach(() => {
    game.destroy();
  });

  it("should initialize Level 1 with active MissionSystem and trackable mission", () => {
    game.start();
    const activeMission = world.getResource("ActiveMission") as any;
    expect(activeMission).toBeDefined();
    expect(activeMission.definition.id).toBe(ALL_ASTEROIDS_MISSIONS[0].id);
    expect(activeMission.completed).toBe(false);
  });

  it("should complete 'Maestro del Multiplicador' when combo multiplier reaches x5", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.mult_master);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    let completedEventEmitted = false;
    world.getEventBus().on("mission:completed", (payload: any) => {
      if (payload.missionId === "mult_master") {
        completedEventEmitted = true;
      }
    });

    const comboEntity = world.query("Combo")[0];
    expect(comboEntity).toBeDefined();

    world.mutateComponent(comboEntity, "Combo", (c: any) => {
      c.multiplier = 5;
    });

    world.update(0.1);
    world.getEventBus().flushDeferred();

    expect(missionSys.getActiveMission()?.completed).toBe(true);
    expect(completedEventEmitted).toBe(true);
  });

  it("should complete 'Precisión Bajo Presión' after holding x3 multiplier for 10 seconds", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.precision_pressure);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    const comboEntity = world.query("Combo")[0];
    world.mutateComponent(comboEntity, "Combo", (c: any) => {
      c.combo = 10;
      c.multiplier = 3;
      c.timerRemaining = 999.0;
    });

    world.update(5.0);
    expect(missionSys.getActiveMission()?.completed).toBe(false);

    world.update(5.1);
    world.getEventBus().flushDeferred();

    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should complete 'Cazador de Núcleos' when 8 asteroids destroyed and 2 powerups collected", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.core_hunter);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    const eventBus = world.getEventBus();

    for (let i = 0; i < 8; i++) {
      eventBus.emit("asteroid:destroyed", { entity: 99 + i, size: "medium" });
    }
    expect(missionSys.getActiveMission()?.completed).toBe(false);

    eventBus.emit("powerup:collected", { powerUpType: "shield" });
    eventBus.emit("powerup:collected", { powerUpType: "shield" });

    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should complete 'Caza Cercana' when large asteroid destroyed within 80 units of ship", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.close_hunt);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    const ship = world.query("Ship")[0];
    world.mutateComponent(ship, "Transform", (t: any) => {
      t.x = 400;
      t.y = 300;
    });

    world.gameplayRandom.unlock();
    let ast: number;
    try {
      ast = createAsteroid({ world: world as any, x: 420, y: 300, size: "large", vx: 0, vy: 0 });
    } finally {
      world.gameplayRandom.lock();
    }

    world.getEventBus().emit("asteroid:destroyed", { entity: ast, size: "large" });

    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should complete 'Rey del Caos' when remaining in fragment cloud for 3 seconds", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.chaos_king);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    const ship = world.query("Ship")[0];
    world.mutateComponent(ship, "Transform", (t: any) => {
      t.x = 400;
      t.y = 300;
    });
    world.mutateComponent(ship, "Velocity", (v: any) => {
      v.vx = 0;
      v.vy = 0;
    });

    world.gameplayRandom.unlock();
    try {
      createAsteroid({ world: world as any, x: 400, y: 300, size: "medium", vx: 0, vy: 0 });
    } finally {
      world.gameplayRandom.lock();
    }

    world.update(1.5);
    expect(missionSys.getActiveMission()?.completed).toBe(false);

    world.update(1.6);
    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should complete 'Supervivencia Extrema' after surviving 15s at 1 life, or fail if lives reach 0", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.extreme_survival);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    world.mutateSingleton("GameState", (gs: any) => {
      gs.lives = 1;
    });

    world.update(10.0);
    expect(missionSys.getActiveMission()?.completed).toBe(false);

    world.update(5.1);
    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should fail 'Contra el Reloj' when time limit expires before score target", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.against_clock);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    world.update(30.1);

    expect(missionSys.getActiveMission()?.failed).toBe(true);
  });

  it("should complete 'Nave Fantasma' after surviving 20s without shooting", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.ghost_ship);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    world.update(15.0);
    expect(missionSys.getActiveMission()?.completed).toBe(false);

    world.update(5.1);
    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should complete 'Doble Amenaza' when UFO and large asteroid destroyed within 10s", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.double_threat);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    const eventBus = world.getEventBus();

    eventBus.emit("ufo:destroyed", { entity: 50 });
    world.update(2.0);
    eventBus.emit("asteroid:destroyed", { entity: 51, size: "large" });

    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should complete 'Escudo Ofensivo' when destroying 3 asteroids while Invulnerable", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.offensive_shield);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    const ship = world.query("Ship")[0];
    world.addComponent(ship, { type: "Invulnerable", remaining: 5.0 } as any);

    const eventBus = world.getEventBus();

    eventBus.emit("asteroid:destroyed", { entity: 1, size: "large" });
    expect(missionSys.getActiveMission()?.currentCount).toBe(1);

    eventBus.emit("asteroid:destroyed", { entity: 2, size: "medium" });
    expect(missionSys.getActiveMission()?.currentCount).toBe(2);
    expect(missionSys.getActiveMission()?.completed).toBe(false);

    eventBus.emit("asteroid:destroyed", { entity: 3, size: "small" });
    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });

  it("should complete 'Escudo Perfecto' when taking a hit with active shield and surviving", () => {
    const missionSys = new MissionSystem(ASTEROIDS_MISSIONS.perfect_shield);
    world.addSystem(missionSys, { phase: SystemPhase.GameRules });

    const ship = world.query("Ship")[0];
    world.addComponent(ship, { type: "Invulnerable", remaining: 1.0 } as any);

    world.update(0.1);

    // Simulate blocked hit while shield active
    const active = missionSys.getActiveMission();
    if (active) {
      active.customState.wasShieldActive = true;
      active.customState.blockedHit = true;
    }

    // Remove invulnerable component to simulate shield expiration
    world.removeComponent(ship, "Invulnerable" as any);

    world.update(0.1);
    expect(missionSys.getActiveMission()?.completed).toBe(true);
  });
});
