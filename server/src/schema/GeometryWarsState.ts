import { MapSchema, Schema, type } from "@colyseus/schema";

export class GeometryWarsPlayer extends Schema {
  @type("string") sessionId: string;
  @type("string") name: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") angle: number;
  @type("number") velocityX: number;
  @type("number") velocityY: number;
  @type("number") lives: number;
  @type("boolean") alive: boolean;
  @type("number") score: number;
}

export class GeometryWarsEnemy extends Schema {
  @type("string") id: string;
  @type("string") type: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") angle: number;
}

export class GeometryWarsBullet extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") angle: number;
}

export class GeometryWarsState extends Schema {
  @type("number") seed: number;
  @type("number") gameWidth: number;
  @type("number") gameHeight: number;
  @type("boolean") gameStarted: boolean;
  @type("boolean") gameOver: boolean;
  @type("number") serverTick: number;
  @type("number") score: number;
  @type("number") wave: number;
  @type("number") bombs: number;
  @type("number") protocolVersion: number = 1;

  @type({ map: GeometryWarsPlayer }) players = new MapSchema<GeometryWarsPlayer>();
  @type({ map: GeometryWarsEnemy }) enemies = new MapSchema<GeometryWarsEnemy>();
  @type({ map: GeometryWarsBullet }) bullets = new MapSchema<GeometryWarsBullet>();
}
