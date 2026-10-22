import { NullBaseGame, World } from "@tiny-aster/core";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { INITIAL_GAME_STATE, type GameStateComponent, type InputState } from "./types/AsteroidTypes";
import type { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";
import { registerMutatorHook } from "../../utils/MutatorRegistry";

/** @public */
export class NullAsteroidsGame
  extends NullBaseGame<GameStateComponent, InputState, AsteroidsComponentRegistry, AsteroidsEventRegistry>
  implements IAsteroidsGame
{
  public override getGameState(): GameStateComponent {
    return INITIAL_GAME_STATE;
  }
}

registerMutatorHook("story_fragment", (world: World<AsteroidsComponentRegistry>) => {
  const eventBus = world.getEventBus();
  if (eventBus) {
    eventBus.emit("story:beat_reached", {
      beatId: "asteroids_story_beat",
      dialogueReference: "story.chapter_1_fragment_1"
    });
  }
});
