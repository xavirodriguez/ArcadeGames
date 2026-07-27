import { World, TransformComponent } from "@tiny-aster/core";
import { type PongInput } from "../types";

export class AIPongController {
  private difficulty: "easy" | "medium" | "hard";
  private reactionTimer = 0;
  private lastTargetY = 0;

  constructor(difficulty: "easy" | "medium" | "hard" = "medium") {
    this.difficulty = difficulty;
  }

  public update(world: World<any>, paddleEntity: number): PongInput {
    const input: PongInput = { p2Up: false, p2Down: false };

    // Find the ball
    const balls = world.query("Ball");
    if (balls.length === 0) return input;
    const ballEntity = balls[0];

    const ballTransform = world.getComponent(ballEntity, "Transform") as TransformComponent;
    const paddleTransform = world.getComponent(paddleEntity, "Transform") as TransformComponent;

    if (!ballTransform || !paddleTransform) return input;

    // AI Difficulty settings: reaction delay & accuracy error margin
    let reactionDelay = 10; // Frames
    let errorMargin = 30; // Pixels

    if (this.difficulty === "easy") {
      reactionDelay = 20;
      errorMargin = 50;
    } else if (this.difficulty === "hard") {
      reactionDelay = 2;
      errorMargin = 10;
    }

    this.reactionTimer++;
    if (this.reactionTimer >= reactionDelay) {
      this.reactionTimer = 0;
      this.lastTargetY = ballTransform.y;
    }

    // Move paddle towards target Y position
    const diff = this.lastTargetY - paddleTransform.y;

    if (Math.abs(diff) > errorMargin) {
      if (diff < 0) {
        input.p2Up = true;
      } else {
        input.p2Down = true;
      }
    }

    return input;
  }
}
