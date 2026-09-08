import { AsteroidsDefinition } from "../../asteroids/AsteroidsDefinition";
import { SpaceInvadersDefinition } from "../../space-invaders/SpaceInvadersAdapter";
import { GeometryWarsDefinition } from "../../geometrywars/GeometryWarsGame";
import { FlappyBirdDefinition } from "../../flappybird/FlappyBirdGame";
import { EchoRunnerDefinition } from "../../echorunner/EchoRunnerGame";
import { PongDefinition } from "../../pong/PongGameAdapter";
import * as fs from "fs";
import * as path from "path";

describe("Phase 7 - GameDefinition Parity Verification", () => {
  const games = [
    { name: "asteroids", def: AsteroidsDefinition },
    { name: "space-invaders", def: SpaceInvadersDefinition },
    { name: "geometrywars", def: GeometryWarsDefinition },
    { name: "flappybird", def: FlappyBirdDefinition },
    { name: "echorunner", def: EchoRunnerDefinition },
    { name: "pong", def: PongDefinition },
  ];

  games.forEach(({ name, def }) => {
    test(`verifies frame-by-frame hash parity for ${name} against baseline fixtures`, () => {
      const replayPath = path.join(process.cwd(), `fixtures/deterministic/${name}/baseline.replay`);
      const hashesPath = path.join(process.cwd(), `fixtures/deterministic/${name}/baseline.hashes.json`);

      if (!fs.existsSync(replayPath) || !fs.existsSync(hashesPath)) {
        return;
      }

      const replay = JSON.parse(fs.readFileSync(replayPath, "utf-8"));
      const baselineHashes: Array<{ tick: number; hash: string }> = JSON.parse(fs.readFileSync(hashesPath, "utf-8"));

      const sim = def.createSimulation(replay.seed);

      for (let i = 0; i < replay.inputs.length; i++) {
        const input = replay.inputs[i];
        sim.step(input);

        expect(sim.hash()).toBe(baselineHashes[i].hash);
      }
    });
  });
});
