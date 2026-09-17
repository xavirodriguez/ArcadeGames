import { World, ComboComponent } from "@tiny-aster/core";
import { FlappyBirdGame } from "../FlappyBirdGame";
import { FLAPPY_BIRD_MINI_MISSIONS } from "../FlappyBirdMissions";
import { ActiveMissionState } from "../../shared/missions/MissionTypes";

describe("Flappy Bird Mini-Missions Test Suite", () => {
  let game: FlappyBirdGame;

  beforeEach(async () => {
    game = new FlappyBirdGame({
      gameOptions: { seed: 12345 }
    });
    await game.init();
  });

  afterEach(() => {
    game.destroy();
  });

  it("should initialize FlappyBirdGame with MissionSystem and ActiveMission resource", () => {
    const world = game.getWorld();
    const activeMission = world.getResource<ActiveMissionState>("ActiveMission");
    expect(activeMission).toBeDefined();
    expect(activeMission?.id).toBe("racha_near_miss");
  });

  it("1. racha_near_miss: should complete upon 3 flappy:near_miss events", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "racha_near_miss")!;
    missionSystem.setActiveMission(world, mission);

    const bus = world.getEventBus();
    bus.emit("flappy:near_miss", {});
    bus.emit("flappy:near_miss", {});
    bus.emit("flappy:near_miss", {});

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("2. vuelo_puro: should complete after 10 pipe:passed events without gliding", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "vuelo_puro")!;
    missionSystem.setActiveMission(world, mission);

    const bus = world.getEventBus();
    for (let i = 0; i < 10; i++) {
      bus.emit("pipe:passed", {});
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("2. vuelo_puro: should fail if bird activates isGliding", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "vuelo_puro")!;
    missionSystem.setActiveMission(world, mission);

    const bird = world.query("Bird")[0];
    world.mutateComponent(bird, "Bird", (b) => {
      b.isGliding = true;
    });

    missionSystem.update(world, 0.1);

    const state = missionSystem.getActiveMission();
    expect(state?.failed).toBe(true);
  });

  it("3. maestro_combo: should complete when combo multiplier reaches x4", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "maestro_combo")!;
    missionSystem.setActiveMission(world, mission);

    const combo = world.query("Combo")[0];
    world.mutateComponent(combo, "Combo", (c: ComboComponent) => {
      c.multiplier = 4;
    });

    world.update(0.1);

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("4. superviviente_sector: should complete when flappy:sector_event_ended is emitted", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "superviviente_sector")!;
    missionSystem.setActiveMission(world, mission);

    world.getEventBus().emit("flappy:sector_event_ended", { event: "solar_flare" });

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("5. cazador_laser: should complete after crossing 3 laser gates", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "cazador_laser")!;
    missionSystem.setActiveMission(world, mission);

    const bus = world.getEventBus();
    bus.emit("pipe:passed", { movementType: "laser_gate" });
    bus.emit("pipe:passed", { movementType: "laser_gate" });
    bus.emit("pipe:passed", { movementType: "laser_gate" });

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("6. precision_estrecha: should complete after crossing 2 narrow gap pipes", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "precision_estrecha")!;
    missionSystem.setActiveMission(world, mission);

    const bus = world.getEventBus();
    bus.emit("pipe:passed", { isNarrowGap: true });
    bus.emit("pipe:passed", { isNarrowGap: true });

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("7. resistencia_vuelo: should complete after surviving 20 continuous seconds", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "resistencia_vuelo")!;
    missionSystem.setActiveMission(world, mission);

    const bird = world.query("Bird")[0];
    for (let i = 0; i < 20; i++) {
      if (bird) {
        world.mutateComponent(bird, "Transform", (t) => { t.y = 300; });
        world.mutateComponent(bird, "Velocity", (v) => { v.vy = 0; });
      }
      world.update(1.0);
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("8. planeo_tactico: should complete after holding glide for 5 seconds cumulatively", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "planeo_tactico")!;
    missionSystem.setActiveMission(world, mission);

    const bird = world.query("Bird")[0];
    world.mutateComponent(bird, "Bird", (b) => {
      b.isGliding = true;
    });

    for (let i = 0; i < 5; i++) {
      missionSystem.update(world, 1.0);
    }

    const state = missionSystem.getActiveMission();
    expect(state?.completed).toBe(true);
  });

  it("should maintain plain serializable customData state suitable for snapshot restore", () => {
    const world = game.getWorld();
    const missionSystem = game.getMissionSystem();
    const mission = FLAPPY_BIRD_MINI_MISSIONS.find((m) => m.id === "resistencia_vuelo")!;
    missionSystem.setActiveMission(world, mission);

    const state = missionSystem.getActiveMission();
    expect(state).toBeDefined();

    // Verify all keys in customData are plain serializable values
    if (state?.customData) {
      const json = JSON.stringify(state.customData);
      expect(JSON.parse(json)).toEqual(state.customData);
    }
  });
});
