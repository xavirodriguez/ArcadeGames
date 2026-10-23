import { PlatformerGame } from "../PlatformerGame";
import { EchoRunnerGame } from "../../echorunner/EchoRunnerGame";
import { PlatformerConfig as PlatformerConfigType } from "../types/PlatformerConfigSchema";
import { EchoRunnerConfig as EchoRunnerConfigType } from "../../echorunner/types/EchoRunnerConfigSchema";

describe("Front 1 Characterization: Config Loading with Mutators", () => {
  it("PlatformerGame resolves mutators and sets GameConfig resource after init", async () => {
    const game = new PlatformerGame({
      gameOptions: {
        rawConfig: {
          PLAYER_SPEED: 450
        }
      }
    });
    await game.init();
    const config = game.getWorld().getResource<PlatformerConfigType>("GameConfig");
    expect(config).toBeDefined();
    expect(config?.PLAYER_SPEED).toBe(450);
    game.destroy();
  });

  it("EchoRunnerGame resolves mutators and sets GameConfig resource after init", async () => {
    const game = new EchoRunnerGame({
      gameOptions: {
        rawConfig: {
          PLAYER_SPEED: 500
        }
      }
    });
    await game.init();
    const config = game.getWorld().getResource<EchoRunnerConfigType>("GameConfig");
    expect(config).toBeDefined();
    expect(config?.PLAYER_SPEED).toBe(500);
    game.destroy();
  });
});
