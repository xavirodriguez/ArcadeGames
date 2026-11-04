import { GameLifecycleState } from "@tiny-aster/core";
import type { CompactInputFrame } from "@tiny-aster/core";

/**
 * Minimal public contract required from a game under the shared lifecycle tests.
 * Keep this interface aligned with BaseGame rather than game-specific implementation details.
 */
export interface GameContractInstance {
  readonly tick: number;
  init(): Promise<void>;
  destroy(): void;
  getLifecycleState(): GameLifecycleState;
  getSeed(): number;
  hash(): string;
  isPausedState(): boolean;
  pause(): void;
  resume(): void;
  restart(seed?: number): Promise<void>;
  step(input: CompactInputFrame): void;
}

/** Creates one game instance for a deterministic contract test. */
export interface GameContractDefinition<TGame extends GameContractInstance> {
  readonly gameId: string;
  readonly create: (seed: number) => TGame;
  readonly inputs: readonly CompactInputFrame[];
  readonly seed?: number;
}

/**
 * Registers reusable lifecycle and deterministic-replay tests for one BaseGame implementation.
 *
 * The suite intentionally avoids asserting game-specific movement, collision, rendering or
 * terminal-state behavior. Those behaviors need explicit tests owned by each game.
 */
export function defineGameContractSuite<TGame extends GameContractInstance>(
  definition: GameContractDefinition<TGame>
): void {
  const initialSeed = definition.seed ?? 0x51A7E;
  const createdGames: TGame[] = [];

  const createInitializedGame = async (seed: number): Promise<TGame> => {
    const game = definition.create(seed);
    createdGames.push(game);
    await game.init();
    return game;
  };

  describe(`${definition.gameId} BaseGame contract`, () => {
    afterEach(() => {
      for (const game of createdGames.splice(0)) {
        if (game.getLifecycleState() !== GameLifecycleState.DESTROYED) {
          game.destroy();
        }
      }
    });

    it("initializes in the running state and exposes its initial seed", async () => {
      const game = await createInitializedGame(initialSeed);

      expect(game.getSeed()).toBe(initialSeed);
      expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
      expect(game.isPausedState()).toBe(false);
    });

    it("pauses and resumes idempotently", async () => {
      const game = await createInitializedGame(initialSeed);

      game.pause();
      game.pause();

      expect(game.isPausedState()).toBe(true);
      expect(game.getLifecycleState()).toBe(GameLifecycleState.PAUSED);

      game.resume();
      game.resume();

      expect(game.isPausedState()).toBe(false);
      expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    });

    it("restarts with the requested seed and returns to running", async () => {
      const game = await createInitializedGame(initialSeed);
      const restartSeed = initialSeed + 1;

      await game.restart(restartSeed);
      const freshInstance = await createInitializedGame(restartSeed);

      expect(game.getSeed()).toBe(restartSeed);
      expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
      expect(game.isPausedState()).toBe(false);
      expect(game.hash()).toBe(freshInstance.hash());
    });

    it("destroys the game and marks its lifecycle terminal", async () => {
      const game = await createInitializedGame(initialSeed);

      game.destroy();

      expect(game.getLifecycleState()).toBe(GameLifecycleState.DESTROYED);
    });

    it("replays the same input sequence with matching hashes and ticks", async () => {
      expect(definition.inputs.length).toBeGreaterThan(0);

      const first = await createInitializedGame(initialSeed);
      const second = await createInitializedGame(initialSeed);

      expect(first.hash()).toBe(second.hash());
      expect(first.tick).toBe(second.tick);

      for (const input of definition.inputs) {
        first.step(input);
        second.step(input);

        expect(first.tick).toBe(second.tick);
        expect(first.hash()).toBe(second.hash());
      }
    });
  });
}
