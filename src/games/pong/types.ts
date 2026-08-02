import { Component, CoreComponentRegistry } from "@tiny-aster/core";
import { ComboComponent } from "../shared/arcade/components/ComboComponent";

export interface BallComponent extends Component {
  spinFactor: number;
  spinDecay: number;
}

export interface PaddleComponent extends Component {
  side: "left" | "right";
  previousY: number;
  lastVelocityY: number;
}

export interface PongState extends Component {
  scoreP1: number;
  scoreP2: number;
  isGameOver: boolean;
  comboMultiplier: number;
  gameOverLogged: boolean;
  shieldPulseRemaining?: number;
  scoreFreezeRemaining?: number;
  lastScorer?: "p1" | "p2" | null;
}

export interface PongInput {
  p1Up?: boolean;
  p1Down?: boolean;
  p2Up?: boolean;
  p2Down?: boolean;
}

export interface PongInputFrame {
  tick: number;
  input: PongInput;
}

export interface PongComponentRegistry extends CoreComponentRegistry {
  Ball: BallComponent;
  Paddle: PaddleComponent;
  PongState: PongState;
  Combo: ComboComponent;
}
