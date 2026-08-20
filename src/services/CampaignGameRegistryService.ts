import { BaseGame, CampaignGameResolver } from "@tiny-aster/core";
import { EchoRunnerGame } from "../games/echorunner/EchoRunnerGame";
import { SpaceInvadersGame } from "../games/space-invaders/SpaceInvadersGame";
import { AsteroidsGame } from "../games/asteroids/AsteroidsGame";
import { GeometryWarsGame } from "../games/geometrywars/GeometryWarsGame";
import { PongGame } from "../games/pong/PongGame";
import { FlappyBirdGame } from "../games/flappybird/FlappyBirdGame";
import { PlatformerGame } from "../games/platformer/PlatformerGame";

let isRegistered = false;

/**
 * Registers standard minigame factories into `CampaignGameResolver`.
 */
export function registerDefaultCampaignGames(): void {
  if (isRegistered) return;
  isRegistered = true;

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
}
