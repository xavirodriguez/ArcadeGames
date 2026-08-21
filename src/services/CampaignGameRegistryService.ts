import { BaseGame, CampaignGameResolver, GameDefinitionRegistry } from "@tiny-aster/core";
import { EchoRunnerGame, EchoRunnerDefinition } from "../games/echorunner/EchoRunnerGame";
import { SpaceInvadersGame, SpaceInvadersDefinition } from "../games/space-invaders/SpaceInvadersGame";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";
import { AsteroidsDefinition } from "../games/asteroids/AsteroidsDefinition";
import { GeometryWarsGame, GeometryWarsDefinition } from "../games/geometrywars/GeometryWarsGame";
import { PongGame, PongDefinition } from "../games/pong/PongGame";
import { FlappyBirdGame, FlappyBirdDefinition } from "../games/flappybird/FlappyBirdGame";
import { PlatformerGame, PlatformerDefinition } from "../games/platformer/PlatformerGame";

let isRegistered = false;

/**
 * Registers standard minigame factories into `CampaignGameResolver` and `GameDefinitionRegistry`.
 */
export function registerDefaultCampaignGames(): void {
  if (isRegistered) return;
  isRegistered = true;

  // Legacy CampaignGameResolver
  CampaignGameResolver.registerGame("echorunner", (opts) => new EchoRunnerGame(opts));
  CampaignGameResolver.registerGame("echo-runner", (opts) => new EchoRunnerGame(opts));
  CampaignGameResolver.registerGame("space-invaders", (opts) => new SpaceInvadersGame(opts));
  CampaignGameResolver.registerGame("spaceinvaders", (opts) => new SpaceInvadersGame(opts));
  CampaignGameResolver.registerGame("asteroids", (opts) => new AsteroidsGame(opts));
  CampaignGameResolver.registerGame("geometry-wars", (opts) => new GeometryWarsGame(opts));
  CampaignGameResolver.registerGame("geometrywars", (opts) => new GeometryWarsGame(opts));
  CampaignGameResolver.registerGame("pong", (opts) => new PongGame(opts));
  CampaignGameResolver.registerGame("flappybird", (opts) => new FlappyBirdGame(opts));
  CampaignGameResolver.registerGame("flappy-bird", (opts) => new FlappyBirdGame(opts));
  CampaignGameResolver.registerGame("platformer", (opts) => new PlatformerGame(opts));

  // GameDefinitionRegistry
  GameDefinitionRegistry.register("asteroids", AsteroidsDefinition);
  GameDefinitionRegistry.register("echorunner", EchoRunnerDefinition);
  GameDefinitionRegistry.register("space-invaders", SpaceInvadersDefinition);
  GameDefinitionRegistry.register("flappybird", FlappyBirdDefinition);
  GameDefinitionRegistry.register("pong", PongDefinition);
  GameDefinitionRegistry.register("geometrywars", GeometryWarsDefinition);
  GameDefinitionRegistry.register("platformer", PlatformerDefinition);
}
