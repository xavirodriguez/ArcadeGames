import { MapSchema, Schema, type } from "@colyseus/schema";

// Player schema for Space Invaders multiplayer
export class SpaceInvadersPlayer extends Schema {
  @type("string") sessionId: string;
  @type("string") name: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("boolean") alive: boolean;
  @type("number") score: number;
}

// Invader schema for Space Invaders multiplayer
export class SpaceInvaderEntity extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("boolean") alive: boolean;
}

// Bullet schema for Space Invaders multiplayer
export class SpaceInvadersBulletEntity extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("string") ownerId: string;
}

// Complete state schema for Space Invaders multiplayer
export class SpaceInvadersState extends Schema {
  @type("number") seed: number;
  @type("number") gameWidth: number;
  @type("number") gameHeight: number;
  @type("boolean") gameStarted: boolean;
  @type("boolean") gameOver: boolean;
  @type("number") serverTick: number;
  @type("number") lastProcessedTick: number;
  @type("number") score: number;
  @type("number") protocolVersion: number = 1;

  @type({ map: SpaceInvadersPlayer }) players = new MapSchema<SpaceInvadersPlayer>();
  @type({ map: SpaceInvaderEntity }) invaders = new MapSchema<SpaceInvaderEntity>();
  @type({ map: SpaceInvadersBulletEntity }) bullets = new MapSchema<SpaceInvadersBulletEntity>();
}
