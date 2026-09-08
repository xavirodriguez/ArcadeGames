import { Simulation } from "./Simulation";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";

/**
 * Interface representing games extending BaseGame or providing basic simulation methods.
 * @public
 */
export interface IBaseGameSimulation {
  tick: number;
  getGameState(): unknown;
  step(input: unknown): void;
  snapshot(): WorldSnapshot;
  restore(snapshot: WorldSnapshot): void;
  hash(): string;
  isGameOver(): boolean;
  start(): void;
}

/**
 * Abstract generic adapter bridging any BaseGame instance to the Simulation interface.
 *
 * @remarks
 * Encapsulates standard delegation methods (`tick`, `state`, `step`, `snapshot`, `restore`, `hash`, `isGameOver`)
 * to eliminate boilerplate code duplication across minigame adapters.
 *
 * @typeParam TGame - The underlying game instance type implementing `IBaseGameSimulation`.
 *
 * @public
 */
export abstract class BaseGameSimulationAdapter<TGame extends IBaseGameSimulation = IBaseGameSimulation> implements Simulation {
  protected game: TGame;

  constructor(game: TGame) {
    this.game = game;
  }

  public get gameInstance(): TGame {
    return this.game;
  }

  public get tick(): number {
    return this.game.tick;
  }

  public get state(): unknown {
    return this.game.getGameState();
  }

  public step(input: unknown): void {
    this.game.step(input);
  }

  public snapshot(): WorldSnapshot {
    return this.game.snapshot();
  }

  public restore(snapshot: WorldSnapshot): void {
    this.game.restore(snapshot);
  }

  public hash(): string {
    return this.game.hash();
  }

  public isGameOver(): boolean {
    return this.game.isGameOver();
  }
}
