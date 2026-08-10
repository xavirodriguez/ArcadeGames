import { BaseGame } from "../src/runtime/BaseGame";
import { World } from "../src/ecs/World";
import { ComponentRegistry } from "../src/ecs/Component";
import { CompactInputFrame } from "../src/input/InputFrame";

interface TestState {
  score: number;
}

class DeterministicTestGame extends BaseGame<TestState, any> {
  constructor(seed: number) {
    super({
      gameOptions: { seed }
    });
    // Mock the game loop to avoid background intervals during Jest tests
    this.loop = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      subscribeUpdate: jest.fn(),
      subscribeRender: jest.fn()
    } as any;
  }

  public override update(dt: number): void {
    // Standard update
  }

  protected override async onRegisterSystems(): Promise<void> {
    // Add custom component metadata and test system
    this.world.registerComponentMetadata("TestPosition", { allowMutationDuringUpdate: true });

    this.world.addSystem({
      onRegister: () => {},
      update: (world, dt) => {
        const entities = world.query("TestPosition" as any);
        for (const entity of entities) {
          world.mutateComponent(entity, "TestPosition" as any, (comp: any) => {
            // Procedural movement using deterministic gameplay random
            const offset = world.gameplayRandom.range(-5, 5);
            comp.x += offset;
          });
        }
      },
      dispose: () => {}
    });
  }

  protected override async onInitializeEntities(): Promise<void> {
    const { entity, add } = this.createBaseEntity();
    add({ type: "TestPosition" as any, x: 100 } as any);
  }

  public override getGameState(): TestState {
    return { score: 0 };
  }

  public override isGameOver(): boolean {
    return false;
  }
}

describe("Golden determinism tests for TinyAster ECS", () => {
  it("should yield identical hashes for identical simulations", async () => {
    // Run A
    const gameA = new DeterministicTestGame(12345);
    await gameA.init();

    // Run B
    const gameB = new DeterministicTestGame(12345);
    await gameB.init();

    // Assert initial hashes are equal
    expect(gameA.hash()).toBe(gameB.hash());

    // Generate mock inputs
    const inputs: CompactInputFrame[] = [
      { t: 1, b: 1 },
      { t: 2, b: 0 },
      { t: 3, b: 2 },
      { t: 4, b: 1 },
      { t: 5, b: 0 }
    ];

    // Simulate 5 steps on both
    for (const input of inputs) {
      gameA.step(input);
      gameB.step(input);
    }

    // Assert final hashes and components are identical after simulation
    expect(gameA.hash()).toBe(gameB.hash());

    const entA = gameA.world.query("TestPosition" as any)[0];
    const entB = gameB.world.query("TestPosition" as any)[0];
    const compA = gameA.world.getComponent(entA, "TestPosition" as any) as any;
    const compB = gameB.world.getComponent(entB, "TestPosition" as any) as any;

    expect(compA.x).toBe(compB.x);
  });

  it("should diverge and yield different hashes for different seeds", async () => {
    const gameA = new DeterministicTestGame(11111);
    await gameA.init();

    const gameB = new DeterministicTestGame(22222);
    await gameB.init();

    const inputs: CompactInputFrame[] = [
      { t: 1, b: 1 },
      { t: 2, b: 0 }
    ];

    for (const input of inputs) {
      gameA.step(input);
      gameB.step(input);
    }

    expect(gameA.hash()).not.toBe(gameB.hash());
  });
});
