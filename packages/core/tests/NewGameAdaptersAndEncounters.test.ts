import {
  spaceInvadersInvasionEncounter,
  SpaceInvadersArcadeAdapter
} from "../../../src/games/space-invaders/story/InvasionEncounter";
import {
  geometryWarsOverdriveEncounter,
  GeometryWarsArcadeAdapter
} from "../../../src/games/geometrywars/story/GeometryWarsEncounter";
import {
  pongChampionshipEncounter,
  PongArcadeAdapter
} from "../../../src/games/pong/story/PongEncounter";
import {
  flappyBirdEscapeEncounter,
  FlappyBirdArcadeAdapter
} from "../../../src/games/flappybird/story/FlappyBirdEncounter";
import {
  echoRunnerDashEncounter,
  EchoRunnerArcadeAdapter
} from "../../../src/games/echorunner/story/EchoRunnerEncounter";
import {
  platformerRunEncounter,
  PlatformerArcadeAdapter
} from "../../../src/games/platformer/story/PlatformerEncounter";
import {
  MiniGameModifierResolver,
  StoryRuntimeSnapshot,
  ArcadeOrchestrator,
  MiniGameResult
} from "../src";

describe("New Minigame Encounter & Adapter Coverage Suite", () => {
  const resolver = new MiniGameModifierResolver();

  it("resolves Space Invaders modifiers and emits result correctly", (done) => {
    const snapshot: StoryRuntimeSnapshot = {
      graphId: "g1",
      currentNodeId: "n1",
      flags: { defenseUpgraded: true, intelGathered: true },
      variables: { energy: 30 },
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: ["n1"]
    };

    const modifiers = resolver.resolve(snapshot, spaceInvadersInvasionEncounter);
    expect(modifiers).toHaveLength(3);
    expect(modifiers.some((m) => m.targetProperty === "extraLives" && m.value === -1)).toBe(true);
    expect(modifiers.some((m) => m.targetProperty === "fireRateMultiplier" && m.value === 1.25)).toBe(true);

    const orchestrator = new ArcadeOrchestrator();
    const context = orchestrator.startRun(spaceInvadersInvasionEncounter, snapshot);

    const adapter = new SpaceInvadersArcadeAdapter();
    adapter.onResult((res: MiniGameResult) => {
      expect(res.runId).toBe(context.runId);
      expect(res.completed).toBe(true);
      expect(res.secretsFound).toContain("mothership_transmissions");
      adapter.dispose();
      done();
    });

    const dummyHost = {} as HTMLElement;
    adapter.initialize(context, dummyHost);
    adapter.emitResult(context, { score: 2500, completed: true, foundTransmissions: true });
  });

  it("resolves Geometry Wars modifiers and emits result correctly", (done) => {
    const snapshot: StoryRuntimeSnapshot = {
      graphId: "g1",
      currentNodeId: "n1",
      flags: { coreOverclocked: true, thrustersUpgraded: true },
      variables: { bombsAvailable: 2 },
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: ["n1"]
    };

    const modifiers = resolver.resolve(snapshot, geometryWarsOverdriveEncounter);
    expect(modifiers).toHaveLength(3);
    expect(modifiers.some((m) => m.targetProperty === "bombCount" && m.value === 3)).toBe(true);

    const orchestrator = new ArcadeOrchestrator();
    const context = orchestrator.startRun(geometryWarsOverdriveEncounter, snapshot);

    const adapter = new GeometryWarsArcadeAdapter();
    adapter.onResult((res: MiniGameResult) => {
      expect(res.runId).toBe(context.runId);
      expect(res.score).toBe(6000);
      expect(res.secretsFound).toContain("quantum_singularity_core");
      adapter.dispose();
      done();
    });

    const dummyHost = {} as HTMLElement;
    adapter.initialize(context, dummyHost);
    adapter.emitResult(context, { score: 6000, completed: true, foundQuantumCore: true });
  });

  it("resolves Pong modifiers and emits result correctly", (done) => {
    const snapshot: StoryRuntimeSnapshot = {
      graphId: "g1",
      currentNodeId: "n1",
      flags: { paddleCalibrated: true, seededPlayer: true },
      variables: {},
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: ["n1"]
    };

    const modifiers = resolver.resolve(snapshot, pongChampionshipEncounter);
    expect(modifiers).toHaveLength(2);

    const orchestrator = new ArcadeOrchestrator();
    const context = orchestrator.startRun(pongChampionshipEncounter, snapshot);

    const adapter = new PongArcadeAdapter();
    adapter.onResult((res: MiniGameResult) => {
      expect(res.runId).toBe(context.runId);
      expect(res.metrics.playerScore).toBe(5);
      expect(res.secretsFound).toContain("prototype_paddle_schematic");
      adapter.dispose();
      done();
    });

    const dummyHost = {} as HTMLElement;
    adapter.initialize(context, dummyHost);
    adapter.emitResult(context, { playerScore: 5, opponentScore: 0, completed: true, foundSchematic: true });
  });

  it("resolves Flappy Bird modifiers and emits result correctly", (done) => {
    const snapshot: StoryRuntimeSnapshot = {
      graphId: "g1",
      currentNodeId: "n1",
      flags: { gravitySuppressed: true, mapScouted: true },
      variables: {},
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: ["n1"]
    };

    const modifiers = resolver.resolve(snapshot, flappyBirdEscapeEncounter);
    expect(modifiers).toHaveLength(2);

    const orchestrator = new ArcadeOrchestrator();
    const context = orchestrator.startRun(flappyBirdEscapeEncounter, snapshot);

    const adapter = new FlappyBirdArcadeAdapter();
    adapter.onResult((res: MiniGameResult) => {
      expect(res.runId).toBe(context.runId);
      expect(res.completed).toBe(true);
      expect(res.secretsFound).toContain("golden_feather_artifact");
      adapter.dispose();
      done();
    });

    const dummyHost = {} as HTMLElement;
    adapter.initialize(context, dummyHost);
    adapter.emitResult(context, { score: 12, completed: true, foundFeather: true });
  });

  it("resolves Echo Runner modifiers and emits result correctly", (done) => {
    const snapshot: StoryRuntimeSnapshot = {
      graphId: "g1",
      currentNodeId: "n1",
      flags: { timeDilationActive: true, legsAugmented: true },
      variables: {},
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: ["n1"]
    };

    const modifiers = resolver.resolve(snapshot, echoRunnerDashEncounter);
    expect(modifiers).toHaveLength(2);

    const orchestrator = new ArcadeOrchestrator();
    const context = orchestrator.startRun(echoRunnerDashEncounter, snapshot);

    const adapter = new EchoRunnerArcadeAdapter();
    adapter.onResult((res: MiniGameResult) => {
      expect(res.runId).toBe(context.runId);
      expect(res.completed).toBe(true);
      expect(res.secretsFound).toContain("memory_core_fragment_01");
      adapter.dispose();
      done();
    });

    const dummyHost = {} as HTMLElement;
    adapter.initialize(context, dummyHost);
    adapter.emitResult(context, { score: 1800, completed: true, foundMemoryFragment: true });
  });

  it("resolves Platformer modifiers and emits result correctly", (done) => {
    const snapshot: StoryRuntimeSnapshot = {
      graphId: "g1",
      currentNodeId: "n1",
      flags: { antiGravBoots: true },
      variables: { rationsCollected: 1 },
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: ["n1"]
    };

    const modifiers = resolver.resolve(snapshot, platformerRunEncounter);
    expect(modifiers).toHaveLength(2);

    const orchestrator = new ArcadeOrchestrator();
    const context = orchestrator.startRun(platformerRunEncounter, snapshot);

    const adapter = new PlatformerArcadeAdapter();
    adapter.onResult((res: MiniGameResult) => {
      expect(res.runId).toBe(context.runId);
      expect(res.completed).toBe(true);
      expect(res.secretsFound).toContain("ancient_relic_cache");
      adapter.dispose();
      done();
    });

    const dummyHost = {} as HTMLElement;
    adapter.initialize(context, dummyHost);
    adapter.emitResult(context, { score: 1200, completed: true, foundRelicCache: true });
  });
});
