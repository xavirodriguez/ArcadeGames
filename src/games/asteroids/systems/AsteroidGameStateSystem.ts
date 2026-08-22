import { World, BaseGameStateSystem } from "@tiny-aster/core";
import { GameStateComponent } from "../types/AsteroidTypes";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { IAsteroidsGame } from "../types/GameInterfaces";
import { spawnAsteroidWave } from "../EntityFactory";
import { getStoryBeatForLevel } from "../story/StoryBeats";

/** @public */
export class AsteroidGameStateSystem extends BaseGameStateSystem<
  GameStateComponent,
  AsteroidsComponentRegistry,
  AsteroidsEventRegistry
> {
  private game: IAsteroidsGame;

  constructor(game: IAsteroidsGame) {
    super("GameState");
    this.game = game;
  }

  protected getGameState(world: World<AsteroidsComponentRegistry>): GameStateComponent | undefined {
    return world.getSingleton("GameState");
  }

  protected updateGameState(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    gameState: GameStateComponent,
    deltaTime: number
  ): void {
      if (gameState.isGameOver) return;

      const isStory = gameState.mode === "story";

      // 1. Handle ready countdown
      if (gameState.readyRemaining !== undefined && gameState.readyRemaining > 0) {
          world.mutateSingleton("GameState", (gs) => {
              gs.readyRemaining = Math.max(0, (gs.readyRemaining ?? 0) - deltaTime);
              const beat = getStoryBeatForLevel(gs.level);
              gs.storyBeatText = beat.readyText;
          });
          return; // Pause other gameplay logic
      }

      // 2. Handle intermission countdown
      if (gameState.intermissionRemaining !== undefined && gameState.intermissionRemaining > 0) {
          let finishedIntermission = false;
          let nextLevel = gameState.level;

          world.mutateSingleton("GameState", (gs) => {
              const prevVal = gs.intermissionRemaining ?? 0;
              const nextVal = Math.max(0, prevVal - deltaTime);
              gs.intermissionRemaining = nextVal;

              // Populate transition texts
              const nextBeat = getStoryBeatForLevel(gs.level);
              gs.chapterTitle = nextBeat.intermissionTitle;
              gs.storyBeatText = nextBeat.intermissionSub;

              if (prevVal > 0 && nextVal <= 0) {
                  gs.level++;
                  nextLevel = gs.level;
                  finishedIntermission = true;
                  gs.readyRemaining = 3.0; // Trigger a ready countdown at the start of the next level too!
                  const newBeat = getStoryBeatForLevel(gs.level);
                  gs.storyBeatText = newBeat.readyText;
              }
          });

          if (finishedIntermission) {
              spawnAsteroidWave(world, nextLevel);
          }
          return; // Pause other gameplay logic
      }

      // Check if all asteroids are destroyed
      const asteroids = world.query("Asteroid");
      if (asteroids.length === 0) {
          if (isStory) {
              // Trigger intermission and chapter transitions
              world.mutateSingleton("GameState", (gs) => {
                  gs.intermissionRemaining = 3.0;
                  const nextBeat = getStoryBeatForLevel(gs.level);
                  gs.chapterTitle = nextBeat.intermissionTitle;
                  gs.storyBeatText = nextBeat.intermissionSub;
              });
          } else {
              // Deathmatch mode: immediately increment level and spawn next wave
              let nextLevel = gameState.level;
              world.mutateSingleton("GameState", (gs) => {
                  gs.level++;
                  nextLevel = gs.level;
              });

              spawnAsteroidWave(world, nextLevel);
          }
      }
  }

  protected evaluateGameOverCondition(gameState: GameStateComponent): boolean {
    return gameState.lives <= 0;
  }

  public update(world: World<AsteroidsComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
      super.update(world, deltaTime);
  }

  public isGameOver(): boolean {
      const state = this.game.getGameState();
      return state.isGameOver;
  }

  public resetGameOverState(world: World<AsteroidsComponentRegistry>): void {
      world.mutateSingleton("GameState", (state) => {
          state.isGameOver = false;
          state.lives = 3;
          state.score = 0;
          state.level = 1;
      });
  }
}
