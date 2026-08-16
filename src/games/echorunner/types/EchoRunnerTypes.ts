import { Component, CoreEvents } from "@tiny-aster/core";

export interface EchoRunnerEventRegistry extends CoreEvents, Record<string, unknown> {}

export interface EchoRunnerInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  pulse: boolean; // Attack verb
  [key: string]: unknown;
}

export interface EchoRunnerGameState extends Component {
  type: "EchoRunnerGameState";
  score: number;
  isGameOver: boolean;
  attempts: number;
  deaths: number;
  fragments: number;
  cores: number;
  activeCheckpoint: string | null;
  elapsedTime: number;
}

export const ECHO_CONFIG = {
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  TILE_SIZE: 40,
  PLAYER_SPEED: 220,
  PLAYER_ACCEL: 900,
  PLAYER_DECEL: 1300,
  PLAYER_AIR_ACCEL: 450,
  PLAYER_AIR_DECEL: 700,
  PLAYER_JUMP_VEL: 370,
  PLAYER_MIN_JUMP_VEL: 160,
  RISE_GRAVITY: 850,
  FALL_GRAVITY: 1300,
  APEX_THRESHOLD: 50,
  APEX_GRAVITY_MULTIPLIER: 0.2,
  COYOTE_TIME_MAX: 0.15,
  JUMP_BUFFER_MAX: 0.1,
};
