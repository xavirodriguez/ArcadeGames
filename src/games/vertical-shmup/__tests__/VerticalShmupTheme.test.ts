import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemy } from "../EntityFactory";
import { selectShmupEnemyArchetype } from "../EnemyArchetypes";
import { BIOMES, SHMUP_SUMI_E_THEME, computeShmupParallaxWorld, computeSumiEBackdrop, resolveShmupEnemyDrawContext } from "../rendering/ShmupVisualHelpers";

describe("Vertical Shmup theme contracts", () => {
  let game: VerticalShmupGame;

  beforeEach(async () => {
    game = new VerticalShmupGame({ headless: true, manualLoop: true });
    await game.init();
    game.update(0);
  });

  afterEach(() => {
    game.destroy();
  });


  it("defines a semantic Sumi-e theme and a deterministic, edge-weighted backdrop", () => {
    expect(SHMUP_SUMI_E_THEME.id).toBe("sumi-e");
    expect(SHMUP_SUMI_E_THEME.palette.paper).toBe("#E7DFCB");
    expect(SHMUP_SUMI_E_THEME.palette.player).toBe("#4DA3FF");
    expect(SHMUP_SUMI_E_THEME.palette.threatCritical).toBe("#FF3B30");
    expect(SHMUP_SUMI_E_THEME.layers).toEqual([
      "paper", "sun", "mist", "mountains", "structures", "foreground"
    ]);

    game.world.setResource("ShmupVisualTheme", "sumi-e");
    const first = computeSumiEBackdrop(game.world);
    const second = computeSumiEBackdrop(game.world);
    expect(first.ridges).toEqual(second.ridges);
    expect(first.paperFibers).toEqual(second.paperFibers);
    expect(first.ridges).toHaveLength(4);
    expect(first.paperFibers.length).toBeGreaterThan(0);
    expect(first.palette.ink).toBe("#151515");
  });

  it("selects Sumi-e by default without changing the gameplay state contract", () => {
    expect(game.world.getResource<string>("ShmupVisualTheme")).toBe("sumi-e");
    expect(game.getGameState().lives).toBe(3);
  });

  it("keeps enemy silhouette identity independent from its movement path", () => {
    const world = game.world;
    const enemy = createEnemy(world, 200, 220, "sine", 1, "armored");
    const path = world.getComponent(enemy, "EnemyPath");
    const component = world.getComponent(enemy, "ShmupEnemy");
    const drawContext = resolveShmupEnemyDrawContext(world, enemy);

    expect(path?.kind).toBe("sine");
    expect(component?.archetype).toBe("armored");
    expect(drawContext?.archetype).toBe("armored");
  });

  it("assigns visual archetypes from wave and spawn slot, with no movement input", () => {
    expect(selectShmupEnemyArchetype(1, 0)).toBe("scout");
    expect(selectShmupEnemyArchetype(1, 1)).toBe("interceptor");
    expect(selectShmupEnemyArchetype(1, 2)).toBe("armored");
    expect(selectShmupEnemyArchetype(1, 3)).toBe("support");
    expect(selectShmupEnemyArchetype(4, 0)).toBe("boss");
    expect(selectShmupEnemyArchetype(4, 1)).not.toBe("boss");
  });

  it("defines four distinct background treatments with deterministic parallax budgets", () => {
    const worlds = [1, 2, 3, 4].map((wave) => {
      game.world.mutateSingleton("ShmupGameState", (state) => {
        state.wave = wave;
      });
      return computeShmupParallaxWorld(game.world);
    });

    expect(worlds.map((data) => data.biome.id)).toEqual([
      "archipelago",
      "gardens",
      "temples",
      "storm"
    ]);
    expect(new Set(worlds.map((data) => data.biome.atmosphereStyle)).size).toBe(4);
    expect(new Set(worlds.map((data) => data.biome.islandStyle)).size).toBe(3);
    for (const data of worlds) {
      expect(data.clouds).toHaveLength(12);
      expect(data.islands).toHaveLength(6);
      expect(data.particles).toHaveLength(15);
      expect(Number.isFinite(data.biome.cloudOpacity)).toBe(true);
      expect(data.biome.cloudOpacity).toBeGreaterThan(0);
      expect(data.biome.cloudOpacity).toBeLessThanOrEqual(1);
    }
    expect(BIOMES.storm.glowColor).not.toBe(BIOMES.archipelago.glowColor);
  });
});
