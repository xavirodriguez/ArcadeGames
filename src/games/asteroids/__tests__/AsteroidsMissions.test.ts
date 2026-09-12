import { World, ComboComponent } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
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
    const world = game.getWorld();
    world.mutateSingleton("GameState", (gs) => {
      gs.readyRemaining = 0;
      gs.intermissionRemaining = 0;
    });
  });

  afterEach(() => {
    game.destroy();
  });

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

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("6. precision_bajo_presion: should complete when holding multiplier >= 3 for 8 seconds", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = ASTEROIDS_MINI_MISSIONS.find((m) => m.id === "precision_bajo_presion")!;
    missionSystem.setActiveMission(world, mission);

    // Move active asteroids far away and freeze them so no collisions or combo resets occur
    const asteroids = world.query("Asteroid");
    for (const ast of asteroids) {
      world.mutateComponent(ast, "Transform", (t) => { t.x = 9999; t.y = 9999; });
      if (world.hasComponent(ast, "Velocity")) {
        world.mutateComponent(ast, "Velocity", (v) => { v.vx = 0; v.vy = 0; });
      }
    }

    const comboEntity = world.query("Combo")[0];
    world.mutateComponent(comboEntity, "Combo", (c: ComboComponent) => {
      c.multiplier = 3;
      c.timerRemaining = 999.0;
    });

    for (let i = 0; i < 8; i++) {
      world.mutateComponent(comboEntity, "Combo", (c: ComboComponent) => {
        c.multiplier = 3;
        c.timerRemaining = 999.0;
      });
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
