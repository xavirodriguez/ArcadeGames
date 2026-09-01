import { GameDefinitionRegistry } from "@tiny-aster/core";
import { EchoRunnerDefinition } from "../games/echorunner/EchoRunnerGame";
import { SpaceInvadersDefinition } from "../games/space-invaders/SpaceInvadersGame";
import { AsteroidsDefinition } from "../games/asteroids/AsteroidsDefinition";
import { GeometryWarsDefinition } from "../games/geometrywars/GeometryWarsGame";
import { PongDefinition } from "../games/pong/PongGame";
import { FlappyBirdDefinition } from "../games/flappybird/FlappyBirdGame";
import { PlatformerDefinition } from "../games/platformer/PlatformerGame";

let isRegistered = false;

/**
 * Registers standard minigame factories into `GameDefinitionRegistry`.
 */
export function registerDefaultCampaignGames(): void {
  if (isRegistered) return;
  isRegistered = true;

  // GameDefinitionRegistry
  GameDefinitionRegistry.register("asteroids", AsteroidsDefinition);
  GameDefinitionRegistry.register("echorunner", EchoRunnerDefinition);
  GameDefinitionRegistry.register("space-invaders", SpaceInvadersDefinition);
  GameDefinitionRegistry.register("flappybird", FlappyBirdDefinition);
  GameDefinitionRegistry.register("pong", PongDefinition);
  GameDefinitionRegistry.register("geometrywars", GeometryWarsDefinition);
  GameDefinitionRegistry.register("platformer", PlatformerDefinition);
}
