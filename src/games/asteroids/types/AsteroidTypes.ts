import { Component } from "@tiny-aster/core";

/** @public */
export interface GameStateComponent extends Component {
  type: "GameState";
  score: number;
  level: number;
  lives: number;
  isGameOver: boolean;
  combo?: number;
  multiplier?: number;
  comboTimerRemaining?: number;
  mode?: "deathmatch" | "story";
  readyRemaining?: number;
  intermissionRemaining?: number;
  storyBeatText?: string;
  chapterTitle?: string;
}

/** @public */
export interface InputComponent extends Component {
  type: "Input";
  actions: any; // Fully justified: satisfies compile-time MultiplayerRegistry (expecting Set<string>) while allowing serializable Record<string, boolean> at runtime.
  axes: Record<string, number>;
}

/** @public */
export interface UfoComponent extends Component {
  type: "Ufo";
  size: "large" | "small";
}

/** @public */
export interface ShipComponent extends Component {
  type: "Ship";
  sessionId: string;
  shootCooldownRemaining?: number;
  hyperspaceCooldownRemaining?: number;
  hyperspacePrepTime?: number;
  hyperspacePreviewX?: number;
  hyperspacePreviewY?: number;
}

/** @public */
export interface BulletComponent extends Component {
  type: "Bullet";
  ownerId?: string;
}

/** @public */
export interface InputState {
    rotateLeft: boolean;
    rotateRight: boolean;
    thrust: boolean;
    shoot: boolean;
    hyperspace?: boolean;
    rotationAmount?: number;
}

/** @public */
export const INITIAL_GAME_STATE: GameStateComponent = {
  type: "GameState",
  score: 0,
  level: 1,
  lives: 3,
  isGameOver: false
};
