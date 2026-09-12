import { World, SystemPhase } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { MissionSystem } from "../../shared/missions/MissionSystem";
import { ASTEROIDS_MISSIONS, ALL_ASTEROIDS_MISSIONS } from "../AsteroidsMissions";
import { createAsteroid } from "../EntityFactory";

describe("Asteroids Mini-Missions System", () => {
  let game: AsteroidsGame;
  let world: World<any, any>;
import { World, EventBus, ComboComponent } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { MissionSystem } from "../../shared/missions/MissionSystem";
import { ASTEROIDS_MINI_MISSIONS } from "../AsteroidsMissions";
import { ActiveMissionState } from "../../shared/missions/MissionTypes";

describe("Asteroids Minimissions Test Suite", () => {
  let game: AsteroidsGame;

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
    const world = game.getWorld();
    world.mutateSingleton("GameState", (gs) => {
      gs.readyRemaining = 0;
      gs.intermissionRemaining = 0;
    });

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
  it("should initialize AsteroidsGame with MissionSystem and ActiveMission resource at level 1", () => {
    const world = game.getWorld();
    const activeMission = world.getResource<ActiveMissionState>("ActiveMission");
    expect(activeMission).toBeDefined();
    expect(activeMission?.id).toBe("rey_del_caos");
  });

  it("1. rey_del_caos: should complete when ship stays in fragment cloud radius for 5 seconds", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "rey_del_caos")!;
    missionSystem.setActiveMission(world, mission);

    // Move active asteroids far away and freeze them so no collisions or new wave spawns occur
    const asteroids = world.query("Asteroid");
    for (const ast of asteroids) {
      world.mutateComponent(ast, "Transform", (t) => { t.x = 9999; t.y = 9999; });
      if (world.hasComponent(ast, "Velocity")) {
        world.mutateComponent(ast, "Velocity", (v) => { v.vx = 0; v.vy = 0; });
      }
    }

    // Destroy large asteroid at (100, 100)
    world.getEventBus().emit("asteroid:destroyed", { entity: 1, size: "large", x: 100, y: 100 });

    // Move ship to (110, 100) and zero velocity so it doesn't drift
    const ship = world.query("Ship")[0];
    world.mutateComponent(ship, "Transform", (t) => {
      t.x = 110;
      t.y = 100;
    });
    if (world.hasComponent(ship, "Velocity")) {
      world.mutateComponent(ship, "Velocity", (v) => {
        v.vx = 0;
        v.vy = 0;
      });
    }

    // Tick 6 seconds
    for (let i = 0; i < 6; i++) {
      world.update(1.0);
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("2. supervivencia_extrema: should complete when player survives 15s at 1 life", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "supervivencia_extrema")!;
    missionSystem.setActiveMission(world, mission);

    // Move active asteroids far away and freeze them so no collisions or new wave spawns occur
    const asteroids = world.query("Asteroid");
    for (const ast of asteroids) {
      world.mutateComponent(ast, "Transform", (t) => { t.x = 9999; t.y = 9999; });
      if (world.hasComponent(ast, "Velocity")) {
        world.mutateComponent(ast, "Velocity", (v) => { v.vx = 0; v.vy = 0; });
      }
    }

    world.mutateSingleton("GameState", (gs) => {
      gs.lives = 1;
      gs.readyRemaining = 0;
      gs.intermissionRemaining = 0;
    });

    for (let i = 0; i < 16; i++) {
      world.update(1.0);
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("3. caza_cercana: should complete when destroying a large asteroid within 100px", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "caza_cercana")!;
    missionSystem.setActiveMission(world, mission);

    const ship = world.query("Ship")[0];
    world.mutateComponent(ship, "Transform", (t) => {
      t.x = 200;
      t.y = 200;
    });

    world.getEventBus().emit("asteroid:destroyed", { entity: 1, size: "large", x: 230, y: 200 });

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("4. contra_el_reloj: should complete when destroying 6 asteroids in 20 seconds", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "contra_el_reloj")!;
    missionSystem.setActiveMission(world, mission);

    for (let i = 0; i < 6; i++) {
      world.getEventBus().emit("asteroid:destroyed", { entity: i, size: "small" });
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("5. maestro_multiplicador: should complete when multiplier reaches 5", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "maestro_multiplicador")!;
    missionSystem.setActiveMission(world, mission);

    const comboEntity = world.query("Combo")[0];
    world.mutateComponent(comboEntity, "Combo", (c: ComboComponent) => {

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

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("6. precision_bajo_presion: should complete when holding multiplier >= 3 for 8 seconds", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "precision_bajo_presion")!;
    missionSystem.setActiveMission(world, mission);

    const comboEntity = world.query("Combo")[0];
    world.mutateComponent(comboEntity, "Combo", (c: ComboComponent) => {
      c.multiplier = 3;
    });

    for (let i = 0; i < 8; i++) {
      world.update(1.0);
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("7. cazador_nucleos: should complete after destroying 5 asteroids and collecting 2 power-ups", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "cazador_nucleos")!;
    missionSystem.setActiveMission(world, mission);

    for (let i = 0; i < 5; i++) {
      world.getEventBus().emit("asteroid:destroyed", { entity: i, size: "small" });
    }
    world.getEventBus().emit("powerup:collected", {});
    world.getEventBus().emit("powerup:collected", {});

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("8. nave_fantasma: should complete when surviving 15s without firing", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "nave_fantasma")!;
    missionSystem.setActiveMission(world, mission);

    // Move active asteroids far away and freeze them so no collisions or new wave spawns occur
    const asteroids = world.query("Asteroid");
    for (const ast of asteroids) {
      world.mutateComponent(ast, "Transform", (t) => { t.x = 9999; t.y = 9999; });
      if (world.hasComponent(ast, "Velocity")) {
        world.mutateComponent(ast, "Velocity", (v) => { v.vx = 0; v.vy = 0; });
      }
    }

    for (let i = 0; i < 15; i++) {
      world.update(1.0);
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("9. bailarin_espacial: should complete after 3 hyperspace uses", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "bailarin_espacial")!;
    missionSystem.setActiveMission(world, mission);

    for (let i = 0; i < 3; i++) {
      world.getEventBus().emit("hyperspace:used", {});
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("10. doble_amenaza: should complete when destroying UFO + large asteroid (or fallback 2 large asteroids)", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "doble_amenaza")!;
    missionSystem.setActiveMission(world, mission);

    world.getEventBus().emit("combat:death", { entityType: "Ufo", isUfo: true });
    world.getEventBus().emit("asteroid:destroyed", { entity: 1, size: "large" });

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("11. escudo_perfecto: should complete when surviving full shield duration with a hit absorbed", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "escudo_perfecto")!;
    missionSystem.setActiveMission(world, mission);

    const ship = world.query("Ship")[0];
    world.addComponent(ship, {
      type: "Invulnerable",
      remaining: 5.0
    });

    world.getEventBus().emit("ship:hit", {});

    for (let i = 0; i < 5; i++) {
      world.update(1.0);
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("12. escudo_ofensivo: should complete when destroying 3 asteroids while Invulnerable", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "escudo_ofensivo")!;
    missionSystem.setActiveMission(world, mission);

    const ship = world.query("Ship")[0];
    world.addComponent(ship, {
      type: "Invulnerable",
      remaining: 5.0
    });

    for (let i = 0; i < 3; i++) {
      world.getEventBus().emit("asteroid:destroyed", { entity: i, size: "small" });
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });
});
